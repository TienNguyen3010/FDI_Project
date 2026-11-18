> **v1.4 OVERRIDE (2026-11-18):** This section supersedes earlier UI-specific descriptions when they conflict. See `DESIGN_BASELINE_v1.4.md`.

### v1.4 dashboard alignment
ADR-008 proposed: Approved visual baseline is green-sidebar dashboard screenshot, replacing blue v1.3. Preserve information architecture and layout. ADR-009 proposed: Dashboard read projections use scoped source-of-truth entities; do not persist presentation-only KPI fields.

---

# Architecture Decision Records v1.1
## ADR-001 — Single-company, customer-scoped deployment
**Status:** proposed. **Decision:** one operating organization; many customer records, not SaaS multi-tenant. **Consequences:** enforce customer scope in every query and file access; no tenant-specific deployments assumed.
## ADR-002 — Modular monolith
**Status:** proposed. **Decision:** bounded modules in one deployable backend; transactional outbox for async integrations. **Reason:** lower complexity, shared consistency for early product.
## ADR-003 — Asset vs Configuration Item
**Status:** proposed. **Decision:** physical inventory assets separate from logical CIs and service dependencies. **Reason:** PBX VM and SIP trunk can exist without physical serials.
## ADR-004 — Diagram revision immutability
**Status:** proposed. **Decision:** as-designed/as-built/current diagrams are versioned; approved revisions cannot be modified in place.
## ADR-005 — Authentication and authorization
**Status:** proposed. **Decision:** OIDC + RBAC + resource scope + state guard, deny by default; no frontend-only security.
## ADR-006 — SLA policy provenance
**Status:** proposed. **Decision:** calculate SLA from effective contract coverage and calendar snapshot; missing policy is an explicit exception.

Each ADR requires approver, date, rejected alternatives and superseding ADR if changed. No ADR is approved merely by appearing in this package.


---
## v1.3 Visual baseline alignment (2026-11-18)
ADR-007 (proposed): Adopt light sidebar grouped navigation and semantic dashboard cards; UI-only change, no domain/schema migration without separate ADR.
