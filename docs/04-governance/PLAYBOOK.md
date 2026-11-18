> **v1.4 OVERRIDE (2026-11-18):** This section supersedes earlier UI-specific descriptions when they conflict. See `DESIGN_BASELINE_v1.4.md`.

### v1.4 dashboard alignment
Change request v1.4: replace v1.3 blue-sidebar visual baseline with user-approved green-sidebar reference. Require Product Owner metric signoff, frontend design QA, backend contract review, RBAC tests and UAT before release.

---

# Product & Engineering Playbook
## Governance
Product Owner approves scope; Tech Lead owns architecture and ADRs; Security Owner reviews policy; QA Lead owns acceptance evidence; Operations Owner accepts handover. Weekly refinement, fortnightly demo, monthly risk review.
## Discovery (before coding)
Map actual workflows with director, PM, field engineer, support and customer; gather sample project plans, serial inventories, as-built diagrams, maintenance reports and SLA contracts; agree terminology and success metrics.
## Delivery cadence
1. PRD + domain glossary approved.
2. ERD, workflow and RBAC reviewed with negative cases.
3. Figma screen flows and accessibility review.
4. API contract and migration design approved.
5. Vertical slice end-to-end with audit and tests.
6. UAT against field scenarios; deployment/restore rehearsal.
## Engineering rules
No business logic in UI; no direct SQL across domain boundaries; transactional outbox for external sends; mandatory authz tests; no secrets in source, logs or attachments; changes to accepted workflows via ADR/CR; migrations reviewed.
## Incident playbook
Detect -> correlate -> prioritize -> assign incident commander (P1) -> contain/restore -> communicate via approved templates -> verify service -> close -> post-incident review. Track timeline and communications; no customer notifications from unverified alerts by default.
## Data migration playbook
Inventory sources -> normalize customer/site/asset IDs -> detect duplicates -> dry run -> reconcile counts and sampled records -> cutover -> rollback plan -> sign-off.
## Operational runbooks
Backup and restore; queue/DLQ replay; external provider outage; certificate renewal; access review; audit export; onboarding/offboarding; emergency break-glass access; retention purge approval.
## Release checklist
Security scans, contract tests, performance checks, UAT evidence, RBAC negative tests, restore test, rollback plan, change approval, release notes, support training.

## Baseline assumptions and boundaries
- One operating company, multiple customers and sites; **not SaaS multi-tenant**.
- Customer portal is optional and isolated by customer scope; no direct device administration from portal.
- On-premises or private-cloud deployment; English identifiers, Vietnamese UI labels supported.
- P0 includes project delivery, assets, site, tickets, basic maintenance, reports, email and RBAC; advanced topology editor, telemetry and bidirectional Zalo are later phases.
- All dates persisted UTC with timezone-aware presentation; all important mutations audited.
- Architecture decisions require stakeholder sign-off before production.


---

# v1.1 Delivery and operations playbook
**RACI:** Product Owner approves business rules; Engineering Lead owns architecture; Security reviews auth/threat model; PM owns delivery; QA owns verification; Operations owns backup/restore and on-call; customer approver signs acceptance.

**Definition of Ready:** approved REQ/BR/UX IDs, API contract, permission action, database invariant, acceptance and negative test, dependency/rollback plan. **Definition of Done:** migration tested, contract tests passing, RBAC negative tests passing, audit event verified, UX states complete, docs/runbook updated, QA and owner signoff.

**Release:** change request→impact assessment→staging migration→backup restore validation→UAT→security signoff→deploy→smoke test→monitor→rollback if error budget exceeded. **Incident:** detect→triage severity→assign commander→communicate→mitigate→restore→RCA→corrective actions. **Data repair:** no direct production UPDATE without approved ticket, backup, peer-reviewed script and reconciliation.


---
## v1.3 Visual baseline alignment (2026-11-18)
Design change control: link screenshot baseline, token version, Figma revision, UI test run and approvers. Reject visual changes that silently alter domain rules or metric formulas.
