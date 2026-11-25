// Project OPS v1.0 — GET /api/v1/customers — Customers List (list + summary + scope).
// Trả envelope: { as_of, effective_scope, data_quality, data: { items, pagination, summary } }.
//
// Cache Components enabled: route tự dynamic vì authorize() đọc cookies().

import { authorize } from '@/lib/auth/authorize'
import { apiError, utcNow, type EffectiveScope } from '@/lib/metrics/contract'
import { scoped, OPEN_TICKET_STATUSES } from '@/lib/metrics/queries'

/**
 * "Có dự án" trên Customers List = dự án đang chạy/triển khai.
 * Khác với dashboard MET-01 (ACTIVE_PROJECT_STATUSES = ['active']), màn này
 * đếm thêm in_progress/deployed theo yêu cầuCustomers List.
 */
const CUSTOMER_PROJECT_STATUSES = new Set<string>(['active', 'in_progress', 'deployed'])

/**
 * Dùng canonical contract constant. View `tickets` (migration 007) chỉ trả
 * new|triaged|in_progress|closed|resolved nên tập này == new/triaged/in_progress.
 */
const OPEN_TICKET_STATUS_SET = new Set<string>(OPEN_TICKET_STATUSES)

// Gồm cả 3 kênh liên hệ bổ sung: PSM cần search theo số hotline kỹ thuật/khẩn cấp.
const SEARCH_FIELDS = ['name', 'phone', 'email', 'industry', 'tax_id', 'code', 'contact_technical', 'contact_commercial', 'contact_emergency'] as const

type SortField = 'name' | 'created_at' | 'industry' | 'project_count' | 'open_ticket_count' | 'lifecycle_stage'
const SORT_WHITELIST = new Set<string>([
  'name', 'created_at', 'industry', 'project_count', 'open_ticket_count', 'lifecycle_stage',
])

/** Vòng đời vận hành (PSM) — migration 015. Thứ tự hiển thị trong filter. */
const LIFECYCLE_STAGES = ['prospect', 'implementing', 'operating', 'maintenance', 'stopped'] as const
type LifecycleStage = (typeof LIFECYCLE_STAGES)[number]

interface CustomerItem {
  id: string
  /** `customers.code` — do DB sinh (migration 010, `CUS-YYYY-NNN`).
   *  NULL chỉ khi bản ghi chưa được backfill; KHÔNG suy từ tax_id. */
  code: string | null
  name: string
  phone: string | null
  email: string | null
  industry: string | null
  tax_id: string | null
  headquarters_address: string | null
  primary_contact_name: string | null
  /** 3 kênh liên hệ bổ sung (kỹ thuật / thương mại / khẩn cấp) — hiển thị right sidebar. */
  contact_technical: string | null
  contact_commercial: string | null
  contact_emergency: string | null
  project_count: number
  open_ticket_count: number
  /** PSM — vòng đời vận hành THẬT (migration 015). Bỏ `status='active'` giả. */
  lifecycle_stage: LifecycleStage
  created_at: string
}

/** Escape ký tự đặc biệt ILIKE: `%` và `_` được treat literal, `\` được escape trước. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

function escapeRegExpChar(ch: string): string {
  return /[.*+?^${}()|[\]\\]/.test(ch) ? `\\${ch}` : ch
}

/** Pattern ILIKE đã escape → RegExp (contains, không phân biệt hoa thường, unicode). */
function likeToRegExp(pattern: string): RegExp {
  let source = ''
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i]
    if (ch === '\\') {
      const next = pattern[i + 1]
      if (next !== undefined) {
        source += escapeRegExpChar(next)
        i += 1
      } else {
        source += '\\\\'
      }
      continue
    }
    if (ch === '%') {
      source += '[\\s\\S]*'
      continue
    }
    if (ch === '_') {
      source += '[\\s\\S]'
      continue
    }
    source += escapeRegExpChar(ch)
  }
  return new RegExp(source, 'iu')
}

function parsePositiveInt(raw: string | null, fallback: number, cap?: number): number {
  if (raw === null || raw.trim() === '') return fallback
  const value = Number(raw)
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) return fallback
  return cap === undefined ? value : Math.min(value, cap)
}

