# 📁 FDI Project Management – Project Structure

> 📁 **Vị trí tài liệu:** file này nằm trong `docs/` (di chuyển từ repo root ngày 2026-11-17).
> Các tham chiếu dạng `ten_file.md:line` trong nội dung bên dưới đều chỉ tới các file cùng thư mục `docs/`.


> Phiên bản 1.0 · Dành cho group devops & frontend  
> Ngôn ngữ: Tiếng Việt · Không chứa code

---

## 1. Mục đích

Tổ chức thư mục dự án rõ ràng để dễ mở rộng, deploy, và maintain.

---

## 2. Cấu trúc thư mục thực tế (monorepo Next.js 16)

> Cập nhật 2026-11-17: dự án là **một** Next.js app, KHÔNG tách `backend/` + `frontend/`.
> Toàn bộ tài liệu `.md` (trừ README root, AGENTS.md và migrations/README.md) nằm trong `docs/`.

```
FDI_Project/
├── README.md                 # Entry point + link tới docs/
├── AGENTS.md                 # Next.js 16 tự sinh (giữ ở root)
├── .env.example              # Placeholder env (Supabase + Upstash)
├── database_schema.sql       # Lược đồ CSDL thiết kế
│
├── docs/                     # 📚 TOÀN BỘ TÀI LIỆU
│   ├── README.md             # Index tài liệu
│   ├── product.md            # PRD
│   ├── checklist.md          # Checklist tiến độ + nhật ký xác minh
│   ├── roadmap.md            # Lộ trình Bản 1/2/3
│   ├── ui_ux_spec.md         # Giao diện & component
│   ├── rbac_matrix.md        # Ma trận phân quyền
│   ├── tech_spec.md          # Kiến trúc & công nghệ
│   ├── api_spec.md           # API specification
│   ├── project_structure.md  # File này
│   └── SPEC_REALITY_CHECK.md # Đối chiếu spec vs code thật
│
├── app/                      # Next.js App Router
│   ├── dashboard/, login/    # Trang chính & đăng nhập
│   ├── customers/, projects/, devices/,
│   │   alerts/, maintenance/, reports/, admin/   # 7 module CRUD
│   ├── api/auth/             # Auth routes
│   ├── layout.tsx, globals.css
│
├── components/
│   ├── ui/ui.tsx             # UI library (Button/Input/Card/Table/Badge/Modal...)
│   ├── crud/CrudPage.tsx     # CRUD dùng chung cho 7 module
│   └── ClientBody.tsx        # Sidebar + header + logout
│
├── lib/
│   ├── supabase/             # Client lazy (server + shared)
│   ├── hooks/useProfile.ts   # RBAC mềm (role/team)
│   ├── audit.ts              # Ghi audit_logs
│   ├── rate-limit.ts         # Sliding window in-memory (fallback)
│   ├── rate-limit-redis.ts   # Upstash Redis Lua atomic (chính)
│   ├── types.ts, utils.ts, cookies.ts
│
├── migrations/               # SQL chạy tuần tự 001→004
│   ├── 001_initial_schema.sql
│   ├── 002_rls_policies.sql
│   ├── 003_seed.sql
│   ├── 004_audit_trigger.sql
│   └── README.md             # Hướng dẫn chạy (giữ cạnh migration)
│
├── public/                   # Static assets
├── package.json, package-lock.json
├── next.config.ts, tsconfig.json, eslint.config.mjs
└── proxy.ts                  # Edge proxy (thay middleware.ts, Next 16)
```

---

## 2. Quy ước

| Mục | Quy ước |
|---|---|
| Tên thư mục | Lowercase, underscore |
| Tên file | kebab-case |
| Branch | feat/feature-x, bugfix/x, release/x |
| Commit | Conventional Commits |
| Version | Semantic versioning |
| Deploy | CI/CD, staging → production |

---

## 3. Checklist thiết lập repo

- [ ] `.gitignore` (node_modules, env, database)
- [ ] `package.json` (scripts)
- [ ] README (overview, setup, deploy)
- [ ] API docs (Swagger/OpenAPI)
- [ ] Database migration folder
- [ ] Seed folder
- [ ] Test folder
- [ ] CI/CD config
- [ ] Environment variables (.env.example)
- [ ] Security config (rate limit, RBAC, audit)

---

## 4. Giới hạn & Best Practice

- Không lưu mật khẩu, IP quản trị, thông tin truy cập vào DB
- Không commit `.env`
- Phân quyền rõ ràng, audit log
- Backup & restore định kỳ

---
