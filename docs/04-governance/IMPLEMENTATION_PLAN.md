> **v1.0 NOTE (2026-11-18):** This section is authoritative where UI descriptions conflict. Source: approved dashboard baseline. See `DESIGN_BASELINE.md`.

### Dashboard alignment (approved baseline)
Sequence: approve metric definitions; verify DB source columns; update RBAC policy; implement proposed dashboard endpoints; update Figma components and eight screens; implement frontend; contract+scope+UAT; visual parity; release review.

---

# Implementation Plan & Dependency Map
## Recommended sequencing
Sprint 0 (2-3 weeks): stakeholder workshops, domain glossary, sample data, architecture decisions, baseline PRD and Figma flows.
Phase A (8-12 weeks provisional): identity/RBAC, customer/site, project/tasks, assets/movements, documents, basic tickets, scoped dashboard, email, audit.
Phase B (6-10 weeks provisional): maintenance plans/work orders, SLA policy/clock, approval workflow, reporting/PDF, customer-facing views if approved.
Phase C (6-10 weeks provisional): CI graph, diagram links, layout/rack, change and problem management.
Phase D (6-12 weeks provisional): monitoring event adapters, correlation, Telegram/Zalo integration and advanced analytics.
## Cross-cutting acceptance
Every feature includes API, schema migration, RBAC scope checks, audit, accessibility, loading/error states, automated tests, operational docs and sample seeded data.
## Delivery risks
Unknown data quality; legacy diagram import; messaging provider approvals; customer-specific SLA calendars; excessive custom workflow; mobile onsite connectivity. Mitigate via proof-of-concept and signed decision log.
## First 10 backlog tickets
1. OIDC login + permission evaluation middleware
2. Customer/site CRUD with scope grants
3. Project and project-site association
4. Task/milestone state machine and evidence
5. Asset registry + serial validation
6. Asset movement history and QR labels
7. Document versioning and access checks
8. Incident ticket lifecycle and timeline
9. Scoped dashboard KPI API
10. Email outbox worker and audit trail

## Baseline assumptions and boundaries
- One operating company, multiple customers and sites; **not SaaS multi-tenant**.
- Customer portal is optional and isolated by customer scope; no direct device administration from portal.
- On-premises or private-cloud deployment; English identifiers, Vietnamese UI labels supported.
- P0 includes project delivery, assets, site, tickets, basic maintenance, reports, email and RBAC; advanced topology editor, telemetry and bidirectional Zalo are later phases.
- All dates persisted UTC with timezone-aware presentation; all important mutations audited.
- Architecture decisions require stakeholder sign-off before production.

---

# Revised phased delivery
**Gate 0 (2–3 weeks estimate):** approve REQ/BR matrix, schema, RBAC, API contracts, prototype and NFRs. **Phase A:** identity, customer/site, project, tasks, audit, scoped search. **Phase B:** asset placement/history, diagram version and marker viewer, rack occupancy, acceptance. **Phase C:** tickets/SLA, maintenance, reports, email/outbox. **Phase D:** monitoring adapter, advanced topology editing, change, Telegram/Zalo integration. Phases are dependency-based; durations require team capacity and integration discovery.

**Exit criteria:** complete end-to-end test of Customer→Site→Project→Install→As-built→Accept→Incident→Maintain; zero critical RBAC findings; migration/restore rehearsed; report totals reconcile to scoped source data; support playbook exercised.

---
## Visual baseline alignment (2026-11-18)
Add UI sprint: token updates -> shared AppShell/LightSidebar -> dashboard KPI and charts -> states/responsive -> remaining eight screen shells -> QA and signoff. Backend endpoint additions gated by OpenAPI and authorization.
