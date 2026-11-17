# FDI Project Management — Project Structure Review & Proposed v2

**Status:** Proposal / Requires repository verification  
**Architecture:** Single-organization, one Next.js 16 application, Supabase PostgreSQL, optional Upstash Redis  
**Not in scope:** SaaS, multi-tenancy, separate frontend/backend services

## 1. Scope and evidence
This review is based solely on `project_structure.md` v1.0 (17 Nov 2026), not a source-code audit. Paths in that document are reported structure, not independently verified. Do not rename or relocate modules until imports, tests, deployment and migrations are checked.

## 2. Critical findings
| Priority | Finding | Risk | Action |
|---|---|---|---|
| P0 | `useProfile.ts` described as soft RBAC | UI visibility may be mistaken for authorization | Enforce permissions server-side and validate RLS on every table/action |
| P0 | Supabase service-role usage unspecified | Privileged access may bypass RLS | Keep service role server-only, narrow usage, test access paths |
| P0 | `database_schema.sql` and `migrations/` coexist | Schema drift | Migrations authoritative; snapshot generated or verified |
| P1 | One `components/crud/CrudPage.tsx` for seven domains | Business rules may become coupled | Extract per-feature schemas/actions while keeping generic table/form primitives |
| P1 | `components/ui/ui.tsx` aggregates primitives | Harder component ownership and testing | Incrementally split only frequently changed primitives |
| P1 | Test and CI folders not shown | No verifiable quality gate | Add unit, integration, E2E, permission tests and CI |
| P1 | Audit logging described without tamper guarantees | Missing or mutable history | DB-side audit for critical mutations, least privilege and retention |
| P2 | In-memory rate-limit fallback | Not reliable across instances | Fail policy documented; Redis if multi-instance or public auth endpoints |
| P2 | Naming conventions conflict with existing PascalCase components | Inconsistent repository style | Explicit conventions by file category |

## 3. Proposed target layout (incremental, not an assertion of current repo)
```text
FDI_Project/
├── README.md
├── AGENTS.md
├── .env.example
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (workspace)/layout.tsx
│   ├── (workspace)/dashboard/page.tsx
│   ├── (workspace)/customers/page.tsx
│   ├── (workspace)/projects/page.tsx
│   ├── (workspace)/devices/page.tsx
│   ├── (workspace)/alerts/page.tsx
│   ├── (workspace)/maintenance/page.tsx
│   ├── (workspace)/reports/page.tsx
│   ├── (workspace)/admin/page.tsx
│   ├── api/                    # Route handlers only when needed
│   ├── layout.tsx
│   └── globals.css
├── features/
│   ├── customers/
│   ├── projects/
│   ├── devices/
│   ├── alerts/
│   ├── maintenance/
│   ├── reports/
│   └── admin/
│       # Each feature may contain components/, schemas/, actions/, queries/
├── components/
│   ├── ui/                     # Shared presentational primitives
│   ├── data-table/
│   └── layout/
├── lib/
│   ├── auth/                   # Server authorization helpers
│   ├── supabase/               # Server/client separation
│   ├── audit/
│   ├── rate-limit/
│   └── utils/
├── migrations/                # Canonical, ordered schema changes
├── tests/
│   ├── integration/
│   ├── permissions/
│   └── e2e/
├── docs/
│   ├── README.md
│   ├── product.md
│   ├── ui_ux_spec.md
│   ├── rbac_matrix.md
│   ├── tech_spec.md
│   ├── api_spec.md
│   ├── project_structure.md
│   ├── SPEC_REALITY_CHECK.md
│   └── adr/                    # Architecture decisions
└── .github/workflows/          # CI after adoption
```
Route groups `(auth)` and `(workspace)` do not alter public URL paths. This tree is a design target, not a request to move everything immediately. Keep existing routes working during refactor.

## 4. Dependency boundaries
- `app/`: routing, request/response orchestration and layouts; no domain-heavy logic.
- `features/<domain>/`: business rules, domain-specific forms, validation, queries and actions.
- `components/ui/`: generic presentation only; must not import domain features.
- `lib/auth/`: server-only authorization; checks role and project/site assignment.
- `lib/supabase/`: isolate client/server configuration; never expose privileged credentials.
- `migrations/`: schema change history, with reproducible application and rollback plans.
- Shared abstractions only after at least two actual use cases; avoid premature layering.

## 5. Security acceptance criteria
1. A signed-in engineer cannot read/write a project or site outside assigned scope, including direct API/Server Action calls.
2. Unauthenticated access to protected routes and APIs is rejected.
3. Admin-only actions are rejected server-side for non-admin users.
4. Every table storing restricted records has verified RLS or equivalent server-enforced authorization; service-role bypass is controlled and tested.
5. Sensitive mutations create auditable events without exposing secrets.
6. Uploaded files are authorized by ownership/scope, not merely obscured URLs.

## 6. CI quality gates
- Typecheck, lint and build on pull request.
- Unit tests for validation/business rules.
- Integration tests for database constraints and RLS.
- E2E smoke tests for login, project access, reports and alerts.
- Migration rehearsal against disposable database; backup/restore drill before production release.
- No deployment when required checks fail.

## 7. Rollout plan
**P0 (before refactor):** inventory actual repository; inspect `SPEC_REALITY_CHECK.md`, RLS SQL, API handlers, Supabase clients, `CrudPage.tsx`, CI and test coverage. Record gaps; do not assume missing paths are absent.

**P1:** fix authorization and schema ownership; add permission tests and CI baseline.

**P2:** extract one complex module (recommend Alerts or Reports) into `features/`, preserving URLs and behavior. Measure duplicated code, test coverage and regression rate.

**P3:** gradually move other modules only if benefits are demonstrated. Split UI primitives as needed; keep shared CRUD for genuinely generic operations.

## 8. Decisions to confirm
- Is Supabase Auth used for all users, and are server-side policies applied to every mutation?
- Which tables and storage buckets have RLS policies? Who may use the service-role key?
- Does `CrudPage.tsx` contain business logic or only configurable presentation?
- Which routes are already implemented and tested?
- Is deployment one instance or multiple instances, and is Upstash required for production?
- Who owns schema migrations, deployment approvals and rollback?

## 9. Definition of Done
A structural change is done only when URLs remain stable, permissions are tested, migrations are reproducible, existing functionality passes regression tests, documentation reflects actual code, and the change can be rolled back safely.
