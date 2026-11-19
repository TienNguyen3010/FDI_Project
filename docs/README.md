# Project OPS — Tài liệu kỹ thuật & contract v1.0

> **Entrypoint duy nhất cho dev.** Đây là **phiên bản 1 đầu tiên** của hệ tài liệu Project OPS (v1.0). Mọi suffix phiên bản kế thừa từ bundle gốc đã được bỏ; nguồn gốc được ghi tại mục 6.

## 1. Đọc gì trước (thứ tự ưu tiên)

| Thứ tự | File | Dùng để |
|---|---|---|
| 1 | [`00-entry/README.md`](00-entry/README.md) | Tổng quan v1.0 + phạm vi reference |
| 2 | [`05-quality/INTEGRATION_STATUS.md`](05-quality/INTEGRATION_STATUS.md) | **Release blockers** — đọc trước khi code |
| 3 | [`01-product/PRD.md`](01-product/PRD.md) + [`01-product/BUSINESS_RULES.md`](01-product/BUSINESS_RULES.md) | Yêu cầu & luật business (nguồn truth cao nhất) |
| 4 | [`03-contracts/API_SPEC.md`](03-contracts/API_SPEC.md) + [`03-contracts/database/`](03-contracts/database/) | API & DB contract |
| 5 | [`02-design/DESIGN_BASELINE.md`](02-design/DESIGN_BASELINE.md) + [`02-design/assets/tokens.json`](02-design/assets/tokens.json) | UI baseline đang approved |
| 6 | [`02-design/CREATE_CUSTOMER_COMPONENTS_STANDARD.md`](02-design/CREATE_CUSTOMER_COMPONENTS_STANDARD.md) + [`04-governance/CREATE_CUSTOMER_PLAN.md`](04-governance/CREATE_CUSTOMER_PLAN.md) | Standard + plan màn "Thêm khách hàng" (Phase 1) |

## 2. Cấu trúc thư mục

```
docs/
├── README.md                    # ← bạn đang đọc: entrypoint + điều hướng
├── 00-entry/                    # Tổng quan phiên bản hiện hành (v1.0)
├── 01-product/                  # PRD, business rules, ERD, workflow, data dictionary
├── 02-design/                   # UI baseline, metric contract, Figma spec, screenshots
│   └── assets/                  # tokens.json, navigation.json, ui_traceability.csv
├── 03-contracts/                # Kỹ thuật & hợp đồng dữ liệu
│   ├── api/                     # OpenAPI (executable + baseline)
│   └── database/                # SQL migration 001/002
├── 04-governance/               # ADR, RBAC, release gate, traceability, checklist, playbook
├── 05-quality/                  # Integration status, UAT, test evidence, reports
└── 06-reference/                # Code mẫu chạy được (reference, KHÔNG production)
    ├── app.py, requirements.txt, test_dashboard.py
    └── archive/                 # Snapshot gốc (bản cũ + Figma sync v1.5) — chỉ đọc khi cần truy vết
```

**Nguyên tắc:** entrypoint ở `README.md` · tên file active **không có suffix version** · bản cũ/snapshot gốc vào `06-reference/archive/` (giữ nguyên tên gốc để truy vết) · assets design tách riêng · contract API/DB nằm cùng nhóm `03-contracts`.

## 3. Ma trận ưu tiên triển khai

| Mức | Nội dung | Trạng thái |
|---|---|---|
| **P0** | `01-product/` (PRD + business rules) · `03-contracts/` (API + DB) · `04-governance/RBAC_MATRIX.md` · `05-quality/INTEGRATION_STATUS.md` | Cần đọc + resolve blocker trước khi code |
| **P1** | `02-design/` (baseline + tokens) · `04-governance/` (ADR, traceability, release gate) · `05-quality/` (UAT, rbac_policy) | Cần cho UI/QA, còn gate mở |
| **P2** | `06-reference/` (app.py, tests) · `06-reference/archive/` | Reference/truy vết; gồm Figma sync v1.5 (đang dẫn chiếu) + bản cũ; không dùng làm production |

