> **v1.4 OVERRIDE (2026-11-18):** This section supersedes earlier UI-specific descriptions when they conflict. See `DESIGN_BASELINE_v1.4.md`.

### v1.4 dashboard alignment
BR-DASH-001: SLA risk and breach separate. BR-DASH-002: donut statuses mutually exclusive and reconcile. BR-DASH-003: progress weighted by approved baseline. BR-DASH-004: date and scope consistent. BR-DASH-005: no fabricated comparison or timestamp. BR-DASH-006: backend checks quick actions.

---

# Business Rules v1.1
| ID | Rule | Enforcement | Tests |
|---|---|---|---|
| BR-001 | Project-site must belong to same customer | composite FK + service check | DB-001 |
| BR-002 | Asset has max one active placement | partial unique index | DB-002 |
| BR-003 | Replacement preserves old serial and placement history | transaction, linked replacement event | UAT-004 |
| BR-004 | No asset can be installed at another customer's site without approved transfer | scoped policy | SEC-003 |
| BR-005 | Approved diagram version is immutable | workflow guard + DB policy | UAT-005 |
| BR-006 | Project acceptance requires all mandatory site deliverables accepted/waived | acceptance evaluator | UAT-003 |
| BR-007 | Rejected review creates new attempt and retains evidence | append-only reviews | UAT-003 |
| BR-008 | Rebaseline requires approved change and retains prior baseline | immutable baseline revision | UAT-002 |
| BR-009 | Ticket transition requires allowed actor/state and optimistic version | state machine | UAT-006 |
| BR-010 | Work order completion requires checklist and independent review if configured | workflow guard | UAT-007 |
| BR-011 | Missing effective SLA policy cannot produce invented deadline | SLA resolver returns policy_missing | UAT-006 |
| BR-012 | Customer users cannot see any other customer's assets/tickets/files | policy and scoped queries | SEC-001/002 |
| BR-013 | Notification delivery is at-least-once but logically deduplicated | outbox idempotency key | INT-001 |
| BR-014 | Audit events for privileged mutations are append-only | DB role separation | SEC-009 |
| BR-015 | Diagrams contain stable asset/CI refs, never raw credentials | schema + validation | SEC-010 |

**Precedence:** approved PRD/BR changes must update API, workflow, UI, migration and tests in the same change request. Every exception must identify approver and expiry.


---
## v1.3 Visual baseline alignment (2026-11-18)
BR-UI-001: Never show demo values as live data. BR-UI-002: Counts and chart totals must reconcile under identical user scope/date filters. BR-UI-003: SLA risk and breach are separate. BR-UI-004: quick actions require backend permissions. BR-UI-005: weighted progress requires approved baseline and explicit coverage.