export async function GET(request: Request) {
  const auth = await authorize('customer.read')
  if (!auth.ok) return apiError(auth.status, auth.message)

  const asOf = utcNow()
  const url = new URL(request.url)

  // Scope: deny-by-default. super_admin (global grant) không lọc; các role khác
  // chỉ thấy customer có trong grant. Khớp logic resolveScope() trong contract.
  const isGlobal = auth.grants.some((g) => g.kind === 'global')
  const grantedIds = auth.grants
    .filter((g) => g.kind === 'customer' && typeof g.id === 'string' && g.id.length > 0)
    .map((g) => g.id as string)
  if (!isGlobal && grantedIds.length === 0) {
    return apiError(403, 'Không có customer grant để xem danh sách khách hàng.')
  }
  const scope: EffectiveScope = {
    requested_customer_id: null,
    customer_ids: isGlobal ? null : grantedIds,
    role: auth.role,
  }

  let customersQuery = auth.supabase
    .from('customers')
    .select('id, name, code, phone, email, industry, tax_id, headquarters_address, primary_contact_name, contact_technical, contact_commercial, contact_emergency, lifecycle_stage, created_at')
  // `customers` dùng PK `id` (KHÔNG có cột `customer_id`), nên không thể dùng
  // scoped() trực tiếp ở đây — scoped() lọc theo cột `customer_id`. Áp grant bằng `id`:
  if (scope.customer_ids !== null) {
    customersQuery = customersQuery.in('id', scope.customer_ids)
  }

  // scoped() dùng đúng cột customer_id trên projects/tickets (migration 001/007).
  const projectsQ = scoped(
    auth.supabase.from('projects').select('id, customer_id, status'),
    auth.supabase, scope,
  )
  const ticketsQ = scoped(
    auth.supabase.from('tickets').select('id, customer_id, status'),
    auth.supabase, scope,
  )

  const [customersRes, projectsRes, ticketsRes] = await Promise.all([
    customersQuery, projectsQ, ticketsQ,
  ])
  if (customersRes.error || projectsRes.error || ticketsRes.error) {
    return apiError(503, 'Không đọc được dữ liệu danh sách khách hàng.')
  }

  const projectCount = new Map<string, number>()
  for (const p of projectsRes.data ?? []) {
    if (!p.customer_id || !CUSTOMER_PROJECT_STATUSES.has(p.status)) continue
    projectCount.set(p.customer_id, (projectCount.get(p.customer_id) ?? 0) + 1)
  }

  const ticketCount = new Map<string, number>()
  for (const t of ticketsRes.data ?? []) {
    if (!t.customer_id || !OPEN_TICKET_STATUS_SET.has(t.status)) continue
    ticketCount.set(t.customer_id, (ticketCount.get(t.customer_id) ?? 0) + 1)
  }

  let items: CustomerItem[] = (customersRes.data ?? []).map((c) => ({
    id: c.id,
    code: c.code ?? null, // migration 010: mã do DB sinh; null chỉ khi chưa backfill.
    name: c.name,
    phone: c.phone,
    email: c.email,
    industry: c.industry,
    tax_id: c.tax_id,
    headquarters_address: c.headquarters_address,
    primary_contact_name: c.primary_contact_name,
    contact_technical: c.contact_technical ?? null,
    contact_commercial: c.contact_commercial ?? null,
    contact_emergency: c.contact_emergency ?? null,
    // PSM: vòng đời vận hành thật (migration 015). NULL cũ → 'prospect', KHÔNG bịa.
    lifecycle_stage: (LIFECYCLE_STAGES as readonly string[]).includes(c.lifecycle_stage ?? '')
      ? (c.lifecycle_stage as LifecycleStage)
      : 'prospect',
    project_count: projectCount.get(c.id) ?? 0,
    open_ticket_count: ticketCount.get(c.id) ?? 0,
    created_at: c.created_at,
  }))

  // --- Filter (client-side; dataset nhỏ) ---
  const search = (url.searchParams.get('search') ?? '').trim()
  const searchRe = search ? likeToRegExp(`%${escapeLike(search)}%`) : null
  if (searchRe) {
    items = items.filter((item) => SEARCH_FIELDS.some((field) => {
      const value = item[field]
      return typeof value === 'string' && searchRe.test(value)
    }))
  }

  const industry = (url.searchParams.get('industry') ?? '').trim().toLowerCase()
  if (industry) {
    items = items.filter((item) => (item.industry ?? '').toLowerCase() === industry)
  }

  const lifecycleStage = (url.searchParams.get('lifecycle_stage') ?? '').trim().toLowerCase()
  if (lifecycleStage) {
    // Chỉ nhận giá trị hợp lệ (ràng buộc DB cùng danh sách này).
    items = items.filter((item) => item.lifecycle_stage === lifecycleStage)
  }

  const hasProject = (url.searchParams.get('has_project') ?? '').trim().toLowerCase()
  if (hasProject === 'true') {
    items = items.filter((item) => item.project_count > 0)
  } else if (hasProject === 'false') {
    items = items.filter((item) => item.project_count === 0)
  }

  // --- Sort ---
  const sortRaw = (url.searchParams.get('sort') ?? '-created_at').trim()
  const descRaw = sortRaw.startsWith('-')
  const fieldRaw = descRaw ? sortRaw.slice(1) : sortRaw
  const sortField: SortField = SORT_WHITELIST.has(fieldRaw)
    ? fieldRaw as SortField
    : 'created_at'
  const descending = SORT_WHITELIST.has(fieldRaw) ? descRaw : true
  items.sort((a, b) => {
    const av = a[sortField]
    const bv = b[sortField]
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av ?? '').localeCompare(String(bv ?? ''))
    return descending ? -cmp : cmp
  })

  // --- Pagination: total = số item SAU filter, trước slice ---
  const page = parsePositiveInt(url.searchParams.get('page'), 1)
  const pageSize = parsePositiveInt(url.searchParams.get('page_size'), 20, 100)
  const total = items.length
  const start = (page - 1) * pageSize
  const pagedItems = items.slice(start, start + pageSize)

  const summary = {
    total_customers: total,
    with_projects: items.filter((item) => item.project_count > 0).length,
    open_tickets: items.reduce((sum, item) => sum + item.open_ticket_count, 0),
    // PSM: đếm theo vòng đời (dữ liệu thật, không bịa).
    by_lifecycle_stage: LIFECYCLE_STAGES.reduce<Record<string, number>>((acc, s) => {
      acc[s] = items.filter((item) => item.lifecycle_stage === s).length
      return acc
    }, {}),
    // Schema không có bảng survey/CSAT → null; client sẽ hiện 'Chưa có dữ liệu'.
    csat: null,
    // Không có baseline trước đó → không bịa delta.
    comparison: null,
  }

  return Response.json({
    as_of: asOf,
    effective_scope: scope,
    // data_quality vẫn 'complete': các field có nguồn thật đều đầy đủ;
    // csat=null là field không tồn tại trong schema, không phải dữ liệu thiếu.
    data_quality: 'complete',
    data: {
      items: pagedItems,
      pagination: { page, page_size: pageSize, total },
      summary,
    },
  })
}
