> **v1.4 OVERRIDE (2026-11-18):** This section supersedes earlier UI-specific descriptions when they conflict. See `DESIGN_BASELINE_v1.4.md`.

### v1.4 dashboard alignment
Dashboard endpoints were proposed in `../06-reference/archive/dashboard_openapi_v1_4_proposed.yaml`; the implemented reference is `api/dashboard_openapi_v1_5_executable.json`. All return context.as_of, effective scope, correct metric semantics and 403 on unauthorized access. Do not treat the proposed v1.4 endpoints as implemented.

---

# REST API Specification v1
Base `/api/v1`; JSON UTF-8; OIDC bearer access tokens; pagination `limit`/`cursor`; RFC 7807 problem+json errors; request IDs; UTC ISO-8601 timestamps; ETag/If-Match or version for concurrency.
## Endpoint catalog
| Method | Path | Purpose | Permission |
|---|---|---|---|
| GET/POST | /customers | List/create customers | customer.read/create |
| GET/PATCH | /customers/{id} | Detail/update | customer.read/update |
| GET/POST | /sites | List/create sites | site.read/create |
| GET/POST | /projects | Portfolio/create | project.read/create |
| GET/PATCH | /projects/{id} | Project detail/update | project.read/update |
| POST | /projects/{id}/milestones/{mid}/accept | Approve milestone | milestone.approve |
| GET/POST | /assets | Inventory/register | asset.read/create |
| POST | /assets/{id}/installations | Append installation | asset.install |
| GET | /assets/{id}/history | Device movements | asset.read |
| GET/POST | /tickets | Queue/create ticket | ticket.read/create |
| POST | /tickets/{id}/transitions | Validated state transition | ticket.transition |
| GET/POST | /maintenance/work-orders | Work order list/create | work_order.read/create |
| POST | /work-orders/{id}/checklist/submit | Submit execution | work_order.execute |
| GET/POST | /documents | Search/upload metadata | document.read/create |
| POST | /documents/{id}/versions | New immutable version | document.update |
| GET | /dashboard/kpis | Scope-filtered KPI data | dashboard.read |
| GET | /audit-events | Auditable history | audit.read |
## Example: create ticket
```json
{"customerId":"<uuid>","siteId":"<uuid>","type":"incident","subject":"SIP trunk unavailable","impact":"high","urgency":"high","description":"Outbound calls failing"}
```
## Error contract
```json
{"type":"https://example.invalid/problems/invalid-transition","title":"Invalid workflow transition","status":409,"code":"WORKFLOW_TRANSITION_DENIED","requestId":"req_...","detail":"Missing mandatory resolution evidence"}
```
## Contract guarantees
No client-supplied customer scope overrides policy; write operations accept Idempotency-Key for external side effects; uploads use short-lived signed URLs with authorization; event subscriptions scoped and revalidated; rate limits and bulk export quotas; webhook signature verification, replay prevention and DLQ.
## OpenAPI delivery requirement
Generate machine-readable `api/openapi_v1_2.yaml` from implementation contracts before API freeze; this catalog is a specification outline, not a complete OpenAPI document.

## Baseline assumptions and boundaries
- One operating company, multiple customers and sites; **not SaaS multi-tenant**.
- Customer portal is optional and isolated by customer scope; no direct device administration from portal.
- On-premises or private-cloud deployment; English identifiers, Vietnamese UI labels supported.
- P0 includes project delivery, assets, site, tickets, basic maintenance, reports, email and RBAC; advanced topology editor, telemetry and bidirectional Zalo are later phases.
- All dates persisted UTC with timezone-aware presentation; all important mutations audited.
- Architecture decisions require stakeholder sign-off before production.


---

# v1.1 API contract rules
Canonical prefix `/api/v1`. UUID path IDs; stable public codes for search. Error shape `{type,title,status,code,detail,traceId,fieldErrors}`. Cursor pagination for mutable large lists; whitelist filters/sorts. All mutations require auth, policy check and audit. `If-Match` version for updates/transitions. `Idempotency-Key` for create, notifications and external intake. File uploads use initiate→signed upload→finalize with hash, MIME verification and malware scan.

| Operation | Method / Path | Permission | Rule IDs |
|---|---|---|---|
| Customers | GET/POST `/customers` | customer.read/create | REQ-001 |
| Sites | GET/POST `/customers/{id}/sites` | site.read/create | REQ-001 |
| Project detail | GET `/projects/{id}` | project.read | REQ-002 |
| Baseline approve | POST `/projects/{id}/baseline/approve` | project.baseline.approve | BR-008 |
| Milestone review | POST `/milestones/{id}/transitions` | milestone.review | BR-006/007 |
| Asset install | POST `/assets/{id}/installations` | asset.install | BR-003 |
| Asset replace | POST `/assets/{id}/replacements` | asset.move | BR-003 |
| Asset history | GET `/assets/{id}/history` | asset.read | REQ-003 |
| Diagram version | POST `/diagrams/{id}/versions` | diagram.edit | REQ-004 |
| Diagram approve | POST `/diagram-versions/{id}/approve` | diagram.approve | REQ-004 |
| Tickets | GET/POST `/tickets` | ticket.read/create | REQ-005 |
| Ticket transition | POST `/tickets/{id}/transitions` | ticket.transition | REQ-005 |
| Work order answer | PUT `/work-orders/{id}/answers/{itemId}` | workorder.execute | REQ-006 |
| Report request | POST `/reports/jobs` | report.generate | REQ-008 |
| Notifications | GET `/notifications` | notification.read | REQ-009 |
| Admin permissions | GET/PUT `/roles/{id}/permissions` | rbac.manage | REQ-010 |

See `api/openapi_v1_2.yaml` for the machine-readable **baseline contract** and `api/dashboard_openapi_v1_5_executable.json` for the implemented dashboard reference. Endpoint catalog is broader than implemented OpenAPI coverage; do not claim full API coverage until contract tests pass.


---
## v1.3 Visual baseline alignment (2026-11-18)
Dashboard read contracts should return `scope`, `as_of`, `range`, `metric_definition`, `numerator`, `denominator`, `value`, `comparison`, `drilldown_filter`, and `stale` where applicable. GET `/dashboard/summary`, `/dashboard/projects`, `/dashboard/ticket-status`, `/dashboard/incidents`, `/dashboard/ticket-trend` are proposed and require endpoint-specific OpenAPI schemas before implementation.


## v1.5 implementation evidence
See `../05-quality/INTEGRATION_STATUS_v1_5.md` for executable reference, verified tests and remaining production blockers. No production acceptance implied.
