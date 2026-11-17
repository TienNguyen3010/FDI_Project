# FDI Project Management — Product Requirements Document (PRD) v2.0

**Status:** Proposed / Pending approval  
**Owner:** Product Owner (TBD)  
**Updated:** 2026-11-17  
**Audience:** Director, Manager, Leader, Engineer, Product, Engineering, QA  
**Source:** `docs/product.md` v1.0. This document is a proposed revision, not a claim that the application already implements these features.

## 1. Executive decision & boundaries

FDI Project Management is an **internal, single-organization web application** for managing customers, sites, projects, equipment, incidents, maintenance, work and field reports. **No SaaS, subscription billing, tenant provisioning or multi-tenant architecture.**

Preserve four business roles: **Employee, Leader, Manager, Director**. Technical system administrators are a **separate operational privilege**, not automatically equivalent to Director. The implementation baseline described in `../03-architecture/project_structure.md` is **one Next.js 16 App Router application, Supabase/PostgreSQL and object storage**; verify actual code before adopting any change.

**Clarification needed:** Original PRD says the website runs “inside Claude”; project structure says standalone Next.js. The target hosting, deployment and runtime must be confirmed. Do not treat an AI development assistant as the production runtime.

## 2. Product problem & outcomes

### Current problem
Customer, site, project, device serial, field evidence and operations records may be fragmented. Management needs an accurate cross-linked view; engineers need fast mobile reporting; operations needs traceable ownership and SLA handling.

### Outcomes (targets to approve after baseline measurement)
1. Project/site/device records can be traced end to end without manual spreadsheet reconciliation.
2. Field reports have consistent evidence, review and approval history.
3. Incident ownership, timestamps and SLA calculations are auditable.
4. Role- and assignment-scoped access is enforced on the server and in the database, not merely hidden in UI.

**Do not set arbitrary numerical targets** until usage volume, staffing, current reporting times and contractual SLA terms are collected.

## 3. Personas and access model

| Role | Primary outcomes | Default scope (proposed) |
|---|---|---|
| Employee / Engineer | Update assigned work, record device installation, submit reports | Explicitly assigned projects/sites/work |
| Leader | Assign tasks, review field reports, monitor team | Assigned team and projects |
| Manager | Approve operations, manage department work and SLA | Assigned department |
| Director | Enterprise overview, business approvals | Company-wide read; sensitive write actions only if explicitly granted |
| System administrator (technical permission) | Provision users, maintain configuration | Administrative operations only; no automatic contract visibility |

**Permission rule:** `role + action + resource + scope + workflow state`. All sensitive reads/writes require server authorization and RLS/policy tests as applicable. Role names alone do not grant every action.

## 4. Scope and single roadmap

| Phase | Included | Exit criterion |
|---|---|---|
| P0 Foundation | Login, user/role/assignment, customer, site, project, project-site links, basic device inventory, audit, file access | Correct scoped CRUD and no cross-project access in tests |
| P1 Delivery MVP | Milestones, tasks, handover checklist, site report draft/submit/review, photo evidence, basic dashboard | End-to-end project-to-handover scenario passes UAT |
| P2 Operations | Alert intake, incident management, maintenance, notifications, SLA and escalation | Incident lifecycle and SLA cases validated |
| P3 Enhancements | PDF exports, advanced reporting, integrations, rack visualization, optional offline queue | Each feature meets separately approved acceptance criteria |

**Not in scope unless separately approved:** native mobile app, AI automation, on-call, RMA, subscription/billing, full offline-first sync, automatic Zalo sending. A responsive mobile web UI is in scope.

## 5. Information architecture

Dashboard; Customers; Sites; Projects; Devices; Work; Alerts & Incidents; Maintenance; Site Reports; Administration. Navigation items shown according to permissions; backend must independently authorize requests.

### Canonical domain relationships (proposed)
- Customer `1:N` Site; Customer `1:N` Project.
- Project `N:M` Site via `project_sites` (must validate customer consistency).
- Device is an inventory asset, with current location and **device_assignment_history**; project links record deployments, not permanent ownership.
- Project `1:N` Milestone and Work; Work may also link Incident or Maintenance.
- Alert `N:1` Incident when correlated; an alert can exist without an incident.
- Site Report belongs to a project/site and has attachments, author, reviewer, version and approval history.
- Contract/SLA belongs to the agreed service/customer/site scope, not simply a project by default; exact contractual granularity TBD.

