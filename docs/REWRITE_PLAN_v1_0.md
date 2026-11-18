# Rewrite Plan v1.0 — Dự án Project OPS

> **Trạng thái:** CRITIQUE + OPTIMIZE + PLAN đã chốt bởi Dev Director. Đây là tài liệu điều phối rewrite toàn bộ `FDI_Project` từ `/docs` (bản v1.0). Mọi quyết định dưới đây có evidence từ docs; không suy diễn ngoài tài liệu.

## 1. ĐIỂM SẠCH ( evidence rõ, dùng làm nền )

| Nhóm | Kết luận | Evidence |
|---|---|---|
| Stack | Next.js 16 + TypeScript + Supabase (Postgres 16), OIDC + RBAC + resource scope, modular monolith | `03-contracts/TECH_SPEC.md:40` (ADR-002/005), `.env.example` (NEXT_PUBLIC_SUPABASE_*) |
| Domain | Single-company, multi-customer, **KHÔNG** SaaS multi-tenant; mọi query chịu customer scope | `04-governance/ADR.md:9-10`, `01-product/PRD.md` |
| Schema lõi | 13 bảng: customers, sites, projects, project_sites, locations, assets, asset_placements, asset_replacements, services, configuration_items, service_ci, ci_relations, diagrams, diagram_versions, diagram_nodes, tickets, ticket_events, outbox_events | `03-contracts/database/001_core.sql:4-24` |
| Dashboard | 5 GET: summary, ticket-status, incidents, ticket-trend, (health) — metric có `as_of`, `effective_scope`, scope filter | `03-contracts/api/dashboard_openapi_executable.json`, `05-quality/INTEGRATION_STATUS.md:14-22` |
| Metric | `sla_risk` **KHÔNG** phải ticket status; donut status mutually exclusive; weighted progress theo baseline | `02-design/assets/tokens.json:53`, `05-quality/INTEGRATION_STATUS.md:19-22` |
| Design token | Green sidebar `#008B21`/`#07872B`, primary `#087F30`, canvas `#F7FAFC`; IPC KPI giữ nguyên gradient | `02-design/assets/tokens.json:4-25`, ADR-008 `04-governance/ADR.md:4` |
| RBAC | 6 role × ~46 permission, matrix machine-readable | `05-quality/rbac_matrix.csv`, `05-quality/rbac_policy.json` |
| UI baseline | `DESIGN_BASELINE.md` + `design_reference_approved.png` (approved, green sidebar) | `02-design/DESIGN_BASELINE.md:3` |

## 2. ĐIỂM CẦN LÀM RÕ / MÂU THUẨN (chốt P0 để giải quyết)

| Vấn đề | Quyết định Dev Director | Lý do / evidence |
|---|---|---|
| Spec là **proposed**, nhiều ADDR chưa approve | **Chốt ADR-001/002/005 + visual baseline làm nền rewrite**; các ADR còn lại giữ proposed, không chặn P0 | `ADR.md:22` "No ADR approved merely by appearing"; nhưng `IMPLEMENTATION_PLAN.md:35` đã liệt P0 gồm project/asset/ticket/RBAC |
| Auth production chưa có (test stub `x-user-id`) | **P0 dùng Supabase Auth (OIDC) + RLS + JWT role claim**; KHÔNG dùng header stub | `INTEGRATION_STATUS.md:25` blocker #1; runtime FDI_Project đã có auth route |
| Chưa từng chạy Postgres thật | **Chạy migration 001/002 qua pooler Supabase** (đường đã verify) trước khi code UI | `INTEGRATION_STATUS.md:26`; memory: pooler `aws-0-ap-northeast-1...:6543` |
| 47 bảng / 8 màn hình / Phase A–D (8–12 tuần) | **Không ôm ngay.** P0 bản đầu = auth+RBAC, customer/site, project, asset registry, ticket, dashboard 5 GET, app shell. SLA/report/diagram/CI graph → P1/P2 | `IMPLEMENTATION_PLAN.md:11,42` (phases), nhưng exit criteria `:44` đòi E2E đầy đủ → phải chia nhỏ |
| Mâu thuẫn UI v1.3 blue vs v1.4 green | **Green = chuẩn**; mọi artifact blue/archive chỉ truy vết | `DESIGN_BASELINE.md:3`, ADR-008 |
| Code cũ CRUD generic (`CrudPage`) + roles `leader/manager/director` (khác matrix `super_admin/director/pm/engineer/support/customer_viewer`) | **Dọn sạch code cũ, viết lại theo domain + role mới**. Giữ lại cấu trúc Next 16 + auth đã verify | code audit subagent: `app/(workspace)/*/page.tsx` dùng `CrudConfig` với role `leader`; xung đột `rbac_matrix.csv` |
| SLA calendars/timezone/escalation chưa có | **P0 lưu cột `sla_state`minh họa + flag rõ "illustrative"**, KHÔNG tính SLA thật | `INTEGRATION_STATUS.md:28`, `tokens.json:53` |

