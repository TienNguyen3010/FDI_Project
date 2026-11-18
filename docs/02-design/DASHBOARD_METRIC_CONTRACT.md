# DASHBOARD_METRIC_CONTRACT

All metrics are server-derived, scoped by effective authorization. Date/time uses ISO 8601 UTC at API boundary, user timezone at UI display. Report `as_of` and `scope` on every response. Snapshot vs flow measures must not be conflated.

| ID | Widget | Numerator / denominator | Date behavior | Required drilldown |
|---|---|---|---|---|
| MET-01 | Active projects | Count project statuses in approved active set | As of end of selected period | `/projects?status=active` |
| MET-02 | Weighted progress | Sum(approved baseline weight × accepted completion fraction) / sum(eligible baseline weights) | Latest accepted state as of period end; report coverage | `/projects?view=progress` |
| MET-03 | Open tickets | Count nonterminal tickets, filtered by approved ticket types | As of period end | `/tickets?state=open` |
| MET-04 | SLA at risk | Count open SLA instances not yet breached and within configured risk threshold | As of period end | `/tickets?sla=risk` |
| MET-05 | SLA breached | Count open SLA instances already past deadline (explicit policy) | As of period end | `/tickets?sla=breached` |
| MET-06 | Ticket status donut | Mutually exclusive `new`, `in_progress`, `waiting` buckets; sum = MET-03 (or show `other`) | Same snapshot and scope as MET-03 | `/tickets?status=...` |
| MET-07 | Incident priority | Top authorized active incidents sorted by priority and SLA deadline | As of period end | `/tickets/{id}` |
| MET-08 | Ticket trend | Created / resolved per local calendar day, selectable; EOD open is distinct | Last 7 complete/included local days as requested | `/tickets?date=...` |

### Key invariants
1. `MET-06.bucket_total == MET-03` for identical `scope + as_of + type` or expose `other` and discrepancy warning.
2. `MET-04` and `MET-05` are disjoint by SLA instance and may not be summed as ticket counts without deduplicating ticket IDs.
3. If progress baseline is missing, return `null` plus `data_quality=insufficient_baseline`, not 0 or an estimated percentage.
4. Comparison periods must be equivalent length, same scope and same definition; percent change for zero previous denominator is `null`.
5. Permissions are evaluated on each data source and every drilldown, not only the dashboard container.
6. The `24 / 86% / 12 / 03` in screenshot are demonstration values, never fixtures in production.
7. An SLA clock may use business calendars and pause rules; never compute from browser time alone.
8. Pagination/aggregation must not expose unauthorized customer names, site names or counts.

### Open questions requiring Product Owner sign-off
- Approved project active statuses; baseline weighting and partial acceptance formula.
- Ticket types counted in Open Tickets and how reopened tickets count historically.
- SLA risk threshold by policy and pause/calendar rules.
- Whether selected month shows historical as-of snapshot or current snapshot with period comparison.
- Ticket donut treatment for other nonterminal workflow statuses.
