// Project OPS v1.0 — scoped Supabase query helpers for dashboard.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { EffectiveScope } from './contract'

/** Apply customer scope to a Supabase query. Pass-through for global (super_admin). */
export function scoped<T>(query: T, client: SupabaseClient, scope: EffectiveScope): T {
  if (scope.customer_ids === null) return query // global
  const ids = scope.customer_ids
  if (ids.length === 0) {
    // Fail-closed: impossible value forces empty result instead of leaking all rows.
    return (query as unknown as { eq: (c: string, v: string) => T }).eq('customer_id', '__no_access__')
  }
  if (ids.length === 1) {
    return (query as unknown as { eq: (c: string, v: string) => T }).eq('customer_id', ids[0])
  }
  return (query as unknown as { in: (c: string, v: string[]) => T }).in('customer_id', ids)
}

/** Nonterminal ticket statuses — MET-03/MET-06 (DASHBOARD_METRIC_CONTRACT.md:9,12). */
export const OPEN_TICKET_STATUSES = ['new', 'triaged', 'assigned', 'in_progress'] as const

/** Active project statuses — MET-01. Approved active set = active only (ADR pending signoff). */
export const ACTIVE_PROJECT_STATUSES = ['active'] as const

export type Db = SupabaseClient
