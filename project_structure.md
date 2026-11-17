# 📁 FDI Project Management – Project Structure

> Phiên bản 1.0 · Dành cho group devops & frontend  
> Ngôn ngữ: Tiếng Việt · Không chứa code

---

## 1. Mục đích

Tổ chức thư mục dự án rõ ràng để dễ mở rộng, deploy, và maintain.

---

## 2. Cấu trúc thư mục gợi ý

```
FDI Project Management/
├── README.md                          # Tóm tắt, mô tả
├── product.md                         # PRD
├── checklist.md                       # Checklist phát triển
├── database_schema.sql                # Lược đồ CSDL
├── ui_ux_spec.md                      # Giao diện & component
├── rbac_matrix.md                     # Bảng phân quyền
├── tech_spec.md                       # Kiến trúc & công nghệ
├── api_spec.md                        # API specification
├── roadmap.md                         # Lộ trình phát triển
├── project_structure.md               # Cấu trúc thư mục
│
├── backend/                           # API server, business logic
│   ├── src/
│   │   ├── controllers/               # Controller
│   │   ├── services/                  # Business logic
│   │   ├── models/                    # Database models
│   │   ├── middlewares/               # Auth, RBAC, error
│   │   ├── routes/                    # API routes
│   │   ├── utils/                     # Helpers
│   │   └── config/                    # Config
│   ├── tests/
│   ├── migrations/                    # DB migrations
│   ├── seeders/                       # Seed data
│   ├── package.json
│   └── README.md
│
├── frontend/                          # Web UI
│   ├── src/
│   │   ├── components/                # Reusable UI
│   │   ├── pages/                     # Routes
│   │   ├── hooks/                     # React hooks
│   │   ├── services/                  # API calls
│   │   ├── store/                     # State (Redux/Zustand)
│   │   ├── utils/
│   │   └── config/
│   ├── public/
│   ├── tests/
│   ├── package.json
│   └── README.md
│
├── docs/                              # Additional docs
│   ├── design/                        # Figma link, screenshots
│   └── api/                           # API docs
│
├── .gitignore
├── package.json
└── README.md
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