Identifiers use UUIDs. Store timestamps in UTC, render in user-configured timezone. Deletion of records referenced by audit, reports or incidents should be restricted or soft-deleted per approved retention policy.

## 6. Functional requirements & acceptance criteria

### FR-01 Customer and Site
- Create, update, search, filter and view customer/site profiles; prevent unintended duplicate customers via review rules rather than name-only unique constraint.
- Site belongs to one customer at a time; changing ownership requires an authorized controlled process.
- **AC:** Unauthorized users cannot fetch a customer or site by guessing its ID; customer-site relationships are validated server-side.

### FR-02 Project & milestones
- Project lifecycle: `PLANNED → IN_PROGRESS → READY_FOR_HANDOVER → DEPLOYED → CLOSED`, with `ON_HOLD` and `CANCELLED` transitions defined in a state-transition table before implementation.
- Progress is computed from approved milestone weighting or explicit tracked progress; choose one policy, never silently mix.
- **AC:** Deployment/handover is blocked if required checklist items or approvals are missing; the user sees specific missing items; transition is audited.

### FR-03 Device inventory
- Capture manufacturer, model, normalized serial, MAC when available, warranty dates, current site/rack, installation status and historical assignments.
- **Serial policy:** prefer unique `(manufacturer, normalized_serial)` when valid; define handling for missing/reused vendor serials and legacy duplicates. Do not assume uniqueness only within project.
- **AC:** Moving a device retains previous assignment history and does not erase prior incident/report associations.

### FR-04 Work and maintenance
- Work has owner, assignee, due date, priority, status and links to project/site/incident where applicable.
- Maintenance has schedule, checklist, responsible party, outcome and planned maintenance window.
- **AC:** A completed maintenance record preserves checklist results and author/time; skipped work requires a reason.

### FR-05 Alert and Incident
- Alert: source, source event ID, detected timestamp, device/site, severity, deduplication key, raw payload reference.
- Incident: business impact, severity, assignee, acknowledgement, resolution, closure, RCA, SLA policy reference.
- Proposed lifecycle: `NEW → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED`; `REOPENED` is a controlled transition, not an implicit overwrite.
- **AC:** Repeated monitoring events with the same dedupe key in the configured window do not create duplicate incidents; every transition is auditable.
- **SLA:** Define calendar, holidays, timezone, pause rules, response vs resolution clock, maintenance exclusions and severity mapping per contract. Example 15-minute Critical / 1-hour Major from v1 is **illustrative only until approved**.

### FR-06 Site Report
- Templates for survey, deployment and maintenance; fields for site, work performed, observations, evidence, pending items and reviewer.
- Lifecycle: `DRAFT → SUBMITTED → APPROVED` or `CHANGES_REQUESTED → RESUBMITTED`; approval captures reviewer and timestamp.
- **AC:** Draft survives refresh; submitted report is versioned; approved report cannot be silently edited; missing mandatory evidence blocks submission with clear feedback.
- Signatures and PDF generation require separate legal/business validation; do not claim digital signatures have legal validity by default.

### FR-07 Dashboard and reports
- All KPIs must use the same role-scoped query semantics as list views.
- Each KPI must have an owner, exact formula, status mapping, source, date window, refresh rule and drill-down.
- **AC:** KPI totals reconcile with filtered underlying records in automated tests.

### FR-08 Administration and audit
- Manage users, role assignments, teams/departments, reference catalogs and SLA policies.
- Record actor, action, resource, timestamp, before/after where appropriate, and request correlation ID; redact secrets and unnecessary personal data.
- **AC:** A non-authorized user cannot self-promote or grant access; administrative changes are recorded and reviewed.

## 7. Critical business rules

1. **No UI-only authorization.** Never rely on filtering rows in the browser for confidentiality.
2. **No mandatory project link for every incident/device.** Operational incidents may occur after deployment or before a new project exists; site/customer association rules must be explicit.
3. **No arbitrary forced photos.** Required attachments depend on report type and checklist; a fixed minimum of 3 photos is not a product KPI.
4. **No duplicate source of truth.** Device location, project progress, and incident status each have one authoritative definition.
5. **No automatic external notification claim.** Initial scope may generate copy-ready email/Zalo text; sending requires a separate integration, permission and delivery tracking.
6. **No universal fixed SLA.** Contract-specific rules take precedence over sample defaults.

