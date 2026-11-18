# FDI_Project — Project OPS v1.0

> Next.js 16 · TypeScript · Tailwind 4 · Supabase (Postgres 16) · Upstash Redis
> **Đang rewrite theo tài liệu v1.0** — xem [`docs/REWRITE_PLAN_v1_0.md`](docs/REWRITE_PLAN_v1_0.md).

## 📚 Tài liệu

Entrypoint duy nhất: [`docs/README.md`](docs/README.md). Các nhóm:

| Nhóm | Nội dung |
|---|---|
| `docs/00-entry/` | Tổng quan v1.0 |
| `docs/01-product/` | PRD, business rules, ERD, workflow, data dictionary |
| `docs/02-design/` | UI baseline (green), metric contract, design tokens |
| `docs/03-contracts/` | API, DB (`001_core.sql`, `002_extended.sql`) |
| `docs/04-governance/` | ADR, RBAC, release gate, traceability |
| `docs/05-quality/` | Integration status, UAT, RBAC policy |
| `docs/06-reference/` | Code mẫu/reference + archive (provenance) |

Plan rewrite: [`docs/REWRITE_PLAN_v1_0.md`](docs/REWRITE_PLAN_v1_0.md) — critique, P0 scope, kiến trúc, roadmap.

## Phát triển

```bash
npm install
cp .env.example .env.local   # Supabase URL/anon key; Upstash cho rate-limit
npm run dev                  # local dev
npm run check:docs           # guard: secret + version + link + JSON
npm run test                 # node:test
npm run build                # production (xem note RAM bên dưới)
```

> RAM sandbox ~1.4Gi → Turbopack build OOM. Build verified:
> `NEXT_PRIVATE_BUILD_WORKER=1 npx next build --webpack`.

## Cấu trúc code (đang chuyển theo schema v1.0)

- `app/(auth)/` — đăng nhập Supabase OIDC
- `app/(workspace)/` — AppShell green + dashboard + module CRUD theo scope
- `app/api/v1/` — dashboard read API (5 GET) + auth
- `components/` — UI semantic (token-driven), shell
- `lib/rbac/` — policy 6 role / 48 permission, deny-by-default + scope
- `lib/supabase/`, `lib/audit.ts`, `lib/rate-limit*.ts` — nền tảng đã verify
- `migrations/` — 001→005 (cũ) + `006_ops_core.sql` (schema/RLS mới theo docs)

## Nguyên tắc rewrite

1. Mọi query chịu customer scope — role grant **không** override scope.
2. Backend enforce RBAC; UI chỉ phản chiếu permission.
3. Không persist presentation-only KPI (ADR-009); metric thiếu baseline → `null` + `data_quality`, không số giả.
4. Không claim production-ready khi `docs/05-quality/INTEGRATION_STATUS.md` còn blocker.
5. Repo public — không commit `.env` (đã trong `.gitignore`).
