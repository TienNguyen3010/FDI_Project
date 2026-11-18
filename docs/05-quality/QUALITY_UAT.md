> **v1.4 OVERRIDE (2026-11-18):** This section supersedes earlier UI-specific descriptions when they conflict. See `DESIGN_BASELINE_v1.4.md`.

### v1.4 dashboard alignment
UAT-UI-014: screenshot layout matches; UAT-UI-015: donut sums to open tickets; UAT-UI-016: SLA risk excludes already breached; UAT-UI-017: weighted progress handles missing baseline; UAT-UI-018: cross-customer scope blocks KPI and drilldown; UAT-UI-019: time window consistency; UAT-UI-020: quick actions denied without permission.

---

# UAT & Quality Verification v1.1
| Test | Scenario | Expected |
|---|---|---|
| UAT-001 | Create customer/site and view as assigned user | scoped records only |
| UAT-002 | Approve baseline, then request change | baseline unchanged until authorized revision |
| UAT-003 | Reject one site acceptance, resubmit | project not accepted until all mandatory items resolved; history retained |
| UAT-004 | Replace IP Phone with different serial | old/new records and locations preserved, ticket linked |
| UAT-005 | Approve as-built topology, edit node | new draft version; approved revision unchanged |
| UAT-006 | Ticket without SLA coverage; resolve/reopen | policy_missing, no fabricated due date; valid audit trail |
| UAT-007 | Submit maintenance without required evidence | 422 and work order stays in progress |
| UAT-008 | Dashboard KPI drill-down | authorized count matches list and timestamp |
| SEC-001 | Customer A user requests B ticket | 403/404 with no data leakage |
| SEC-002 | Customer A downloads B file | denied even with guessed file ID |
| SEC-003 | Engineer installs asset in unauthorized site | denied; no movement committed |
| SEC-005 | Subscribe to unauthorized websocket topic | denied |
| SEC-009 | Attempt to modify audit history as app role | DB permission denied |
| INT-001 | Retry same outbound email event | one logical notification, attempts recorded |
| DB-001 | Attach foreign-customer site to project | DB constraint rejects |
| DB-002 | Insert second active placement for same asset | unique constraint rejects |

**Exit gate:** 100% P0 critical flows pass; no open critical/high security defects; backup restore and rollback drill evidenced; business owner signs acceptance. Test datasets must contain at least two customers and cross-scope negative cases.


---
## v1.3 Visual baseline alignment (2026-11-18)
Add UAT-UI-013 navigation role filtering and keyboard; UAT-UI-014 KPI reconciliation across date ranges; UAT-UI-015 donut sum/open tickets; UAT-UI-016 mobile 390px and 200% zoom; UAT-UI-017 loading/error/stale/forbidden; UAT-UI-018 quick-action authorization.


## v1.5 implementation evidence
See `INTEGRATION_STATUS_v1_5.md` for executable reference, verified tests and remaining production blockers. No production acceptance implied.