## 3. MA TRẬN ƯU TIÊN

| Mức | Phạm vi | Trạng thái |
|---|---|---|
| **P0** (bản rewrite đầu) | Schema migration + RLS · Supabase Auth + RBAC claims · App shell/sidebar green · Dashboard 5 GET + KPI đúng contract · Customer/Site CRUD · Project CRUD · Asset registry · Ticket list/detail | Bắt đầu ngay |
| **P1** | Asset placement/movement · Ticket state machine + events · Document versioning · Work order/maintenance · Email outbox · UAT scenarios | Sau P0, có migration test |
| **P2** | SLA policy/calendar thật · Diagram/CI graph · Reports/PDF · Customer portal · Telegram/Zalo · Figma 8 màn hình pixel-perfect | Defer, cần signoff |

## 4. KIẾN TRÚC MỤC TIÊU (Next.js 16 App Router)

```
app/
  (auth)/login/                 # Supabase OIDC
  (workspace)/
    layout.tsx                  # AppShell + green sidebar (token-driven)
    dashboard/page.tsx          # 5 KPI + panels, as_of/scope từ API
    customers/, sites/          # CRUD scoped
    projects/, assets/, tickets/
  api/v1/dashboard/             # 5 GET route handlers, scope guard server-side
components/                     # ui/ (semantic tokens), shell/, tables/
lib/
  supabase/                     # server/client (đã có, gw verify)
  auth/                         # authorize.ts (JWT role + scope)
  rbac/                         # policy từ rbac_policy.json
  metrics/                      # định nghĩa KPI, KHÔNG persist presentation-only
migrations/                     # 001_core.sql, 002_extended.sql + RBAC/RLS bổ sung
```

**Nguyên tắc cứng:** mọi query đi qua scope customer · backend enforce RBAC (không tin UI) · KHÔNG fake timestamp/delta (`tokens.json:55`) · metric lấy từ source entity, không lưu KPI field (`ADR-009`).

## 5. LỘ TRÌNH THỰC THI (mỗi bước verify thật trước khi sang bước sau)

1. **Nền tảng DB:** apply `001_core.sql` + `002_extended.sql` + migration RBAC/RLS mới qua pooler; verify bằng query đếm bảng.
2. **Auth + RBAC:** login Supabase, `authorize()` đọc role từ JWT app_metadata, deny-by-default; test negative cross-customer.
3. **App shell:** sidebar green theo token, 5 nav group, responsive; KHÔNG dùng CrudPage cũ.
4. **Dashboard:** 5 route handlers trả đúng contract (`as_of`, `effective_scope`, exclusive buckets); UI KPI theo token.
5. **CRUD P0:** customers → sites → projects → assets → tickets, mỗi cái scope + audit.
6. **Verify:** build (`NEXT_PRIVATE_BUILD_WORKER=1 npx next build --webpack` do RAM ~1.4Gi), test Next test runner, docs-check, commit/push.

## 6. KHÔNG LÀM (tránh overclaim)

- Không tự approve ADR proposed; không đổi applied DB migration cũ (chỉ thêm migration mới).
- Không force push.
- Không claim production-ready khi `INTEGRATION_STATUS.md` còn 6 blocker.
- Không đụng `/docs/06-reference/archive/` (snapshot provenance).
