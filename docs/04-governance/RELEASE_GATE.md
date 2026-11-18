> **v1.4 OVERRIDE (2026-11-18):** This section supersedes earlier UI-specific descriptions when they conflict. See `DESIGN_BASELINE_v1.4.md`.

### v1.4 dashboard alignment
Block release until new dashboard API contracts implemented and tested, RBAC permission catalog updated and enforced, screenshot parity reviewed, all data consistency tests pass, and Figma redesign delivered.

---

# Release gate — v1.2 review
Status: **NOT APPROVED FOR PRODUCTION**.

## Delivered
- SQL 002 migration extending SQL 001 (not yet executed on a PostgreSQL instance).
- OpenAPI 3.1 structural endpoint catalog with common error envelopes and optimistic locking.
- Machine-readable RBAC role-permission catalog, scope rules, CSV matrix.
- Requirement-to-table-to-endpoint-to-UI-to-UAT traceability matrix.
- Figma editable screens linked in FIGMA_HANDOFF.md (if creation succeeded).

## Blocking gaps
1. SQL 001/002 need live PostgreSQL migration, rollback and FK/cross-customer invariant tests; polymorphic references and approved-document immutability need stronger DB guards.
2. API generic MutationInput and Resource must be replaced by endpoint-specific request/response schemas, and all CRUD/state transitions must be implemented and contract-tested.
3. Scope evaluator must be implemented and tested on API, search, export, downloads and websocket.
4. UAT scenarios require fixtures, expected outputs, owner signatures and executed results.
5. Figma interaction prototypes and accessibility review must be signed off.
6. Business sign-offs: SLA calendars, retention, RPO/RTO, portal permissions, integration provider access.

No claim of full implementation or production readiness is made.


---
## v1.3 Visual baseline alignment (2026-11-18)
New blocker: Figma and frontend must match approved light sidebar reference, pass responsive/accessibility review and prove dashboard metric consistency. Previous database/API/security blockers remain open.


## v1.5 implementation evidence
See `../05-quality/INTEGRATION_STATUS_v1_5.md` for executable reference, verified tests and remaining production blockers. No production acceptance implied.
