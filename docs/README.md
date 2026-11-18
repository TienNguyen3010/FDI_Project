# 📚 FDI_Project — Documentation Hub

> Entry point cho toàn bộ tài liệu. Phiên bản baseline **v2.0** (11 tài liệu gốc).
> Trạng thái: Proposed — **không phải bằng chứng triển khai** · Cập nhật 2026-11-18 · HEAD `5b32909` (+ working tree chưa commit).
>
> 🔎 Đọc trước khi code: [EVIDENCE_REGISTER.md](00-governance/EVIDENCE_REGISTER.md) ·
> [CONTRADICTIONS_V2.md](00-governance/CONTRADICTIONS_V2.md) ·
> [**DD_DECISIONS_P0.md**](00-governance/DD_DECISIONS_P0.md) — **8/8 P0 đã chốt & đã áp vào 7 spec v2**.
>
> ✅ Verify mới nhất (2026-11-18): `tsc` 0 · `lint` 0 · `npm test` **23/23** · `next build --webpack` ✓ 21 routes — xem [checklist §12](00-governance/checklist.md). Refactor: W0 xong (`5b32909`), `/api/v1` alias xong (`167a674`), P2 (tách `features/alerts/`) xong nhưng chưa commit — xem [project_structure §10](03-architecture/project_structure.md).

## Cấu trúc 6 nhóm

| Nhóm | Nội dung | Index |
|---|---|---|
| **00-governance** | README hub, evidence, contradictions, DD decisions, checklist, reality check | [xem](00-governance/README.md) |
| **01-product** | PRD, roadmap, ownership, user guide | [product.md](01-product/product.md) · [PRD_OWNERSHIP.md](01-product/PRD_OWNERSHIP.md) · [roadmap.md](01-product/roadmap.md) · [USER_GUIDE.md](01-product/USER_GUIDE.md) |
| **02-design** | UI/UX spec, wireframe | [ui_ux_spec.md](02-design/ui_ux_spec.md) · [DESIGN_WIREFRAMES.md](02-design/DESIGN_WIREFRAMES.md) |
| **03-architecture** | Tech spec, structure review, API contract | [tech_spec.md](03-architecture/tech_spec.md) · [project_structure.md](03-architecture/project_structure.md) · [api_spec.md](03-architecture/api_spec.md) |
| **04-security** | RBAC matrix, backup/restore | [rbac_matrix.md](04-security/rbac_matrix.md) · [BACKUP_RESTORE.md](04-security/BACKUP_RESTORE.md) |
| **05-release** | Release notes, CI mẫu | [RELEASE_NOTES.md](05-release/RELEASE_NOTES.md) · [ci.yml](05-release/examples/ci.yml) |

## Nguyên tắc

- 11 tài liệu v2 là **nguồn gốc duy nhất**; bản v1 chỉ giữ `api_spec.md`, `roadmap.md`, `checklist.md` vì v2 còn trích dẫn.
- Khi spec mâu thuẫn code/migration đã chạy thật → lấy evidence (`00-governance/EVIDENCE_REGISTER.md`) + quyết định (`00-governance/DD_DECISIONS_P0.md`).
- Legend: ✅ = verified bằng tool · ❌ = có bằng chứng chưa đạt · ⏳ = chưa làm/chưa xác minh.

Schema DB: [`../database_schema.sql`](../database_schema.sql) · Migrations: [`../migrations/README.md`](../migrations/README.md).