## 8. Non-functional requirements (proposed acceptance baseline)

- **Security:** Server-side authorization on every data operation, secure session management, protected file URLs, validated MIME/content and upload size, audit logging, dependency scanning.
- **Accessibility:** WCAG 2.2 AA target for primary workflows; keyboard and screen reader checks.
- **Performance:** Agree realistic p95 page/API targets and load profile after baseline; do not confuse API response time with end-to-end screen rendering.
- **Reliability:** Define RPO, RTO, backup scope for PostgreSQL and object storage, and regularly test restore.
- **Data:** Referential integrity, migrations reviewed, retention and deletion policy, privacy classification for contact and location data.
- **Mobile:** Responsive field reporting with retry and draft preservation; offline-first is deferred unless field connectivity research justifies it.
- **Observability:** Structured logs, request IDs, error monitoring and alert ownership.

## 9. Metrics dictionary (draft)

| Metric | Canonical definition |
|---|---|
| Total Projects | Count visible, non-deleted projects at query time |
| Active Projects | Count status=`IN_PROGRESS` (plus any approved additional active statuses) |
| Open Incidents | Count incidents not `CLOSED` and not excluded by approved policy |
| Overdue Work | Due date passed and status not completed/cancelled; timezone explicitly applied |
| SLA Compliance | Eligible incidents meeting the contractual clock / all eligible incidents in the reporting cohort |
| Field Report Approval Rate | Approved submitted reports / eligible submitted reports for the reporting period |
| Upcoming Maintenance | Scheduled maintenance due in the selected window and not completed/cancelled |

**Do not reuse v1's mismatched filters** (`active`, `open`) without mapping them to canonical enums. Baseline and targets TBD.

## 10. Dependencies, decisions and open questions

| ID | Decision required | Owner (TBD) | Blocking? |
|---|---|---|---|
| D-01 | Confirm standalone Next.js deployment versus wording “runs in Claude” | Engineering/Product | Yes |
| D-02 | Confirm role/action/scope matrix and technical administrator permissions | Business/Security | Yes |
| D-03 | Confirm Project↔Site cardinality and cross-customer restrictions | Product/Data | Yes |
| D-04 | Confirm device identity, serial normalization, reassignment history | Operations/Data | Yes |
| D-05 | Confirm project handover checklist and approval policy | Delivery | Yes for P1 |
| D-06 | Confirm alert vs incident classification and SLA calendar | Operations | Yes for P2 |
| D-07 | Confirm report templates, photo requirements and signature acceptance | Field Ops | Yes for P1 |
| D-08 | Confirm offline use cases, device support and retention requirements | Product/IT | No for P0 |

## 11. Delivery quality gates

**Definition of Ready:** user story has actor, action, scope, data fields, validation, states, exception cases, acceptance tests and owner approval.  
**Definition of Done:** code reviewed; migration and access policies tested; unit/integration/E2E coverage appropriate; audit and error paths tested; QA/UAT evidence recorded; documentation updated; release/rollback plan approved.

### Priority end-to-end UAT scenarios
1. Engineer assigned Project A can create a report for A but cannot access Project B by direct URL/API.
2. Manager reviews report, requests changes, approves resubmission; revision history remains intact.
3. Device moves between sites; old report and incident still reference historical installation.
4. Duplicate alerts correlate to one incident; SLA timestamps and escalation are reproducible.
5. Project handover fails when mandatory evidence missing, succeeds after approved completion.
6. Backup restore recovers both structured records and their referenced file attachments.

## 12. Document governance

This PRD owns **why, who, what, priority and acceptance**. Detailed implementation belongs in `../03-architecture/tech_spec.md`; API schemas in `../03-architecture/api_spec.md`; UI behavior in `../02-design/ui_ux_spec.md`; permissions in `../04-security/rbac_matrix.md`; migrations in versioned SQL; actual-versus-planned status in `SPEC_REALITY_CHECK.md`.

**Change control:** Every approved scope change updates this PRD, its decision log, impacted specs, tests and roadmap. Existing source code is not automatically compliant with this proposal.
