// Project OPS v1.0 — GET /api/v1/dashboard/ticket-status (MET-06).
import { resolvedScope, envelope, apiError, DEFINITIONS, METRIC_DEFINITIONS } from '@/lib/metrics/contract'
import { scoped, OPEN_TICKET_STATUSES } from '@/lib/metrics/queries'

// Cache Components enabled: route tự dynamic vì authorize() đọc cookies().
export async function GET(request: Request) {
  const ctx = await resolvedScope(request)
  if (!ctx.ok) return ctx.response
  const { auth, scope, asOf } = ctx
  const { data, error } = await scoped(
    auth.supabase.from('tickets').select('status'), auth.supabase, scope,
  )
  if (error) return apiError(503, 'Không đọc được ticket status.')
  const counts: Record<string, number> = { in_progress: 0, waiting: 0, new: 0, other: 0 }
  for (const row of data ?? []) {
    const s = row.status
    if (!OPEN_TICKET_STATUSES.includes(s as typeof OPEN_TICKET_STATUSES[number])) continue
    if (s === 'in_progress' || s === 'new') counts[s] += 1
    else if (s === 'triaged' || s === 'assigned') counts.waiting += 1
    else counts.other += 1
  }
  const total = counts.in_progress + counts.waiting + counts.new + counts.other
  return Response.json({
    ...envelope(DEFINITIONS['ticket-status'], asOf, scope, 'complete'),
    definition_id: DEFINITIONS['ticket-status'],
    metric_id: METRIC_DEFINITIONS.ticket_status,
    data: {
      buckets: { in_progress: counts.in_progress, waiting: counts.waiting, new: counts.new, ...(counts.other ? { other: counts.other } : {}) },
      total_open: total,
      bucket_total: total,
      reconciles: true,
    },
  })
}
