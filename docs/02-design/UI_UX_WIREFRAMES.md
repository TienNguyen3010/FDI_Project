> **v1.4 OVERRIDE (2026-11-18):** This section supersedes earlier UI-specific descriptions when they conflict. See `DESIGN_BASELINE_v1.4.md`.

### v1.4 dashboard alignment
Use approved image and DESIGN_BASELINE_v1.4.md as overriding reference. Preserve 4 KPI cards; 2-column progress/donut; 2-column incident/trend; quick actions. Sidebar white with green icons and pale green active Dashboard.

---

# UI/UX Wireframes — functional blueprint
## Layout
Desktop >=1280: 248px collapsible left sidebar, 56px topbar, content max 1600px, right contextual drawer 360-440px. Tablet: compact sidebar. Mobile: bottom task shortcuts, full-screen details, camera/QR workflows.
## 1. Executive dashboard
```text
[Sidebar] [Search customer/site/serial/ticket] [Notifications] [Profile]
          [Portfolio KPI] [At-risk] [Open P1] [SLA compliance]
          [Project progress / baseline] [SLA trends]
          [Overdue approvals] [Recent incidents] [Activity feed]
```
## 2. Project detail
```text
Breadcrumb Customer > Project   [Status] [Owner] [Actions]
Tabs: Overview | Plan/Gantt | Tasks | Sites | Assets | Documents | Acceptance | Activity
Overview: milestones timeline | critical path | risks/blockers | site progress
Right drawer: task details, assignee, evidence, comments, audit
```
## 3. Site detail
```text
Site header + contacts + service health
Tabs: Floor layout | Network topology | Racks | Assets | Services | Tickets | Documents
Layout: version selector [As-designed / As-built / Current] + object search + device inspector
```
## 4. Asset detail
```text
Asset ID, serial, model, status, site/rack, QR
Tabs: Identity | Network | Installation history | Warranty | Tickets | Documents | Audit
```
## 5. Service desk
```text
Filter bar: customer/site/priority/status/assignee/SLA
Table: Ticket ID | Subject | Site | Service | Priority | SLA countdown | Owner | Status
Detail: timeline | diagnosis | linked CI | internal/public comments | actions
```
## 6. Maintenance
Calendar/List switch | work order status | assigned engineer | checklist execution | photo proof | approval
## 7. Engineer mobile
My tasks -> task detail -> scan QR -> verify serial -> choose location -> checklist -> photo -> submit for review.
## Accessibility and UX
Keyboard navigation, WCAG 2.2 AA target, focus state, no color-only statuses, autosave drafts, destructive action confirmation, empty/error/loading states, persistent filters in URL, clear timezone and stale-data timestamps.

## Baseline assumptions and boundaries
- One operating company, multiple customers and sites; **not SaaS multi-tenant**.
- Customer portal is optional and isolated by customer scope; no direct device administration from portal.
- On-premises or private-cloud deployment; English identifiers, Vietnamese UI labels supported.
- P0 includes project delivery, assets, site, tickets, basic maintenance, reports, email and RBAC; advanced topology editor, telemetry and bidirectional Zalo are later phases.
- All dates persisted UTC with timezone-aware presentation; all important mutations audited.
- Architecture decisions require stakeholder sign-off before production.


---

# v1.1 Screen-level wireframe acceptance
Every screen needs loading/empty/error/permission-denied states, keyboard focus, pagination/filter persistence, responsive behavior and a link to the relevant requirement.

| Screen ID | Layout / primary actions | Data and UX acceptance |
|---|---|---|
| UX-01 Dashboard | KPI row, risk queue, project status, incidents, filters | KPI scoped; click-through yields same filtered records; freshness visible |
| UX-02 Project Portfolio | searchable table + status, owner, due date, multi-site filter | sorting/pagination; no inaccessible project shown |
| UX-03 Project Detail | tabs: overview, WBS/Gantt, sites, equipment, evidence, approvals | baseline vs actual; rejected milestone shows reason |
| UX-04 Site Infrastructure | hierarchy sidebar, floor plan, rack, topology tabs | asset markers resolve asset ID; revision label displayed |
| UX-05 Asset Detail | identity, serial, placement, CI links, history, tickets | move/replace modal previews impact; QR scanner mobile |
| UX-06 Service Desk | queue + detail drawer + SLA timer + event timeline | classify vs assign vs resolve actions permission-bound |
| UX-07 Work Order | calendar + checklist + evidence capture | mobile one-handed controls; required answers before submit |
| UX-08 Admin RBAC | user/team roles, effective scope preview, audit | show effective permissions and denial explanation |

**Desktop shell:** 240px expandable sidebar, 64px topbar, fluid content, right-side detail drawer; no fixed empty space. **Mobile:** collapsible nav, sticky task action bar, camera/QR access, offline behavior explicitly states unsupported rather than silently dropping data. **Accessibility:** WCAG 2.2 AA target, visible focus, semantic table headers, contrast and error text.


---
## v1.3 Visual baseline alignment (2026-11-18)
Replace dark/neutral sidebar sketches with light grouped sidebar. Dashboard composition: 4 gradient KPI cards; progress + ticket donut; incidents + 7-day trend; quick actions. Use the approved image and `DESIGN_BASELINE_v1.4.md` (v1.3 superseded); all eight screens inherit the shared shell.
