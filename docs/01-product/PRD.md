> **v1.0 NOTE (2026-11-18):** This section is authoritative where UI descriptions conflict. Source: approved dashboard baseline. See `DESIGN_BASELINE.md`.

### Dashboard alignment (approved baseline)
REQ-UI-014 (P0): approved green navigation and pixel-composition lock; REQ-UI-015 (P0): 4 KPI cards, scope/date/refresh bar; REQ-UI-016 (P0): mutually exclusive ticket status donut; REQ-UI-017 (P0): weighted project progress; REQ-UI-018 (P0): SLA at-risk separate from breached; REQ-UI-019 (P1): incident SLA and owner; REQ-UI-020 (P1): ticket trend metric selector; REQ-UI-021 (P0): five permission-gated quick actions.

---

# PRD Infrastructure Lifecycle & Service Operations
## Problem
Customer projects, device locations/serials, as-built diagrams, maintenance and incidents are fragmented across spreadsheets, email and messaging. The platform must create a verifiable record from delivery to operations.
## Personas
Director (portfolio and SLA); Project Manager (schedule/acceptance); Field Engineer (installation/QR/checklist); Support Agent (ticket/triage); Asset Custodian (inventory); Customer Viewer (authorized service visibility); System Admin (access/configuration).
## P0 epics and acceptance
| Epic | Core requirement | Testable acceptance |
|---|---|---|
| Customer/Site | Contacts, site hierarchy and ownership | Authorized user can create site, assign contact, and search by code; unauthorized cross-customer access returns 404/403 per policy |
| Project | WBS, milestones, baseline, assignment, evidence | Milestone cannot be accepted without required evidence and reviewer approval |
| Inventory | Asset ID, serial, lifecycle, install and movement | Install event records previous/new site, actor, time and attachment; serial duplicates flagged by manufacturer/model policy |
| Documents | Versioned upload and approval | Approved as-built version cannot be overwritten; subsequent revision creates new version |
| Tickets | Intake, priority, owner, SLA, timeline | Priority and due time derive from contract policy; every transition is audited |
| Maintenance | Schedule, checklist, work order | Work order completion requires mandatory checklist items and evidence |
| Dashboard | Scoped KPIs and drill-down | Counts match authorized filtered records and provide last-updated timestamp |
| Security | Roles, scope, audit | Engineer cannot modify unassigned customer records by API or UI |
| Reports | Project/incident/maintenance PDF | Generated report contains source IDs, timestamp, revision and approver |
| Communication | Outbound email notifications | Send retries are idempotent and delivery attempts are logged |
## P1
CMDB CI dependency mapping, graphical topology interaction, rack elevation, alert ingestion, Telegram, Zalo OA, advanced SLA and change management.
## P2
Monitoring correlation, predictive analytics, automated escalation optimization, customer self-service enhancements.
## KPIs
Project milestone on-time rate; installation first-pass acceptance; inventory completeness; ticket first-response SLA attainment; restoration SLA attainment; preventive maintenance completion; documentation currency. Define each denominator, exclusions and update cadence before launch.
## User stories
- As engineer I scan QR and record device position and serial without exposing other customers.
- As PM I compare approved baseline with actual completion and review evidence.
- As support I associate incidents with service, site and CI, track SLA and notify stakeholders.
- As director I drill from at-risk KPI into underlying authorized projects.
## Exclusions and dependencies
No automatic discovery of all device topology; manual/as-built import supported. Integrations require verified provider API rights. Offline-first mobile is not assumed.
## Release gates
Security review; data migration rehearsal; backup restore test; UAT end-to-end scenarios; operational runbooks; owner approval.

## Baseline assumptions and boundaries
- One operating company, multiple customers and sites; **not SaaS multi-tenant**.
- Customer portal is optional and isolated by customer scope; no direct device administration from portal.
- On-premises or private-cloud deployment; English identifiers, Vietnamese UI labels supported.
- P0 includes project delivery, assets, site, tickets, basic maintenance, reports, email and RBAC; advanced topology editor, telemetry and bidirectional Zalo are later phases.
- All dates persisted UTC with timezone-aware presentation; all important mutations audited.
- Architecture decisions require stakeholder sign-off before production.

---

# Change Control — supersedes conflicting sections
**Status:** REVIEW REQUIRED. Product baseline only after business owner, engineering, security and operations sign-off. All requirements carry IDs.

## Scope correction
P0 must support **viewing a versioned topology**, positioning assets on a floor plan and rack U occupancy; rich graphical editing, auto-discovery and bidirectional messaging remain P1. P0 alert intake may use a documented webhook adapter; a monitoring engine is explicitly excluded.

| ID | Requirement / user outcome | Acceptance evidence | Priority |
|---|---|---|---|
| REQ-001 | Customer/site hierarchy with customer-scoped access | Cross-customer API and search requests denied; permitted site list accurate | P0 |
| REQ-002 | Project with multi-site WBS, baseline and milestone evidence | Cannot approve milestone missing mandatory site evidence | P0 |
| REQ-003 | Asset receipt, assignment, installation, relocation, replacement, retirement | History immutable; one current location; QR resolves authorized asset | P0 |
| REQ-004 | As-designed/as-built/current diagram revisions, linked asset nodes | Approved revision immutable; each node opens authorized asset detail | P0 |
| REQ-005 | Ticket classification, triage, assignment, SLA and resolution | Transitions guarded, SLA derived from approved contract policy | P0 |
| REQ-006 | Maintenance plan, scheduled work order, checklist, evidence and signoff | Cannot complete without required answers and reviewer approval | P0 |
| REQ-007 | Contract coverage for sites/services/assets | SLA cannot be inferred without effective coverage; fallback explicitly marked | P0 |
| REQ-008 | Director/PM/engineer/customer dashboards with scoped drill-down | Totals reconcile to filtered underlying records | P0 |
| REQ-009 | Email notifications with idempotent outbox delivery | Duplicate event yields one logical notification, retries logged | P0 |
| REQ-010 | RBAC+scope+ownership and sensitive document controls | Denied cross-scope access, download, search and realtime subscriptions | P0 |
| REQ-011 | Controlled change request and linked as-built updates | Approved changes linked to version history; emergency approval path logged | P1 |
| REQ-012 | Telegram/Zalo outbound integration | Provider approval, consent and delivery constraints verified | P1 |

## Business rules / exceptions
- **Partial acceptance:** acceptance is per project-site and deliverable; project-level acceptance requires every mandatory scope item accepted or formally waived (BR-006).
- **Rejection:** reviewer records reason, returns deliverable to `rework_required`, preserves evidence and prior approvals; resubmission creates new review attempt (BR-007).
- **Baseline:** immutable after approval; rebaseline requires approved change and retains original (BR-008).
- **Device replacement:** atomically deactivate old placement, create new placement, link replacement and ticket/work order, never overwrite old serial (BR-003).
- **No matching SLA:** mark `policy_missing`, notify service manager; never invent a deadline (BR-011).

## Out of scope
Full CAD editing, full SNMP poller, remote config push, billing, inventory purchasing, AI autonomous remediation, multi-company SaaS tenancy.

## Open sign-offs
Customer portal read-only vs ticket creation; contractual SLA pause rules; RPO/RTO; document retention; monitoring provider; approval authority; data volumes and target concurrent users.

---
## Visual baseline alignment (2026-11-18)
REQ-UI-013: consistent light sidebar with distinct sections/icons and selected state. REQ-UI-014: actionable KPI cards with scoped drilldowns. REQ-UI-015: accessible project progress, ticket donut, incident list, trend and quick actions. Visual approval does not imply production approval.
