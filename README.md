# FDI_Project — Quản lý dự án, vận hành, sự cố & Site Report

> Next.js 16 · TypeScript · Tailwind 4 · Supabase · Upstash Redis
> Phiên bản 1.0 — Bản 1 (MVP) đã build xanh.

## 📚 Tài liệu
Tất cả tài liệu thiết kế, checklist và báo cáo được gom trong [`docs/`](docs/README.md):

- [Checklist tiến độ](docs/checklist.md) — trạng thái ✅/❌/⏳ + nhật ký xác minh bằng tool thật
- [Product / PRD](docs/product.md) · [Roadmap](docs/roadmap.md) · [UI/UX](docs/ui_ux_spec.md)
- [RBAC matrix](docs/rbac_matrix.md) · [Tech spec](docs/tech_spec.md) · [API spec](docs/api_spec.md)
- [SPEC_REALITY_CHECK](docs/SPEC_REALITY_CHECK.md) — đối chiếu tài liệu vs code thật
- Schema CSDL: [`database_schema.sql`](database_schema.sql) · Migrations: [`migrations/`](migrations/README.md)

## How to develop
```bash
npm install
cp .env.example .env.local   # điền Supabase URL/anon key; Upstash URL/token cho rate-limit
npm run dev                  # local dev server
npm run build                # production build
npm run start                # production server
npm run lint                 # eslint
```

## Cấu trúc
- `app/` — routes: dashboard, login, 7 module CRUD, API auth
- `components/` — UI library + CrudPage + ClientBody (sidebar/header)
- `lib/` — Supabase client, hooks, types, audit, rate-limit
- `migrations/` — SQL 001→004 (schema, RLS, seed, audit trigger)
- `docs/` — toàn bộ tài liệu (xem index ở trên)

## Notes
- Vercel tự detect Next.js (`npm run build` → `npm run start`).
- Build không cần credential thật (Supabase client lazy); runtime cần env.
- Rate-limit dùng Upstash Redis; nếu thiếu env vẫn chạy soft-limit per-instance.
- Repo public — không commit `.env` (đã có trong `.gitignore`).
