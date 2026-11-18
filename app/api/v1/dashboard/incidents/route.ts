// Project OPS v1.0 — GET /api/v1/dashboard/incidents (MET-07).
import { resolvedScope, envelope, apiError, DEFINITIONS, METRIC_DEFINITIONS } from '@/lib/metrics/contract'
import { scoped, OPEN_TICKET_STATUSES } from '@/lib/metrics/queries'

// Cache Components enabled: route tự dynamic vì authorize() đọc cookies().
export async function GET(request: Request) {
  const ctx = await resolvedScope(request)
  if (!ctx.ok) return ctx.response
  const { auth, scope, asOf } = ctx
  const { data, error } = await scoped(
    auth.supabase.from('tickets')
      .select('id, code, priority, status, created_at, site_id, customer_id')
      .eq('type', 'incident')
      .order('created_at', { ascending: false })
      .limit(20),
    auth.supabase, scope,
  )
  if (error) return apiError(503, 'Không đọc được danh sách sự cố.')
  const items = (data ?? []).filter((t) => OPEN_TICKET_STATUSES.includes(t.status as typeof OPEN_TICKET_STATUSES[number]))
  return Response.json({
    ...envelope(DEFINITIONS.incidents, asOf, scope, 'complete'),
    metric_id: METRIC_DEFINITIONS.incidents,
    data: { items, total: items.length },
  })
}
