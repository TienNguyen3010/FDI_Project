// Project OPS v1.0 — Dashboard v1.0 response contract helpers.
//
// Mọi response dashboard đều mang 4 trường bắt buộc:
//   as_of            ISO 8601 UTC, lấy tại thời điểm xử lý (không fake)
//   effective_scope  scope đã intersect với grant thực tế của user
//   definition_id    định danh định nghĩa response/MET tương ứng
//   data_quality     complete | partial | stale | insufficient_baseline
//
// Nguyên tắc cứng (DASHBOARD_METRIC_CONTRACT.md):
// - Không persist presentation-only KPI; metric tính từ source entity.
// - Thiếu baseline/SLA cột thật => null + insufficient_baseline, KHÔNG trả 0/ước lượng.

import { authorize } from '@/lib/auth/authorize'
import { canAccessScope, type ScopeGrant } from '@/lib/rbac/policy'

export type DataQuality = 'complete' | 'partial' | 'stale' | 'insufficient_baseline'

export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh'

/** Định danh definition cho từng response dashboard (contract v1.0). */
export const DEFINITIONS = {
  summary: 'DASH-SUMMARY-v1.0',
  'ticket-status': 'DASH-TICKET-STATUS-v1.0',
  incidents: 'DASH-INCIDENTS-v1.0',
  'ticket-trend': 'DASH-TICKET-TREND-v1.0',
  health: 'DASH-HEALTH-v1.0',
} as const

/** Định danh metric theo DASHBOARD_METRIC_CONTRACT.md. */
export const METRIC_DEFINITIONS = {
  active_projects: 'MET-01',
  weighted_progress: 'MET-02',
  open_tickets: 'MET-03',
  sla_at_risk: 'MET-04',
  sla_breached: 'MET-05',
  ticket_status: 'MET-06',
  incidents: 'MET-07',
  ticket_trend: 'MET-08',
} as const

export interface EffectiveScope {
  /** customer_id được yêu cầu qua query, nếu có. */
  requested_customer_id: string | null
  /** Danh sách customer được phép; null = global (super_admin, không lọc). */
  customer_ids: string[] | null
  /** Role hiệu lực đã được authorize() xác thực. */
  role: string
}

export type ScopeResult =
  | { ok: true; scope: EffectiveScope }
  | { ok: false; status: number; message: string }

/** resolvedScope dùng chung: authorize('dashboard.read') + resolveScope. */
export async function resolvedScope(request: Request) {
  const auth = await authorize('dashboard.read')
  if (!auth.ok) return { ok: false as const, response: apiError(auth.status, auth.message) }

  const url = new URL(request.url)
  const requested = url.searchParams.get('customer_id')
  const result = resolveScope(auth, requested && requested.trim() ? requested.trim() : null)
  if (!result.ok) return { ok: false as const, response: apiError(result.status, result.message) }
  return { ok: true as const, scope: result.scope, auth, asOf: utcNow() }
}

/** Thời điểm UTC hiện tại — một lần cho mỗi response. */
export function utcNow(): string {
  return new Date().toISOString()
}

/**
 * Resolve scope: customer_id query param phải nằm trong grant, ngược lại 403.
 * Role grant KHÔNG override resource scope (rbac_policy.json:163).
 */
export function resolveScope(
  auth: { role: string; grants: readonly ScopeGrant[] },
  requestedCustomerId: string | null,
): ScopeResult {
  const isGlobal = auth.grants.some((g) => g.kind === 'global')

  if (requestedCustomerId) {
    const allowed = canAccessScope(
      auth.role,
      'dashboard.read',
      { customer_id: requestedCustomerId },
      auth.grants,
    )
    if (!allowed) {
      return { ok: false, status: 403, message: 'Không có grant dashboard.read cho customer_id này.' }
    }
    return {
      ok: true,
      scope: {
        requested_customer_id: requestedCustomerId,
        customer_ids: [requestedCustomerId],
        role: auth.role,
      },
    }
  }

  if (isGlobal) {
    return {
      ok: true,
      scope: { requested_customer_id: null, customer_ids: null, role: auth.role },
    }
  }

  const ids = auth.grants
    .filter((g) => g.kind === 'customer' && typeof g.id === 'string' && g.id.length > 0)
    .map((g) => g.id as string)

  // Deny by default: không có grant thì không trả bất kỳ dữ liệu nào.
  if (ids.length === 0) {
    return { ok: false, status: 403, message: 'Không có customer grant để truy cập dashboard.' }
  }

  return {
    ok: true,
    scope: { requested_customer_id: null, customer_ids: ids, role: auth.role },
  }
}

function scopeLabel(scope: EffectiveScope): string {
  if (scope.customer_ids === null) return 'global'
  if (scope.customer_ids.length === 1) return `customer:${scope.customer_ids[0]}`
  return `customers:[${scope.customer_ids.join(',')}]`
}

/**
 * Envelope chung cho mọi endpoint. `context` là alias tương thích với
 * dashboard_openapi_executable.json / proposed v1.4; 4 trường顶部 là chuẩn v1.0.
 */
export function envelope(
  definitionId: string,
  asOf: string,
  scope: EffectiveScope,
  dataQuality: DataQuality,
) {
  return {
    as_of: asOf,
    effective_scope: scope,
    definition_id: definitionId,
    data_quality: dataQuality,
    context: {
      as_of: asOf,
      timezone: DEFAULT_TIMEZONE,
      scope: scopeLabel(scope),
      authorized_customers: scope.customer_ids ?? [],
      data_quality: dataQuality,
    },
  }
}

/** Lỗi API nhất quán (code/message), không rò stack. */
export function apiError(status: number, message: string): Response {
  const code =
    status === 401 ? 'UNAUTHENTICATED'
      : status === 403 ? 'FORBIDDEN'
        : status === 400 ? 'BAD_REQUEST'
          : status === 503 ? 'PROJECTION_UNAVAILABLE'
            : 'INTERNAL_ERROR'
  return Response.json({ error: { code, message } }, { status })
}

/** Đổi timestamp UTC sang ngày local (YYYY-MM-DD) theo timezone. */
export function toLocalDate(iso: string, timeZone: string = DEFAULT_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso))
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${pick('year')}-${pick('month')}-${pick('day')}`
}

/** N ngày local gần nhất, kết thúc bằng hôm nay (theo timeZone). */
export function recentLocalDates(
  days: number,
  now: Date = new Date(),
  timeZone: string = DEFAULT_TIMEZONE,
): string[] {
  const result: string[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    result.push(toLocalDate(new Date(now.getTime() - i * 86_400_000).toISOString(), timeZone))
  }
  return result
}
