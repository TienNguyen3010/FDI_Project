# 📚 FDI_Project — Documentation Hub (v2.0 baseline)

> **Nguồn gốc duy nhất:** 11 tài liệu v2.0 liệt kê dưới đây. Bản v1 không còn được duy trì;
> chỉ giữ `api_spec.md`, `roadmap.md`, `checklist.md` vì v2 còn trích dẫn.
>
> **Trạng thái:** Proposed baseline — **không phải bằng chứng đã triển khai**.
> Cập nhật: 2026-11-17 · Commit: `29dc349` · Owner: TBD.
>
> 🔎 **Đọc trước khi code:** [EVIDENCE_REGISTER.md](EVIDENCE_REGISTER.md) (đối chiếu v2 với code/DB thật tại SHA `29dc349`) và [CONTRADICTIONS_V2.md](CONTRADICTIONS_V2.md) (15 mâu thuẫn cần PO/Tech Lead chốt).

---

## 1. Bắt đầu từ đây

| # | Tài liệu | Vai trò |
|---|---|---|
| 1 | [SPEC_REALITY_CHECK.md](SPEC_REALITY_CHECK.md) | Evidence/discrepancy register (v2) — đọc kèm `EVIDENCE_REGISTER.md` để có SHA thật |
| 2 | [RELEASE_NOTES.md](RELEASE_NOTES.md) | Release gate + candidate scope (v2) — hiện NO-GO pending evidence |
| 3 | [USER_GUIDE.md](USER_GUIDE.md) | Hướng dẫn theo 4 role — chỉ dùng tính năng đã Verified |
| 4 | [DESIGN_WIREFRAMES.md](DESIGN_WIREFRAMES.md) | UX flow + wireframe (không phải file Figma/chạy thật) |

## 2. Sản phẩm & yêu cầu

| Tài liệu | Vai trò |
|---|---|
| [product.md](product.md) | PRD v2.0 — why/who/what/priority/acceptance |
| [PRD_OWNERSHIP.md](PRD_OWNERSHIP.md) | Owner, RACI, AC, test plan, decision/risk register |
| [roadmap.md](roadmap.md) | Lộ trình v1 (Bản 1/2/3) — v2 còn trích dẫn, chưa thay |

## 3. Thiết kế & kỹ thuật

| Tài liệu | Vai trò |
|---|---|
| [ui_ux_spec.md](ui_ux_spec.md) | UI/UX v2.0 — tokens, component contract, QA matrix |
| [tech_spec.md](tech_spec.md) | Tech v2.1 — single-org, KHÔNG SaaS/multi-tenant |
| [project_structure.md](project_structure.md) | Structure review v2 — cấu trúc đề xuất, chưa relocate |
| [api_spec.md](api_spec.md) | API contract v1 — ⚠️ `/api/v1` chưa hiện thực (xem C-09) |

## 4. Bảo mật & vận hành

| Tài liệu | Vai trò |
|---|---|
| [rbac_matrix.md](rbac_matrix.md) | RBAC & data scope v2.0 — proposed, 10 blockers |
| [BACKUP_RESTORE.md](BACKUP_RESTORE.md) | Quy trình pg_dump/restore — chưa drill thật (§3 #7 ⏳) |

## 5. Governance & evidence (lớp bổ sung)

| Tài liệu | Vai trò |
|---|---|
| [EVIDENCE_REGISTER.md](EVIDENCE_REGISTER.md) | 23 dòng đối chiếu v2 ↔ code/DB tại SHA `29dc349` |
| [CONTRADICTIONS_V2.md](CONTRADICTIONS_V2.md) | 15 mâu thuẫn nội bộ + câu hỏi cho PO/Tech Lead |
| [checklist.md](checklist.md) | Tiến độ code theo ✅/❌/⏳ + Nhật ký xác minh (§12) |
| [examples/ci.yml](examples/ci.yml) | Mẫu GitHub Actions — chưa enable (PAT thiếu scope `workflow`) |

---

## 6. Hierarchy bằng chứng (theo README v2 §3)

`runtime verification @ SHA` > `test log` > `code inspection @ SHA` > `spec` > `assertion in release notes`.

**Legend checklist (giữ theo yêu cầu):** ✅ = verified bằng tool · ❌ = có bằng chứng chưa đạt · ⏳ = chưa làm/chưa xác minh.
⚠️ ✅ ở checklist **không** đồng nghĩa `Verified/UAT Accepted/Released` theo pipeline của README v2 §4 — xem bảng đối chiếu 3 pipeline trong [CONTRADICTIONS_V2.md §C-08/C-15](CONTRADICTIONS_V2.md).

## 7. Quy tắc cập nhật

- 11 file v2 là nguồn; thay đổi phải review impact across PRD/API/RBAC/UI/DB/User Guide.
- Mọi tài liệu ghi rõ: owner, reviewer, revision, ngày, source commit, environment, evidence, approval state.
- Không tự nâng trạng thái phát hành; NO-GO vẫn giữ đến khi đủ 11 gate trong `RELEASE_NOTES.md §3`.

> Schema DB nằm ở [`../database_schema.sql`](../database_schema.sql) và migrations tại [`../migrations/`](../migrations/README.md) (ngoài `/docs`).
