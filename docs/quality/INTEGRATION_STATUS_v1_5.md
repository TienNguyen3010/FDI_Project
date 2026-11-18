# Integration evidence and remaining blockers

| Deliverable | Evidence | Status |
|---|---|---|
| Dashboard 5 GET endpoints | `implementation/app.py`, OpenAPI generated from app | Executable reference |
| Authorization | test-only identity + customer-scope grant query | Testable reference, **not production RBAC** |
| Cross-customer protection | `tests/test_dashboard.py` | Testable reference |
| Ticket state vs SLA | mutually exclusive state buckets; SLA risk separately | Testable reference |
| Weighted progress | explicit baseline weights | Testable reference |
| Database | SQLite fixture for executable API, v1.4 PostgreSQL DDL retained | **No PostgreSQL integration run** |
| Figma | Editable dashboard in existing file | Partial sync, not pixel-perfect |
| UI→API→DB→UAT | mapping below | Partial, reference only |

## Contract mapping
- KPI active_projects → GET summary → projects.status → test_scoped_summary.
- KPI progress → GET summary → projects.baseline_weight/completion → test_scoped_summary.
- KPI open tickets → GET summary → tickets.status → test_scoped_summary.
- SLA risk/breach → GET summary → tickets.sla_state → test_scoped_summary.
- Ticket donut → GET ticket-status → tickets.status → test_ticket_status_exclusive.
- Incident list → GET incidents → tickets.priority/status → test_all_endpoints_scoped.
- Trend → GET ticket-trend → tickets.created_date → test_trend_metric.
- Customer scope → every GET endpoint → grants → test_cross_customer_blocked/test_all_endpoints_scoped.

## Release blockers
1. Replace demo header identity with verified OIDC, add policy/field/document authorization and negative matrix tests.
2. Run real PostgreSQL migrations and rollback tests with containerized CI; validate foreign keys and ownership invariants.
3. Complete OpenAPI contracts for non-dashboard modules; generated schema is a reference API, not all endpoints.
4. Implement SLA calendars, timezone and escalation; seed currently stores illustrative SLA states.
5. Pixel-accurate Figma dashboard, other 7 screens, mobile variants, accessibility review.
6. E2E UI/API integration and production-like performance/security testing.
