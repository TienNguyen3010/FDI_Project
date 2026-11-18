> **v1.4 OVERRIDE (2026-11-18):** This section supersedes earlier UI-specific descriptions when they conflict. See `DESIGN_BASELINE_v1.4.md`.

### v1.4 dashboard alignment
Dashboard widgets, global search, drilldowns, project detail, incident detail, SLA count, refresh and quick actions require backend permissions and record-level scope. `dashboard.read` and `monitoring.read` are proposed new permissions, not present in original policy until updated.

---

# RBAC Matrix & Policy Authorization
## Roles
SYS_ADMIN (platform configuration only), DIRECTOR, PM, ENGINEER, SUPPORT, ASSET_MANAGER, CUSTOMER_VIEWER, AUDITOR. One user may hold multiple roles with explicit scope grants.
## Permission matrix
Legend: R read, C create, U update, A approve, X administer, — denied. Every permission is constrained by data scope.
| Resource | Admin | Director | PM | Engineer | Support | Asset manager | Customer | Auditor |
|---|---|---|---|---|---|---|---|---|
| Customers/Sites | X | RCU | RU | R | R | R | R | R |
| Projects | R | RCA | RCUA | RU assigned | R | R | R scoped | R |
| Assets | R | RU | RU | RU assigned | R | RCU | R scoped | R |
| Tickets | R | RCA | RU scoped | RU assigned | RCU | R | RC scoped | R |
| Maintenance | R | RCA | RCU | RU assigned | RU | RU | R scoped | R |
| Reports | R | RA | RCA | C assigned | C | C | R approved | R |
| Users/Roles | X | — | — | — | — | — | — | R audit only |
| Audit logs | R | R scoped | — | — | — | — | — | R |
## Enforcement
Policy = permission AND scope AND resource status AND workflow guard. Scopes: own, assigned, team, project, customer, all. `all` restricted to approved administrative grants. Customer viewer never accesses internal comments, credentials, raw monitoring secrets or drafts.
## Sensitive operations
Export requires separate `resource.export`; approval requires `resource.approve`; privilege changes require MFA/re-authentication and audit. Separation of duties: preparer cannot approve own acceptance/change where configured. No implicit admin bypass of customer data except documented break-glass access.
## Negative tests
Cross-customer GET, list filter, attachment download, bulk export, websocket subscription, guessed UUID, search, background report and notification recipient all must enforce identical scope.

## Baseline assumptions and boundaries
- One operating company, multiple customers and sites; **not SaaS multi-tenant**.
- Customer portal is optional and isolated by customer scope; no direct device administration from portal.
- On-premises or private-cloud deployment; English identifiers, Vietnamese UI labels supported.
- P0 includes project delivery, assets, site, tickets, basic maintenance, reports, email and RBAC; advanced topology editor, telemetry and bidirectional Zalo are later phases.
- All dates persisted UTC with timezone-aware presentation; all important mutations audited.
- Architecture decisions require stakeholder sign-off before production.


---

# v1.1 Executable authorization contract
Decision = authenticated AND permission granted AND resource scope matches AND resource state permits AND field policy permits. Default deny. UI visibility is never authorization.

| Action | Admin | Director | PM | Engineer | Support | Customer |
|---|---|---|---|---|---|---|
| project.read | all | managed | assigned | assigned | linked | customer-owned |
| project.baseline.approve | deny* | managed | deny | deny | deny | deny |
| asset.install | deny* | deny | assigned | assigned | deny | deny |
| asset.move | deny* | managed | assigned | assigned | deny | deny |
| ticket.read | all | managed | linked | assigned | assigned/team | customer-owned |
| ticket.assign | deny* | managed | linked | deny | team lead | deny |
| ticket.resolve | deny* | deny | linked | assigned | assigned | deny |
| ticket.close | deny* | managed | linked | deny | team lead | customer confirmation where enabled |
| report.approve | deny* | managed | assigned with segregation | deny | deny | deny |
| document.download.sensitive | explicit grant | managed | assigned | approved assigned | assigned | deny by default |
| rbac.manage | all | deny | deny | deny | deny | deny |

`deny*`: administrative account is not automatically an operational actor; emergency elevation is separately audited. Permissions in this table are baseline proposals requiring business sign-off.

**Scopes:** `all`, `managed_customer`, `assigned_project`, `assigned_site`, `team`, `assigned_ticket`, `customer_self`. Evaluate server-side using relation joins, not client-supplied customer_id. Field-level deny for ticket SLA policy/priority/ownership unless specific action permission. Signed download URLs short-lived and reauthorized. Apply same policy to search indexes, exports, PDF generation, websocket topics and background jobs.

**Security test IDs:** SEC-001 cross-customer read; SEC-002 IDOR download; SEC-003 forged customer_id create; SEC-004 unauthorized priority edit; SEC-005 websocket topic escalation; SEC-006 search leakage; SEC-007 stale membership after role revocation; SEC-008 export > authorized scope.


---
## v1.3 Visual baseline alignment (2026-11-18)
Menu visibility derives from effective permission plus scope, never grants access. Dashboard endpoints, drilldown, export, global search, alerts and realtime updates must all re-evaluate authorization. No hardcoded role-only KPI counts.


## v1.5 implementation evidence
See `quality/INTEGRATION_STATUS_v1_5.md` for executable reference, verified tests and remaining production blockers. No production acceptance implied.
