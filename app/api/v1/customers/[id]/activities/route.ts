// Project OPS v1.0 — /api/v1/customers/[id]/activities
//   GET  — lịch sử hoạt động của khách hàng (bảng activities, migration 013).
//          RLS fdi_activities_select (fdi_can_read) quyết định ai đọc được.
//   POST — thêm hoạt động qua RPC log_customer_activity (migration 014).
//          RPC này CÓ kiểm fdi_can_read — KHÔNG dùng log_activity (013) vì
//          log_activity ghi không kiểm phạm vi đọc (lỗ hổng, xem comment trong 013).
//
// Không dùng service_role.

import { authorize } from '@/lib/auth/authorize'
import { apiError, utcNow } from '@/lib/metrics/contract'

/** Trạng thái hoạt động — khớp CHECK activities_status_check (migration 013). */
const ACTIVITY_STATUSES = ['planned', 'done', 'failed', 'no_answer'] as const
type ActivityStatus = (typeof ACTIVITY_STATUSES)[number]

/** entity_type của tài nguyên này — activities là bảng ĐA HÌNH (013). */
const ENTITY_TYPE = 'customer'

interface ActivityItem {
  id: string
  activity_type: string
  label: string | null
  channel: string | null
  direction: string | null
  status: string
  subject: string | null
  body: string | null
  occurred_at: string | null
  scheduled_at: string | null
  done_at: string | null
  created_at: string
}

const ACTIVITY_COLUMNS = [
  'id', 'activity_type', 'channel', 'direction', 'status',
  'subject', 'body', 'occurred_at', 'scheduled_at', 'done_at', 'created_at',
].join(',')

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * `activities` / `activity_types` là bảng MỚI (013) chưa khai báo trong Database
 * generic của lib/types.ts → supabase-js suy ra type 'never'. Ép qua unknown rồi
 * định nghĩa lại đúng chuỗi method cần dùng (giống cách CrudPage/CreateCustomerForm).
 */
type QueryResult = { data?: unknown[] | null; error?: { message?: string } | null }

/**
 * `activities` / `activity_types` là bảng MỚI (013) chưa khai báo trong Database
 * generic của lib/types.ts → supabase-js suy ra type 'never'. Ép qua unknown rồi
 * định nghĩa lại chuỗi method cần dùng. Dùng PromiseLike (thenable) — đúng cách
 * CrudPage.tsx:26-39 và CreateCustomerForm.tsx dùng cho client động.
 */
interface SelectBuilder extends PromiseLike<QueryResult> {
  eq(col: string, val: string): SelectBuilder
  order(col: string, opts: { ascending: boolean }): LimitBuilder
}

interface LimitBuilder extends PromiseLike<QueryResult> {
  limit(n: number): PromiseLike<QueryResult>
}

function queryClient(client: unknown) {
  return client as {
    from: (table: string) => { select: (cols: string) => SelectBuilder }
  }
}

function mapActivity(raw: unknown, labels: Map<string, string>): ActivityItem {
  const r = raw as Record<string, unknown>
  const type = typeof r.activity_type === 'string' ? r.activity_type : ''
  return {
    id: String(r.id ?? ''),
    activity_type: type,
    label: labels.get(type) ?? null,
    channel: typeof r.channel === 'string' ? r.channel : null,
    direction: typeof r.direction === 'string' ? r.direction : null,
    status: typeof r.status === 'string' ? r.status : 'planned',
    subject: typeof r.subject === 'string' ? r.subject : null,
    body: typeof r.body === 'string' ? r.body : null,
    occurred_at: typeof r.occurred_at === 'string' ? r.occurred_at : null,
    scheduled_at: typeof r.scheduled_at === 'string' ? r.scheduled_at : null,
    done_at: typeof r.done_at === 'string' ? r.done_at : null,
    created_at: typeof r.created_at === 'string' ? r.created_at : '',
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorize('customer.read')
  if (!auth.ok) return apiError(auth.status, auth.message)

  const { id } = await params
  if (!id) return apiError(400, 'Thiếu mã khách hàng.')

  // Nhãn loại hoạt động từ lookup (không hardcode trong UI). Lỗi lookup không
  // chặn kết quả chính — chỉ mất nhãn, vẫn trả dữ liệu thật.
  const db = queryClient(auth.supabase)
  const [typesRes, rowsRes] = await Promise.all([
    db.from('activity_types').select('code, label'),
    db
      .from('activities')
      .select(ACTIVITY_COLUMNS)
      .eq('entity_type', ENTITY_TYPE)
      .eq('entity_id', id)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  if (rowsRes.error) {
    return apiError(503, rowsRes.error.message ?? 'Đọc hoạt động không thành công.')
  }

  const labels = new Map<string, string>()
  for (const raw of typesRes.data ?? []) {
    const row = raw as { code?: unknown; label?: unknown }
    if (typeof row.code === 'string') labels.set(row.code, String(row.label ?? ''))
  }

  const items = (rowsRes.data ?? []).map((raw: unknown) => mapActivity(raw, labels))

  // RLS chặn (không có quyền đọc KH) → PostgREST trả rỗng; coi như "không có dữ liệu".
  return Response.json({ as_of: utcNow(), data: { items } })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Ghi hoạt động đòi hỏi quyền ĐỌC khách hàng (đúng rào fdi_can_read của RPC 014).
  const auth = await authorize('customer.read')
  if (!auth.ok) return apiError(auth.status, auth.message)

  const { id } = await params
  if (!id) return apiError(400, 'Thiếu mã khách hàng.')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError(400, 'Body không phải JSON hợp lệ.')
  }
  if (!isRecord(body)) return apiError(400, 'Body không hợp lệ.')

  const activityType =
    typeof body.activity_type === 'string' ? body.activity_type.trim() : ''
  if (!activityType) return apiError(400, 'Vui lòng chọn loại hoạt động.')

  const rawStatus =
    typeof body.status === 'string' && body.status ? body.status : 'planned'
  if (!(ACTIVITY_STATUSES as readonly string[]).includes(rawStatus)) {
    return apiError(400, 'Trạng thái hoạt động không hợp lệ.')
  }
  const status = rawStatus as ActivityStatus

  const textOrNull = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null

  const { data, error } = await (
    auth.supabase as unknown as {
      rpc: (
        fn: 'log_customer_activity',
        args: Record<string, string | null>,
      ) => Promise<{ data: string | null; error: { code?: string; message?: string } | null }>
    }
  ).rpc('log_customer_activity', {
    p_entity_id: id,
    p_activity_type: activityType,
    p_channel: textOrNull(body.channel),
    p_subject: textOrNull(body.subject),
    p_body: textOrNull(body.body),
    p_direction: textOrNull(body.direction),
    p_status: status,
    p_scheduled_at: textOrNull(body.scheduled_at),
  })

  if (error) {
    const code = error.code ?? ''
    const msg = error.message ?? ''
    // Chưa apply migration 014 → PostgREST báo function not found.
    if (code === '42883' || /not exist|PGRST202/i.test(msg)) {
      return apiError(
        501,
        'Hệ thống chưa có hàm log_customer_activity — cần chạy migration 014 trong Supabase SQL Editor.',
      )
    }
    if (code === '42501' || /unauthorized|khong co quyen/i.test(msg)) {
      return apiError(403, 'Bạn không có quyền ghi hoạt động cho khách hàng này.')
    }
    if (code === '22023') {
      return apiError(400, msg || 'Dữ liệu hoạt động không hợp lệ.')
    }
    return apiError(500, msg || 'Thêm hoạt động không thành công.')
  }

  return Response.json({ data: { id: data } }, { status: 201 })
}
