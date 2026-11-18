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

## 10. W0 + P2 actual progress (2026-11-18)
> §3–§9 ở trên là thiết kế/target — giữ nguyên, không sửa. Mục này ghi tiến độ **thực tế đã code**, có SHA đối chiếu. Theo evidence hierarchy: runtime/test log @ SHA > code inspection @ SHA > spec/assertion.

- **(a) W0 — DONE @ `5b32909`** (`refactor(W0): extract server authorization to lib/auth`): đã tách `lib/auth/authorize.ts` (xác thực JWT + đối chiếu `users.role` là DB-authoritative, `allowed` roles parameterized) và `app/api/admin/roles/route.ts` đã dùng lại helper, bỏ bản inline trùng. Bằng chứng recorded: `tsc` 0, `lint` 0, `npm test` **22/22** — cite `checklist.md §12` (dòng 265–267, nhật ký xác minh) + `SPEC_REALITY_CHECK.md` W0 note (dòng 57). Routes/URL không đổi. ⏳ Chưa re-run live trong phiên tài liệu này (chỉ trích evidence tại SHA).
- **(b) C-09 — DONE @ `167a674`** (`feat: implement /api/v1 alias via proxy rewrite (DD C-09), 22 tests pass`): `/api/v1` alias hiện thực bằng `proxy.ts` rewrite (`proxy.ts:86-93`) — client thấy `/api/v1/*`, route nội bộ giữ `/api/*`, **không redirect**. Curl smoke thật (`/api/v1/auth`, `/api/v1/auth/session`, `/api/v1/admin/roles`) + smoke test **22/22** (ghi tại `DD_DECISIONS_P0.md` C-09). Không đổi cấu trúc thư mục route.
- **(c) P2 — DONE (chưa commit) @ working tree 2026-11-18**: domain Alerts đã trích vào `features/alerts/schema.ts` (constants/config) + `features/alerts/actions.ts` (`changeAlertStatus`, `createWorkFromAlert` — giữ nguyên payload DB/audit). `components/incident/IncidentLifecycle.tsx` và `app/alerts/page.tsx` giờ import domain, bỏ bản duplicate. **Verify thật:** `tsc --noEmit` exit 0 · `lint` 0 error · `npm test` **23/23** · `NEXT_PRIVATE_BUILD_WORKER=1 npx next build --webpack` exit 0 (**21 routes**, `/alerts` + `/alerts/[id]` vẫn hiện) · marker-grep `features/alerts` = 2 refs/component + 2 refs/page, local dupes = 0. URL & hành vi không đổi. Xem `checklist.md §12` dòng 273.
- **(d) Auth layout — DONE @ working tree 2026-11-18**: theo ảnh production, `/login` lộ sidebar nội bộ (root layout mount `ClientBody` cho mọi route). Đã tách route group `app/(auth)/login` (màn hình login riêng, không shell) + `app/(workspace)/layout.tsx` bọc `ClientBody`; root layout giữ html/body/font/metadata. Giữ **một** root layout (tránh caveat multiple-root-layout của Next16). Bỏ nút "Quay về Dashboard" (loop) + link "Quên mật khẩu?" `href="#"` (dead). URL/API/auth logic/proxy không đổi. **Verify thật:** `tsc --noEmit` 0 · lint 0 · `npm test` **23/23** · build webpack exit 0 — `/login` giờ `○` (static, KHÔNG shell) thay vì `◐`, `/dashboard` `/alerts` `/reports` vẫn `◐`. Sửa 2 test do dời route: `tests/pdf.test.mjs` helper `readPage` thử cả path `(workspace)`/cũ; review doc bỏ literal regex tránh self-match smoke test. Audit: `00-governance/REVIEW_LOGIN_AUDIT_2026-11-18.md`. User `admin@fdi.local` (director) tạo qua Supabase Auth Admin API + profile row; verify `signInWithPassword` HTTP 200, role=director.
- **Ghi chú P1**: mục §7 P1 "per-feature schemas/actions" mới chỉ **đáp ứng một phần — riêng Alerts** (đã DONE ở P2); các domain khác (customers/projects/devices/maintenance/reports) vẫn dùng `CrudPage.tsx` dùng chung. Chưa coi P1 hoàn tất.
