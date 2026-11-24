// Project OPS v1.0 — /api/v1/customers/[id]
//   GET  — đọc 1 khách hàng (form sửa); RLS customers_select quyết định ai đọc được.
//   PATCH — sửa hồ sơ; ba lớp chặn: authorize('customer.update') + RLS fdi_customers_update
//           + whitelist cột (`code` immutable — do DB sinh, migration 010).
//
// Không dùng service_role.

import { authorize } from '@/lib/auth/authorize'
import { apiError } from '@/lib/metrics/contract'

interface CustomerDetail {
  id: string
  code: string | null
  name: string
  phone: string | null
  email: string | null
  industry: string | null
  tax_id: string | null
  headquarters_address: string | null
  primary_contact_name: string | null
  primary_contact_position: string | null
  notes: string | null
  consent_contact: boolean
  consent_contact_at: string | null
  contact_technical: string | null
  contact_commercial: string | null
  contact_emergency: string | null
  created_at: string
}

/** Cột được phép cập nhật — khớp customers 001+008 (KHÔNG gồm `code`, `created_at`). */
const UPDATABLE = [
  'name', 'phone', 'email', 'industry', 'tax_id', 'headquarters_address',
  'primary_contact_name', 'primary_contact_position', 'notes',
  'consent_contact', 'consent_contact_at',
  // PSM (migration 015): vòng đời vận hành thật.
  'lifecycle_stage',
] as const

type UpdatableField = (typeof UPDATABLE)[number]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorize('customer.read')
  if (!auth.ok) return apiError(auth.status, auth.message)

  const { id } = await params
  if (!id) return apiError(400, 'Thiếu mã khách hàng.')

  const { data, error } = await auth.supabase
    .from('customers')
    .select([
      'id', 'name', 'code', 'phone', 'email', 'industry', 'tax_id',
      'headquarters_address', 'primary_contact_name', 'primary_contact_position',
      'notes', 'consent_contact', 'consent_contact_at',
      'contact_technical', 'contact_commercial', 'contact_emergency', 'created_at',
      // PSM (migration 015)
      'lifecycle_stage',
    ].join(','))
    .eq('id', id)
    .maybeSingle()

  // RLS chặn → data null (không phân biệt "không tồn tại" với "không có quyền").
  if (error) return apiError(500, error.message ?? 'Đọc khách hàng không thành công.')
  if (!data) return apiError(404, 'Không tìm thấy khách hàng trong phạm vi của bạn.')

  const row = data as unknown as CustomerDetail
  return Response.json({ data: row })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorize('customer.update')
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

  // `code` là danh tính do DB sinh → client không được ghi.
  if ('code' in body) {
    return apiError(400, 'Mã khách hàng do hệ thống sinh, không được gửi khi cập nhật.')
  }

  const payload: Partial<Record<UpdatableField, string | boolean | null>> = {}
  for (const key of Object.keys(body) as UpdatableField[]) {
    if (!(UPDATABLE as readonly string[]).includes(key)) continue // bỏ field lạ, không lỗi
    payload[key] = body[key] as string | boolean | null
  }
  if (Object.keys(payload).length === 0) return apiError(400, 'Không có trường hợp lệ để cập nhật.')

  // Validate — name bắt buộc nếu gửi; email regex khi gửi.
  if ('name' in payload) {
    const name = String(payload.name ?? '').trim()
    if (!name) return apiError(400, 'Tên khách hàng không được để trống.')
    if (name.length < 2) return apiError(400, 'Tên khách hàng phải có ít nhất 2 ký tự.')
    payload.name = name
  }
  if (payload.email != null && payload.email !== '') {
    const email = String(payload.email).trim().toLowerCase()
    if (!EMAIL_RE.test(email)) return apiError(400, 'Email không hợp lệ.')
    payload.email = email
  }
  // Chuẩn hoá optional text về null khi rỗng (khớp form tạo).
  for (const key of ['phone', 'industry', 'tax_id', 'headquarters_address',
    'primary_contact_name', 'primary_contact_position', 'notes'] as const) {
    if (key in payload && payload[key] === '') payload[key] = null
  }
  // DNC: checkbox không tick → false + xoá timestamp (khớp semantics form tạo).
  if ('consent_contact' in payload) {
    payload.consent_contact = Boolean(payload.consent_contact)
    if (!payload.consent_contact) payload.consent_contact_at = null
    else if (!payload.consent_contact_at) {
      payload.consent_contact_at = new Date().toISOString()
    }
  }

  const result = await (auth.supabase as unknown as {
    from: (table: string) => {
      update: (v: Record<string, string | boolean | null>) => {
        eq: (col: string, val: string) => {
          select: (
            cols: string,
          ) => PromiseLike<{ data: CustomerDetail | null; error: { code?: string; message?: string } | null }>
        }
      }
    }
  })
    .from('customers')
    .update(payload as Record<string, string | boolean | null>)
    .eq('id', id)
    .select('id, name, code, phone, email, industry, tax_id, headquarters_address, primary_contact_name, created_at')

  const { data, error } = result

  // 23514 = vi phạm CHECK; RLS policy = chặn. Phân loại để UI hiểu được.
  if (error) {
    const code = error.code ?? ''
    if (code === '23514') return apiError(400, 'Dữ liệu vi phạm ràng buộc của hệ thống.')
    if (code === '42501' || /row-level security/i.test(error.message ?? '')) {
      return apiError(403, 'Không có quyền sửa khách hàng này trong phạm vi của bạn.')
    }
    return apiError(500, error.message ?? 'Cập nhật không thành công.')
  }
  if (!data) return apiError(404, 'Không tìm thấy khách hàng hoặc bạn không có quyền sửa.')

  return Response.json({ data })
}
