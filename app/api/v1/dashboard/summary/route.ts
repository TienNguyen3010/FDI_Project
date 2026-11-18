// Project OPS v1.0 — GET /api/v1/dashboard/summary (MET-01..05).
import { resolvedScope, envelope, apiError, DEFINITIONS, METRIC_DEFINITIONS } from '@/lib/metrics/contract'
import { scoped, OPEN_TICKET_STATUSES } from '@/lib/metrics/queries'

// Cache Components enabled: route tự dynamic vì authorize() đọc cookies().
export async function GET(request: Request) {
  const ctx = await resolvedScope(request)
  if (!ctx.ok) return ctx.response
  const { auth, scope, asOf } = ctx

  let dataQuality: 'complete' | 'partial' | 'insufficient_baseline' = 'complete'
  const empty = {
    active_projects: 0,
    weighted_progress: null,
    progress_coverage: 0,
    open_tickets: 0,
    sla_at_risk: null,
    sla_at_risk_count: null,
    sla_breached: null,
    metric_ids: {
      active_projects: METRIC_DEFINITIONS.active_projects,
      weighted_progress: METRIC_DEFINITIONS.weighted_progress,
      open_tickets: METRIC_DEFINITIONS.open_tickets,
      sla_at_risk: METRIC_DEFINITIONS.sla_at_risk,
      sla_breached: METRIC_DEFINITIONS.sla_breached,
    },
  }

  const projectsQ = scoped(auth.supabase.from('projects').select('id, status'), auth.supabase, scope)
  const ticketsQ = scoped(auth.supabase.from('tickets').select('id, status'), auth.supabase, scope)
  const [projects, tickets] = await Promise.all([projectsQ, ticketsQ])

  if (projects.error || tickets.error) return apiError(503, 'Không đọc được dữ liệu dashboard.')

  const activeProjects = (projects.data ?? []).filter((p) => p.status === 'active').length
  const openTickets = (tickets.data ?? []).filter((t) => OPEN_TICKET_STATUSES.includes(t.status as typeof OPEN_TICKET_STATUSES[number])).length

  // MET-02: baseline weight/acceptance chưa có cột thật -> null + insufficient_baseline (contract:19).
  dataQuality = 'insufficient_baseline'
  // MET-04/05: sla_instances chưa có dữ liệu thật -> null, KHÔNG trả 0 (contract:11,18).

  return Response.json({
    ...envelope(DEFINITIONS.summary, asOf, scope, dataQuality),
    data: {
      ...empty,
      active_projects: activeProjects,
      open_tickets: openTickets,
    },
  })
}
