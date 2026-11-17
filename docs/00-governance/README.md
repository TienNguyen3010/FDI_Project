# 00-governance — Quản trị & bằng chứng

> ← [Index tổng `/docs`](../README.md)
> Phần này **chỉ** liệt kê các tài liệu thuộc nhóm governance. Các nhóm 01–05 xem tại index tổng.
> Cập nhật 2026-11-17 · Commit `8071a3a`.

## Danh mục nhóm

| Tài liệu | Vai trò |
|---|---|
| [EVIDENCE_REGISTER.md](EVIDENCE_REGISTER.md) | 23 dòng đối chiếu tài liệu v2 ↔ code/DB tại commit thật; phân loại VERIFIED / IMPLEMENTED_UNVERIFIED / GAP / CONFLICT |
| [CONTRADICTIONS_V2.md](CONTRADICTIONS_V2.md) | 15 mâu thuẫn nội bộ giữa 11 tài liệu v2; mỗi dòng có `file:section` + cột **DD Decision** |
| [DD_DECISIONS_P0.md](DD_DECISIONS_P0.md) | **8/8 mâu thuẫn P0 đã chốt** bởi Dev Director — 7 sửa spec cho khớp code/DB, 1 (`/api/v1` alias) đã implement & verify |
| [checklist.md](checklist.md) | Tiến độ code theo ✅/❌/⏳ + **Nhật ký xác minh (§12)** với bằng chứng tool thật |
| [SPEC_REALITY_CHECK.md](SPEC_REALITY_CHECK.md) | Evidence & discrepancy register v2 — đọc kèm `EVIDENCE_REGISTER.md` để có SHA thật |

## Quy ước governance

- **Nguồn gốc:** 11 tài liệu v2.0. Bản v1 của `api_spec.md`, `roadmap.md`, `checklist.md` vẫn được giữ vì v2 còn trích dẫn.
- **Hierarchy bằng chứng:** `runtime verification @ SHA` > `test log` > `code inspection @ SHA` > `spec` > `release-note assertion`.
- **Legend:** ✅ = verified bằng tool · ❌ = có bằng chứng chưa đạt · ⏳ = chưa làm/chưa xác minh. ✅ ở checklist **không** đồng nghĩa `Verified/UAT/Released` theo pipeline của `README.md` gốc.
- **Khi spec mâu thuẫn code/migration đã chạy thật:** lấy evidence + DD decisions làm override; không tự sửa DB đã apply.

> Schema DB: [`../../database_schema.sql`](../../database_schema.sql) · Migrations: [`../../migrations/README.md`](../../migrations/README.md).