## 4. Điểm sạch / Điểm cần làm rõ

**Điểm sạch (đã rõ ràng, dev có thể bám):**
- Entry point duy nhất = file này + `00-entry/README.md`; toàn bộ active dùng version **v1.0**.
- Baseline UI approved = `DESIGN_BASELINE.md` + `design_reference_approved.png` (green sidebar, supersedes legacy baseline).
- API dashboard 5 GET = `03-contracts/api/dashboard_openapi_executable.json` (sinh từ `06-reference/app.py`).
- API nền = `03-contracts/api/openapi.yaml`; validation hiện hành = `05-quality/validation_report.json`.
- 0 secret/credential (đã audit 2 lớp); không có file `.env`.

**Điểm cần làm rõ (chưa được quyết — KHÔNG tự bịa trong code):**
- Auth production: hiện là `x-user-id` test stub → cần OIDC/JWT + RBAC thật.
- Chưa từng chạy PostgreSQL integration/migration test (mới SQLite fixture).
- OpenAPI mới phủ 5 endpoint dashboard, chưa full platform.
- SLA calendars / timezone / escalation còn minh họa.
- Figma mới 1/8 màn hình, chưa pixel-perfect, chưa a11y/mobile.
- Chưa E2E / perf / security test production-like.

## 5. Quy ước cập nhật

- Khi thêm spec mới: đặt vào đúng nhóm ở mục 2, **không tạo README riêng**, không thêm suffix version vào tên file active.
- Khi có bản mới thay thế: `git mv` bản cũ vào `06-reference/archive/`, giữ lịch sử git.
- Mọi thay đổi contract (API/DB/RBAC) phải cập nhật `04-governance/TRACEABILITY_MATRIX.md` trong cùng commit.
- **Checklist duy nhất:** `04-governance/CHECKLISTS.md`. Mọi thay đổi code (`app/`, `components/`, `lib/`, `migrations/`) hoặc docs phải cập nhật mốc tương ứng trong file này **trong cùng commit** — CI guard (`node scripts/docs-check.mjs`, env `CHECKLIST_BASE`) chặn commit/thiếu cập nhật. Không tạo checklist riêng ở file khác; bản cũ chỉ được archive kèm note trỏ về đây.
- Không claim production-ready khi `05-quality/INTEGRATION_STATUS.md` còn liệt kê blocker.

## 6. Provenance (nguồn gốc)

Hệ tài liệu v1.0 được chuyển đổi từ `Project_OPS_Specification_Technical_Contracts_v1.5.zip` (ngày 2026-11-18). Các suffix gốc đã được ánh xạ:

| Tên gốc | Tên v1.0 |
|---|---|
| `README_v1_5.md` | `00-entry/README.md` |
| `PRD_v1.1.md` | `01-product/PRD.md` |
| `DESIGN_BASELINE_v1.4.md` | `02-design/DESIGN_BASELINE.md` |
| `DASHBOARD_METRIC_CONTRACT_v1.4.md` | `02-design/DASHBOARD_METRIC_CONTRACT.md` |
| `dashboard_openapi_v1_5_executable.json` | `03-contracts/api/dashboard_openapi_executable.json` |
| `openapi_v1_2.yaml` | `03-contracts/api/openapi.yaml` |
| `INTEGRATION_STATUS_v1_5.md` | `05-quality/INTEGRATION_STATUS.md` |
| `validation_report_v1_4.json` | `06-reference/archive/validation_report_legacy.json` |
| `REWRITE_PLAN_v1_0.md` | `06-reference/archive/REWRITE_PLAN_v1_0.md` |
| `checklist.md` | `06-reference/archive/checklist_legacy.md` |

Bản cũ (v1.1/v1.2/v1.3/v1.4) và `FIGMA_SYNC_v1_5.md` (artifact sync mới nhất, vẫn được `00-entry/README.md` dẫn chiếu) được giữ nguyên tên trong `06-reference/archive/` để truy vết — **không** mang version v1.0.
