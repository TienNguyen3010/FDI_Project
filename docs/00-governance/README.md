# 00-governance — Quản trị & bằng chứng

> ← [Index tổng `/docs`](../README.md) · Phần này liệt kê chi tiết nhóm governance.

> **Nguồn gốc:** 11 tài liệu v2.0. Bản v1 chỉ giữ `api_spec.md`, `roadmap.md`, `checklist.md` vì v2 còn trích dẫn.
> Trạng thái: Proposed baseline — **không phải bằng chứng triển khai** · Cập nhật 2026-11-17 · Commit `6be8437`.
>
> 🔎 Đọc trước khi code: [EVIDENCE_REGISTER.md](EVIDENCE_REGISTER.md) (đối chiếu v2 ↔ code/DB) ·
> [CONTRADICTIONS_V2.md](CONTRADICTIONS_V2.md) (15 mâu thuẫn) ·
> [**DD_DECISIONS_P0.md**](DD_DECISIONS_P0.md) (**8 P0 đã chốt bởi Dev Director**).

---

## 00-governance — quản trị & bằng chứng
| Tài liệu | Vai trò |
|---|---|
| [EVIDENCE_REGISTER.md](EVIDENCE_REGISTER.md) | 23 dòng đối chiếu tại SHA thật, phân loại VERIFIED/GAP/CONFLICT |
| [CONTRADICTIONS_V2.md](CONTRADICTIONS_V2.md) | 15 mâu thuẫn nội bộ, cột DD Decision cho cả 15 dòng |
| [DD_DECISIONS_P0.md](DD_DECISIONS_P0.md) | **Quyết định chốt 8 P0** (7 sửa spec khớp code/DB, 1 cần implement `/api/v1`) |
| [checklist.md](checklist.md) | Tiến độ code ✅/❌/⏳ + Nhật ký xác minh (§12) |

## 01-product — sản phẩm & yêu cầu
| Tài liệu | Vai trò |
|---|---|
| [product.md](../01-product/product.md) | PRD v2.0 — why/who/what/priority/AC |
| [PRD_OWNERSHIP.md](../01-product/PRD_OWNERSHIP.md) | Owner, RACI, AC, test plan, decision/risk register |
| [roadmap.md](../01-product/roadmap.md) | Lộ trình v1 (Bản 1/2/3) — v2 còn trích |
| [USER_GUIDE.md](../01-product/USER_GUIDE.md) | Hướng dẫn 4 role — chỉ dùng tính năng Verified |

## 02-design — thiết kế
| Tài liệu | Vai trò |
|---|---|
| [ui_ux_spec.md](../02-design/ui_ux_spec.md) | UI/UX v2.0 — tokens, component contract, QA matrix |
| [DESIGN_WIREFRAMES.md](../02-design/DESIGN_WIREFRAMES.md) | UX flow + wireframe (không phải Figma/chạy thật) |

## 03-architecture — kiến trúc & contract
| Tài liệu | Vai trò |
|---|---|
| [tech_spec.md](../03-architecture/tech_spec.md) | Tech v2.1 — single-org, KHÔNG SaaS/multi-tenant |
| [project_structure.md](../03-architecture/project_structure.md) | Structure review v2 — cây đề xuất |
| [api_spec.md](../03-architecture/api_spec.md) | API v1 — ⚠️ `/api/v1` chưa hiện thực (DD C-09) |

## 04-security — bảo mật & vận hành
| Tài liệu | Vai trò |
|---|---|
| [rbac_matrix.md](../04-security/rbac_matrix.md) | RBAC & data scope v2.0 — DEC-02/03/04 chốt tại DD |
| [BACKUP_RESTORE.md](../04-security/BACKUP_RESTORE.md) | pg_dump/restore — chưa drill thật (§3 #7 ⏳) |

## 05-release — phát hành
| Tài liệu | Vai trò |
|---|---|
| [RELEASE_NOTES.md](../05-release/RELEASE_NOTES.md) | Release gate + candidate scope — NO-GO pending evidence |
| [examples/ci.yml](../05-release/examples/ci.yml) | Mẫu GitHub Actions — chưa enable (PAT thiếu scope `workflow`) |

---

## Hierarchy bằng chứng & legend
`runtime verification @ SHA` > `test log` > `code inspection @ SHA` > `spec` > `release-note assertion`.

✅ = verified bằng tool · ❌ = có bằng chứng chưa đạt · ⏳ = chưa làm/chưa xác minh. ⚠️ ✅ checklist **không** đồng nghĩa `Verified/UAT/Released` (xem C-08/C-15 trong [CONTRADICTIONS_V2.md](CONTRADICTIONS_V2.md)).

Schema DB: [`../../database_schema.sql`](../../database_schema.sql) · Migrations: [`../../migrations/README.md`](../../migrations/README.md).
