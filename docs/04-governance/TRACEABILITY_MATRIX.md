> **v1.4 OVERRIDE (2026-11-18):** This section supersedes earlier UI-specific descriptions when they conflict. See `DESIGN_BASELINE_v1.4.md`.

### v1.4 dashboard alignment
v1.4 UI traceability: REQ-UI-014 -> UX-01 -> tokens/navigation -> UAT-UI-014; REQ-UI-016 -> GET /dashboard/ticket-status (proposed) -> tickets -> UAT-UI-015; REQ-UI-017 -> projects/milestones/baselines -> UAT-UI-017; REQ-UI-018 -> ticket_sla -> UAT-UI-016.

---

# Requirement Traceability Matrix v1.1
| REQ | Business rule | UX | API | Database | Test |
|---|---|---|---|---|---|
| REQ-001 | BR-001, BR-012 | UX-02/04 | GET /customers, /sites | customers, sites | SEC-001, UAT-001 |
| REQ-002 | BR-006/007/008 | UX-03 | /projects, /milestones | projects, project_sites, milestones, acceptances | UAT-002/003 |
| REQ-003 | BR-002/003/004 | UX-05 | /assets/* | assets, asset_placements, asset_replacements | UAT-004, DB-002 |
| REQ-004 | BR-005/015 | UX-04 | /diagrams/* | diagrams, diagram_versions, diagram_nodes | UAT-005 |
| REQ-005 | BR-009/011 | UX-06 | /tickets/* | tickets, ticket_events, sla_instances | UAT-006 |
| REQ-006 | BR-010 | UX-07 | /work-orders/* | work_orders, checklist_answers | UAT-007 |
| REQ-008 | BR-012 | UX-01 | /reports/jobs | report_jobs, source tables | UAT-008 |
| REQ-009 | BR-013 | UX-01 | /notifications | outbox_events | INT-001 |
| REQ-010 | BR-012/014 | UX-08 | /roles/* | roles, grants, audit_events | SEC-001–010 |

**Traceability gate:** no P0 story is Ready until all six columns are populated with implementable artifacts and a named reviewer.


---
## v1.3 Visual baseline alignment (2026-11-18)
REQ-UI-013 -> UX-01/AppShell -> navigation config -> RBAC route tests -> UAT-UI-013. REQ-UI-014 -> UX-01 KPI cards -> proposed dashboard read endpoints -> metric source tables -> UAT-UI-014. REQ-UI-015 -> UX-01 charts/actions -> ticket/project/SLA endpoints -> UAT-UI-015—018.


## v1.5 implementation evidence
See `../05-quality/INTEGRATION_STATUS_v1_5.md` for executable reference, verified tests and remaining production blockers. No production acceptance implied.
