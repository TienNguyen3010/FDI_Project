> **v1.0 NOTE (2026-11-18):** This section is authoritative where UI descriptions conflict. Source: approved dashboard baseline. See `DESIGN_BASELINE.md`.

### Dashboard alignment (approved baseline)
Dashboard is read-only. Create Ticket / Project / Asset / Maintenance triggers existing workflows with all guards. SLA risk is an independent policy state; never transition ticket workflow because of donut selection.

---

# Workflow Specification
## Project
Draft -> Planned -> In Progress -> Ready for Acceptance -> Accepted -> Closed; alternate On Hold/Cancelled. `Ready for Acceptance` requires completed mandatory milestones, punch list threshold and evidence; `Accepted` requires authorized approver; reopening creates explicit reason and audit.
## Asset
Received -> In Stock -> Reserved -> Installed -> Active -> Under Repair -> Active OR Retired. Movements preserve old/new location and responsible custodian. RMA does not overwrite original serial; replacement is a new asset linked by replacement event.
## Incident
New -> Triaged -> Assigned -> In Progress -> Resolved -> Closed; Reopened from Resolved/Closed by policy. Priority derives impact x urgency. Resolved requires resolution code and evidence; Closed requires confirmation or policy timeout. Incident and alert have separate IDs.
## Service request
Submitted -> Approved (when required) -> Assigned -> Fulfilled -> Closed; rejection records approver and reason.
## Maintenance work order
Scheduled -> Dispatched -> In Progress -> Submitted -> Reviewed -> Completed; Failed/Rescheduled branch. Mandatory checklist and attachments enforced server-side.
## Change
Draft -> Impact Assessed -> Awaiting Approval -> Approved -> Scheduled -> Implemented -> Verified -> Closed; Failed -> Rolled Back. Emergency changes require retrospective approval within configured window.
## SLA clock
Compute response/restoration deadlines using policy effective date, business calendar, timezone, priority, pause reasons and exclusions. Store clock events; never calculate only from created_at and closed_at. Escalation via outbox events and deduplicated notifications.
## Notification delivery
Event -> Outbox -> Channel adapter -> Provider response -> Delivered/Failed/Retry; idempotency key, exponential backoff and dead-letter queue.

## Baseline assumptions and boundaries
- One operating company, multiple customers and sites; **not SaaS multi-tenant**.
- Customer portal is optional and isolated by customer scope; no direct device administration from portal.
- On-premises or private-cloud deployment; English identifiers, Vietnamese UI labels supported.
- P0 includes project delivery, assets, site, tickets, basic maintenance, reports, email and RBAC; advanced topology editor, telemetry and bidirectional Zalo are later phases.
- All dates persisted UTC with timezone-aware presentation; all important mutations audited.
- Architecture decisions require stakeholder sign-off before production.

---

# Transition contracts
All transitions require expected `version`; conflicts return HTTP 409. Mutate state + write business history + outbox in one transaction; notifications happen asynchronously.

| Flow | From → Action → To | Guard | Side effects / failure |
|---|---|---|---|
| Ticket | new → triage → triaged | type, impact, urgency present | derive priority; 422 missing fields |
| Ticket | triaged → assign → assigned | assignee in authorized team | create assignment event |
| Ticket | assigned → start → in_progress | actor assigned | start work timeline |
| Ticket | in_progress → resolve → resolved | resolution code, notes, evidence if required | record restoration time, notify reviewer |
| Ticket | resolved → close → closed | reviewer/confirmation per contract | freeze close record; 403 otherwise |
| Ticket | resolved → reopen → in_progress | reason, reopen window | SLA behavior according to policy; no silent reset |
| Milestone | ready_for_review → approve → accepted | required site deliverables, reviewer not submitter | append approval and freeze revision |
| Milestone | ready_for_review → reject → rework_required | rejection reason | append review attempt, retain evidence |
| Asset | in_stock → install → active | valid location, no active placement, authorized work | append placement, installation event |
| Asset | active → replace → replaced | replacement asset ready, work order linked | close old placement/open new atomically |
| Work order | scheduled → start → in_progress | assigned technician, valid window | record start |
| Work order | in_progress → submit → review | mandatory checklist answers and attachments | generate review snapshot |
| Work order | review → approve → completed | reviewer with approval permission | generate report, next schedule occurrence |
| Diagram | draft → submit → review → approve → approved | linked nodes valid, version unique, approver | freeze version; publish current reference |

**SLA clocks:** policy selected from effective contract coverage + service + priority + site timezone; store calendar version and computed deadline. Pause reasons must be contract-authorized, event-sourced and independently auditable. Missing policy → `policy_missing`, not fabricated due_at. Incident restoration and final resolution are distinct timestamps. Use UTC instants for storage and IANA timezone for presentation.

---
## Visual baseline alignment (2026-11-18)
Quick actions launch existing workflows; they do not bypass guards. Dashboard read-only projections never advance workflow states. Alert badges reflect scoped actionable state only.
