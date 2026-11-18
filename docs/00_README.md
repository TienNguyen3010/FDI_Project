# Enterprise Infrastructure & Service Operations — Specification v1.1
**Date:** 2026-11-18 · **Status:** Major Revision / For Review · **Deployment:** Single-company, multi-customer, NOT SaaS multi-tenant.

## Deliverables
Revised original specifications: PRD_v1.0.md (contains v1.1 override), DOMAIN_MODEL_ERD.md, RBAC_MATRIX.md, WORKFLOW_SPECIFICATION.md, API_SPEC.md, DATABASE_SPEC.md, UI_UX_WIREFRAMES.md, SIDEBAR_SPEC.md, CHECKLISTS.md, TECH_SPEC.md, FIGMA_DESIGN_SPEC.md, PLAYBOOK.md, IMPLEMENTATION_PLAN.md.
New governance: BUSINESS_RULES.md, DATA_DICTIONARY.md, TRACEABILITY_MATRIX.md, ADR.md, QUALITY_UAT.md.
Machine-readable starters: `database/001_core.sql`, `api/openapi.yaml`.

## Source of truth
Approved PRD + Business Rules > signed ADRs > domain model/workflows > API/DB contracts > UX/Figma handoff > code. Changes require impact review and synchronized updates to traceability matrix.

## Known incompleteness / do not overclaim
- SQL migration is a **core executable starter**, not full production schema. Missing RBAC, contract/SLA, acceptance, maintenance, document and audit tables; some cross-customer invariants still require guards.
- OpenAPI is a **partial starter** for tickets, not complete API coverage.
- Figma is **design handoff specification**, not a native editable Figma file.
- Workflows and RBAC require stakeholder signoff. Non-functional targets are proposed, not measured.
- Old text in original v1.0 sections may conflict with appended v1.1 corrections: **v1.1 sections take precedence**. Consolidation into clean canonical documents is required before implementation baseline.

## Next approval gate
Confirm customer portal scope, SLA calendars, site/asset data volumes, monitoring integration, deployment model, retention, SSO, RPO/RTO, approval matrix. Then finish missing DDL/OpenAPI and create real Figma frames; run UAT/security gates.


---
## v1.3 Visual baseline alignment (2026-11-18)
The canonical visual baseline is `DESIGN_BASELINE_v1.3.md` and `design_reference_light_sidebar.png`; data contracts remain authoritative for metric calculations.
