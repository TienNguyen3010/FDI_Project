# Project OPS — Tài liệu kỹ thuật & contract v1.5

> **Entrypoint duy nhất cho dev.** Bắt đầu từ đây. Mọi bản README cũ (v1.1–v1.4) đã bị xóa theo quyết định dùng `README_v1_5.md` làm chuẩn.

## 1. Đọc gì trước (thứ tự ưu tiên)

| Thứ tự | File | Dùng để |
|---|---|---|
| 1 | [`00-entry/README_v1_5.md`](00-entry/README_v1_5.md) | Tổng quan v1.5 + phạm vi reference |
| 2 | [`05-quality/INTEGRATION_STATUS_v1_5.md`](05-quality/INTEGRATION_STATUS_v1_5.md) | **Release blockers** — đọc trước khi code |
| 3 | [`01-product/PRD_v1.1.md`](01-product/PRD_v1.1.md) + [`01-product/BUSINESS_RULES.md`](01-product/BUSINESS_RULES.md) | Yêu cầu & luật business (nguồn truth cao nhất); file v1.1 có override v1.4 ở đầu |
| 4 | [`03-contracts/API_SPEC.md`](03-contracts/API_SPEC.md) + [`03-contracts/database/`](03-contracts/database/) | API & DB contract |
| 5 | [`02-design/DESIGN_BASELINE_v1.4.md`](02-design/DESIGN_BASELINE_v1.4.md) + [`02-design/assets/tokens.json`](02-design/assets/tokens.json) | UI baseline đang approved |

## 2. Cấu trúc thư mục

```
docs/
├── README.md                    # ← bạn đang đọc: entrypoint + điều hướng
├── 00-entry/                    # Tổng quan phiên bản hiện hành (v1.5)
├── 01-product/                  # PRD, business rules, ERD, workflow, data dictionary
├── 02-design/                   # UI baseline v1.4, metric contract, Figma spec, screenshots
│   └── assets/                  # tokens.json, navigation.json, ui_traceability.csv
├── 03-contracts/                # Kỹ thuật & hợp đồng dữ liệu
│   ├── api/                     # OpenAPI (v1.5 executable + v1.2 baseline)
│   └── database/                # SQL migration 001/002
├── 04-governance/               # ADR, RBAC, release gate, traceability, checklist, playbook
├── 05-quality/                  # Integration status, UAT, test evidence, reports
└── 06-reference/                # Code mẫu chạy được (reference, KHÔNG production)
    ├── app.py, requirements.txt, test_dashboard.py
    └── archive/                 # Bản đã superseded — chỉ đọc khi cần truy vết
```

**Nguyên tắc:** entrypoint ở `README.md` · file active giữ nguyên tên · bản cũ vào `_progress/archive/` · assets design tách riêng · contract API/DB nằm cùng nhóm `03-contracts`.

## 3. Ma trận ưu tiên triển khai

| Mức | Nội dung | Trạng thái |
|---|---|---|
| **P0** | `01-product/` (PRD + business rules) · `03-contracts/` (API + DB) · `04-governance/RBAC_MATRIX.md` · `05-quality/INTEGRATION_STATUS_v1_5.md` | Cần đọc + resolve blocker trước khi code |
| **P1** | `02-design/` (baseline v1.4 + tokens) · `04-governance/` (ADR, traceability, release gate) · `05-quality/` (UAT, rbac_policy) | Cần cho UI/QA, còn gate mở |
| **P2** | `06-reference/` (app.py, tests) · `06-reference/archive/` | Reference/truy vết; không dùng làm production |

## 4. Điểm sạch / Điểm cần làm rõ

**Điểm sạch (đã rõ ràng, dev có thể bám):**
- Entry point duy nhất = file này + `00-entry/README_v1_5.md`.
- Baseline UI đang approved = `DESIGN_BASELINE_v1.4.md` + `design_reference_approved_v1.4.png` (green sidebar, **supersedes v1.3**).
- API dashboard 5 GET = `03-contracts/api/dashboard_openapi_v1_5_executable.json` (sinh từ `../06-reference/app.py`).
- API nền = `03-contracts/api/openapi_v1_2.yaml`; validation hiện hành = `05-quality/validation_report.json`.
- 0 secret/credential trong bundle (đã audit 2 lớp); không có file `.env`.

**Điểm cần làm rõ (chưa được quyết — KHÔNG tự bịa trong code):**
- Auth production: hiện là `x-user-id` test stub → cần OIDC/JWT + RBAC thật.
- Chưa từng chạy PostgreSQL integration/migration test (mới SQLite fixture).
- OpenAPI mới phủ 5 endpoint dashboard, chưa full platform.
- SLA calendars / timezone / escalation còn minh họa.
- Figma mới 1/8 màn hình, chưa pixel-perfect, chưa a11y/mobile.
- Chưa E2E / perf / security test production-like.

## 5. Quy ước cập nhật

- Khi thêm spec mới: đặt vào đúng nhóm ở mục 2, **không tạo README riêng**.
- Khi có bản mới thay thế: `git mv` bản cũ vào `06-reference/archive/`, giữ lịch sử git.
- Mọi thay đổi contract (API/DB/RBAC) phải cập nhật `04-governance/TRACEABILITY_MATRIX.md` trong cùng commit.
- Không claim production-ready khi `05-quality/INTEGRATION_STATUS_v1_5.md` còn liệt kê blocker.
