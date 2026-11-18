> **v1.4 OVERRIDE (2026-11-18):** This section supersedes earlier UI-specific descriptions when they conflict. See `DESIGN_BASELINE_v1.4.md`.

### v1.4 dashboard alignment
Approved sidebar is GREEN (not v1.3 blue): white canvas, green outline icons, green group headings and rules, pale-green Dashboard active, left green active rail. Preserve menu order and bottom profile. Canonical navigation: assets/navigation.json.

---

# Sidebar & Navigation Specification
## Navigation hierarchy
- Overview: Dashboard, My Workspace
- Delivery: Customers, Projects, Sites
- Infrastructure: Assets, CMDB, Layout & Topology, Racks
- Service Operations: Service Desk (Incidents, Requests, Problems, Changes), Monitoring & Alerts
- Maintenance: Calendar, Plans, Work Orders, Warranty/RMA
- Intelligence: Reports, Documents, Communication Logs
- Administration: Users, Teams, Roles/Scopes, Integrations, Audit, Settings
## Rules
Navigation is permission-aware but backend remains authoritative. Menu sections collapse; retain active item and breadcrumb. Quick search across project code, ticket, asset ID, serial and site; results filtered by scope. P0 hide unreleased P1 entries via feature flags rather than dead links. Director default dashboard; engineer default My Workspace; support default ticket queue; customer default customer portal.
## URL conventions
`/customers/:id`, `/sites/:id`, `/projects/:id`, `/assets/:id`, `/tickets/:id`, `/maintenance/work-orders/:id`; filters in query string for shareable views.

## Baseline assumptions and boundaries
- One operating company, multiple customers and sites; **not SaaS multi-tenant**.
- Customer portal is optional and isolated by customer scope; no direct device administration from portal.
- On-premises or private-cloud deployment; English identifiers, Vietnamese UI labels supported.
- P0 includes project delivery, assets, site, tickets, basic maintenance, reports, email and RBAC; advanced topology editor, telemetry and bidirectional Zalo are later phases.
- All dates persisted UTC with timezone-aware presentation; all important mutations audited.
- Architecture decisions require stakeholder sign-off before production.


---

# v1.1 Navigation decision
Top level: Overview; Customers; Delivery (Projects, Portfolio, Approvals); Infrastructure (Sites, Assets, Topology, Layout, Racks); Service Desk (Incidents, Requests, Changes); Maintenance (Calendar, Plans, Work Orders); My Work; Reports; Administration. Show only authorized sections; hide is UX only, backend always checks. Role landing pages: Director=Overview; PM=Project Portfolio; Engineer=My Work; Support=Incident Queue; Customer=My Sites. Persist collapse state per user. Search by project code, site, asset code/serial, ticket code with scoped results.


---
## v1.3 Visual baseline alignment (2026-11-18)
v1.3 approved navigation order: Overview [Dashboard]; Customers & Projects [Customers, Projects, Sites, Infrastructure, Assets]; Operations & Services [Works, Service Desk, Maintenance, Monitoring]; Documents & Reports [Documents, Reports]; System [Admin]. Light section containers, blue active nav, navy outline icons, badge only for actionable counts, bottom profile; see `assets/navigation.json`.
