// Project OPS v1.0 — GET /api/v1/dashboard/ticket-trend (MET-08).
import { resolvedScope, envelope, apiError, DEFINITIONS, METRIC_DEFINITIONS, recentLocalDates } from '@/lib/metrics/contract'
import { scoped } from '@/lib/metrics/queries'

// Cache Components enabled: route tự dynamic vì authorize() đọc cookies().
export async function GET(request: Request) {
  const ctx = await resolvedScope(request)
  if (!ctx.ok) return ctx.response
  const { auth, scope, asOf } = ctx
  const days = recentLocalDates(7, new Date(asOf))
  const { data, error } = await scoped(
    auth.supabase.from('tickets').select('created_at').gte('created_at', `${days[0]}T00:00:00Z`),
    auth.supabase, scope,
  )
  if (error) return apiError(503, 'Không đọc được xu hướng ticket.')
  const byDay = new Map(days.map((d) => [d, 0]))
  for (const row of data ?? []) {
    const key = String(row.created_at).slice(0, 10)
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1)
  }
  return Response.json({
    ...envelope(DEFINITIONS['ticket-trend'], asOf, scope, 'complete'),
    metric_id: METRIC_DEFINITIONS.ticket_trend,
    data: { metric: 'created', window: '7 days', series: days.map((date) => ({ date, created: byDay.get(date) ?? 0 })) },
  })
}
