# Project OPS — Specification & Technical Contracts v1.4

## Change summary
This is a **non-destructive, documentation-first alignment** of the v1.3 package to the latest user-approved optimized dashboard (`design_reference_approved_v1.4.png`). **Green sidebar** supersedes v1.3 blue-sidebar specifications. Desktop composition and KPI gradients remain unchanged.

## Start here
1. `design_reference_approved_v1.4.png` — authoritative screenshot.
2. `DESIGN_BASELINE_v1.4.md` — UI composition, semantics and interaction contract.
3. `DASHBOARD_METRIC_CONTRACT_v1.4.md` — KPI definitions and unresolved policy decisions.
4. `design/tokens.json` and `design/navigation.json` — design configuration.
5. `api/dashboard_openapi_v1_4_proposed.yaml` — valid **proposed** OpenAPI dashboard endpoints, not implementation.
6. `quality/rbac_policy.json` — proposed permission extension.
7. `quality/dashboard_contract_tests_v1_4.md` — acceptance and security test cases.
8. Existing v1.2/v1.3 PRD, ERD, database, workflow, RBAC, API, tech, Figma and playbook files have top-of-file v1.4 override notes.

## Status and source precedence
- Approved: dashboard layout, green sidebar direction and semantic fixes.
- Not implemented or verified: PostgreSQL migrations, backend, API routes, policy evaluator, live Figma design, responsive prototype, UAT, production readiness.
- Business rules/security and executable DB/API contracts prevail over illustrative screenshot values. v1.4 overrides older UI-only statements; v1.3 docs retained for history.
- Figma v1.2 file is **not** updated by this package. A Figma design update is a separate pending task.

## Open product decisions
Approve progress weighting and health baseline; SLA risk threshold/calendars; historical snapshot semantics; which ticket types and statuses count as open; effective permission scope. Do not invent these in code.
