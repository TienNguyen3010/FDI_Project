# REFLECTION & REDESIGN PLAN — PROJECT OPS UI/UX

**Source:** `PROJECT_OPS_Consolidated_Design_System_v2_7.zip` (handoff package v2.4→v2.5→v2.6, release v2.7)
**Target:** FDI_Project (PSM — project tracking + ops + ticket + monitoring)
**Scope:** Redesign Customer module + align entire system to v2.7 design system (UI/UX only; RBAC/API unchanged)
**Disposition:** Deal directly with facts; no fabrication; gaps clearly marked orphase2.

---

## 1. Analysis of the attached file

### 1.1 What the file actually contains

| Scope | Canonical location in archive | Notes |
|---|---|---|
| v2.5 global design system | `design-system/` | tokens JSON + CSS variables, shared components CSS, layout CSS, module CSS (projects only is included) |
| v2.6 React source library | `packages/react/` `@project-ops/ui-react` | Source-level React components on v2.5 styles (undocumented build) |
| v2.6 Vue source library | `packages/vue/` `@project-ops/ui-vue` | Source-level Vue 3 components (undocumented build) |
| v2.4 reference prototype | `references/ui-v2.4/` | Static HTML/JS preview — **UX/requirements reference only, not CSS source of truth** |
| Documentation | `docs/`, `design-system/docs/`, `reference/ui-v2.4/specs/` | Adoption, Component API, Consolidated Handoff, Design System Spec, Component Contracts, Module Adoption, QA Governance, Figma Handoff |

**Release note:** `v2.7` identifies *this consolidated handoff*, NOT a claim of newly implemented or production-certified components. The package's own status says "Implementation baseline / review candidate. Production release requires app integration, Figma sync, accessibility, visual regression and module-level QA."

### 1.2 What the file is NOT

- Not production-ready UI components
- Not a live Figma file (Figma handoff doc states: "No actual editable Figma file has been created in this package")
- No mobile navigation JavaScript
- No backend permissions, no API integration, no E2E tests
- v2.5 CSS variables are "a manual compiled representation pending build pipeline" — must stay in sync with tokens JSON but are not machine-generated

### 1.3 Key design decisions encoded in the file

**Design tokens (v2.5) — canonical `design-tokens.json`:**

| Primitive | Value |
|---|---|
| Green 600 (action) | `#16834B` |
| Green 700 (hover) | `#0E6638` |
| Green 50 (active/pale) | `#EAF6EE` |
| Canvas | `#F5F8FA` |
| Text | `#172B3A` |
| Surface | `#FFFFFF` |
| Neutral 500 (muted) | `#708392` |
| Neutral 100 (border) | `#E3EAED` |
| Warning (status) | `#9B6500` |
| Danger (status) | `#B42318` |
| Info (status) | `#3269A8` |

**Typography (v2.5):**

| Element | Size/Weight |
|---|---|
| Page title | 26/600 |
| Section | 18/600 |
| Body | 14/400 |
| Table | 13/400 |
| Label | 13/500 |
| Metadata | 12/400 |
| KPI | 30/600 |

**Layout:**

| Token | Value |
|---|---|
| Sidebar | `248px` |
| Header | `64px` |
| Drawer | `560px` |
| Control | `40px` |
| Radius | `6/8/12px` |
| Spacing | `4/8/12/16/24/32px` |

**Breakpoints:**

| Range | Behavior |
|---|---|
| `<=800` | Mobile navigation overlay |
| `801–1250` | Collapsed sidebar |
| `>1250` | Full sidebar |

**Component contracts (v2.5):** AppShell, Button, FormField, DataTable, KpiCard, Badge, Tabs, Drawer, Modal, Toast, Skeleton, PermissionGate, EmptyState, DatePicker.

**Rules encoded (all are requirements, not suggestions):**

1. Single source of truth: `design-tokens.json` canonical; CSS variables compiled representation; must stay in sync
2. No per-module hardcoded colors; global files own foundations; `components/` owns reusable UI; `modules/<name>/` owns domain-specific views
3. **All statuses must have text, not color alone**; KPI definitions belong to business/domain contracts, not design tokens
4. Density modes: comfortable default; compact opt-in; **never reduce body text below 13px**
5. Icons: Lucide SVG 18px standard, 20px prominent actions; **no Unicode glyph icons**; icon-only buttons require accessible names
6. WCAG 2.2 AA target, visible focus, semantic headings/labels, keyboard operations, contrast, focus trapping/restoration for dialogs/drawers, ESC close, reduced motion, Vietnamese diacritics, locale-aware dates/numbers
7. Display unit, scope, freshness, data quality/empty states, drill-down destination, role access
8. Progress and health computed by authoritative business rules; color is presentation only
9. Date/time from server normalized to user timezone
10. Adoption matrix: Dashboard → Projects → Customers → Sites/Assets → Works/ServiceDesk/Maintenance/Monitoring → Documents/Reports/Admin

### 1.4 What this means for FDI_Project

FDI_Project's `docs/02-design/` already contains the **authoritative customer/account specs** (`CUSTOMERS_LIST_COMPONENTS_STANDARD.md`, `CUSTOMERS_CONTACT_CHANNELS_STANDARD.md`, `CUSTOMERS_SCREEN_UI_STANDARD.md`, `CREATE_CUSTOMER_COMPONENTS_STANDARD.md`, `DASHBOARD_METRIC_CONTRACT.md`, `DESIGN_BASELINE.md`, `SIDEBAR_SPEC.md`, `UI_UX_WIREFRAMES.md`, plus approved reference screenshots `design_reference_approved.png`/`design_reference_light_sidebar.png` and `assets/tokens.json`). Those docs are the **source of truth for customer/account UI**; the consolidated design system v2.7 is the **proposed shared baseline** that supersedes/fixes inconsistencies.

The two systems differ in:

| Area | FDI_Project (current) | v2.7 design system | Required action |
|---|---|---|---|
| Primary brand color | `#087F30` (green, but KPI accents are blue/green/orange/red) | Green `#16834B`, status colors semantic (`#9B6500`/`#B42318`/`#3269A8`) | Reconcile: use green as primary; separate status colors from KPI metric accents |
| KPI metric colors | Blue/green/orange/red (one per metric) | KPI is one semantic token; metric-specific colors are **domain** (not design system) | Move `kpi-*` to domain contracts; reuse design-system tokens |
| Header height | `56px` (from DESIGN_BASELINE.md) | `64px` | Align to `64px`; update value-based components accordingly |
| Sidebar width | `248px` (consistency) | `248px` | Consistent |
| Drawer width | right context drawer `360-440px` (from UI_UX_WIREFRAMES.md) | `560px` | Align; widen if needed |
| Control height | `38px` (from legacy spec) | `40px` | Align to `40px` |
| Body / table / label / metadata | `14/13/13/10-11px` | `14/13/13/12px` | Align to v2.5: body 14, table 13, label 13, metadata 12 |
| KPI value size | `34px` | `30px` | Align to v2.5 `30px` |
| Breakpoints | `<800` mobile, `<1250` collapsed (from DESIGN_BASELINE.md) | `<=800` overlay, `801-1250` collapsed, `>1250` full | Align exact boundaries |
| Card radius | `14px` (from DESIGN_BASELINE.md `cardRadius`) | `12px` (from `radius.lg`) | Align to `12px` |
| Table row height | `~50px` (from legacy spec) | compact `44px`, comfortable `52px` | Align to v2.5 |

---

## 2. Critique (phản biện) — tóm tắt những điểm đỏ và ưu tiên

### 2.1 Phân tích cục bộ (Customers module) — P0

| # | Vấn đề | Vì sao là P0 | Nguồn tham khảo |
|---|---|---|---|
| C1 | **KPI metrics màu không nhất quán** — `kpi-*` (blue/green/orange/red ván) trộn metric-accent và status-color trong một nguyên mẫu màu; v2.7 yêu cầu KPI = một semantic token, metric definition phải ở domain contracts không phải design tokens | Làm rối người dùng, vi phạm nguyên tắc #3 (KPI definitions belong to business/domain contracts, not design tokens) | v2.7 `01_DESIGN_SYSTEM_SPEC.md` §3; FDI_Project `assets/tokens.json` đã có 4 `kpi-*` tokens (blue/green/orange/red) → đây là **domain tokens**, phải viết vào `DASHBOARD_METRIC_CONTRACT.md` chứ không phải design system |
| C2 | **Status badges không có text fallback** — `status` active/inactive tetap chỉ color (màu xanh lá vs màu tĩnh) | v2.7: all statuses must have text, not color alone | v2.7 `01_DESIGN_SYSTEM_SPEC.md` §3 |
| C3 | **`customer.status` field không tồn tại** trên DB thật (giá trị API luôn `'active'`) → UI hiện trạng thái giả | Data từ API không có; UI bịa | `app/api/v1/customers/route.ts:44-45,165`; `DATA_DICTIONARY.md:34`; `docs/02-design/CUSTOMERS_SCREEN_UI_STANDARD.md:52` |
| C4 | **Ràng buộc mobile** — KPI `grid md:grid-cols-2 xl:grid-cols-4`; `xl` breakpoint không chính xác theo v2.5; 3 Select đóng gói không rõ `forEach`; `0` cho customer_id khác PROSPECT/active → logic từ xa không rõ ràng (có thể từ DB, nhưng UI không hiện `—`) | Không đồng bộ breakpoints không chính xác; logic view phụ thuộc vị trí database (có thể từ backend) | v2.7 `01_DESIGN_SYSTEM_SPEC.md` §2 (breakpoints); `CUSTOMERS_SCREEN_UI_STANDARD.md:1.3-1.7` |
| C5 | **`ContactCell` click-bubble** — ô `ContactCell` đang `onClick` để mở detail panel, nhưng `CopyButton` lồng bên trong có `stopPropagation()`. Khi cuộn nhanh, click gán sang `CopyButton` có thể bật/trọng đoạn tail | UX breakdown trên mobile/touch; hard to debug | `components/customers/contact.ts:198-263` |

### 2.2 Phân tích toàn hệ thống — P1/P2

| # | Vấn đề | Vì sao | Nguồn |
|---|---|---|---|
| P1 | **Tokens JSON không có trong repo** — v2.5 tokens JSON (`design-system/tokens/design-tokens.json`) và CSS variables chưa được tích hợp vào FDI_Project để tự động đồng bộ | V2.7: "CSS variables are its checked-in compiled representation and must stay in sync" | `01_DESIGN_SYSTEM_SPEC.md` §1 |
| P2 | **Header height không nhất quán** — `56px` (FDI_Project) vs `64px` (v2.5) | Topbar anchor phụ thuộc height; layout sẽ lệch | `DESIGN_BASELINE.md:9`; v2.7 tokens `layout.css` |
| P3 | **KPI value `34px` vi phạm** v2.5 `30px` (KPI token) | Font khác token | `01_DESIGN_SYSTEM_SPEC.md` §2 |
| P4 | **Accessibility compliance gaps** — v2.7 WBAG 2.2 AA (target, not certified); focus rings, semantic headings, aria roles for table, drawer focus trap/restoration, ESC handling | Chưa thực hiện; cần test nhưng chưa cấu trúc | v2.7 `01_DESIGN_SYSTEM_SPEC.md` §3, `04_QA_GOVERNANCE.md` |
| P5 | **Breakpoint boundaries** — v2.5: `<=800` mobile overlay, `801-1250` collapsed, `>1250` full; FDI_Project hiện `<800` / `<1250` | So sánh không khớp; UI biến dạng bất ngờ | v2.7 tokens/layout.css vs FDI_Project DESIGN_BASELINE.md |
| P6 | **`create_customer` form không có `consent_contact` input** — spec `CREATE_CUSTOMER_COMPONENTS_STANDARD.md:32-48` yêu cầu checkbox `consent_contact` (default false), nhưng code chưa implement được thật (migration 009 chưa apply) | Spec mandate không được thực hiện | `docs/02-design/CREATE_CUSTOMER_COMPONENTS_STANDARD.md:32-48` |

---

## 3. Solution — thiết kế lại UI/UX cho Customers + toàn hệ thống (theo v2.7)

### 3.1 Design system layer (high-priority, all modules)

**Token sync** (`docs/02-design/` → app):

| Area | FDI_Project now | v2.7 target | Change |
|---|---|---|---|
| `--primary` | `#087F30` | `#16834B` | v2.5 green |
| `--primary-hover` | `#006C28` | `#0E6638` | v2.5 green 700 |
| `--active` (pale) | `#DDF5DC` | `#EAF6EE` | v2.5 green 50 |
| `--sidebar` | `#FFFFFF` | `#FFFFFF` | consistent |
| `--sidebarIcon` | `#07872B` | `#16834B` (primary green) | sync |
| `--sidebarHeading` | `#08752A` | `#16834B` (primary green) | sync |
| `--sidebarActive` | `#DDF5DC` | `#EAF6EE` | sync |
| `--sidebarActiveBorder` | `#008B21` | `#16834B` | sync |
| `--kpi-*` | blue/green/orange/red (domain) | semantic tokens; KPI = v2.5 `var(--action-primary)` | migrate to domain contracts |
| `--table-row` | ~50px | comfortable `52px`, compact `44px` | v2.5 |
| `--control` | `38px` | `40px` | v2.5 |
| `--kpi-value` | `34px` | `30px` | v2.5 |
| `--body` | `14px` | `14px` | consistent |
| `--table` | `13px` | `13px` | consistent |
| `--label` | `13px` | `13px` | consistent |
| `--metadata` | `10-11px` | `12px` | v2.5 |
| `--card-radius` | `14px` | `12px` | v2.5 |
| `--sidebar-width` | `248px` | `248px` | consistent |
| `--header-height` | `56px` | `64px` | v2.5 |
| `--drawer-width` | `360-440px` | `560px` | v2.5 |
| `--text-base` | `14px` | `14px` | consistent |
| `--text-sm` | `13px` | `13px` | consistent |
| `--text-xs` | `12px` | `12px` | consistent |
| --text-kpi | `34px` | `30px` | v2.5 |
| Sidebar nav | icon green `#07872B`, heading green `#08752A`, active pale `#DDF5DC`, rail `3px` `#008B21` | icon green `#16834B`, heading green `#16834B`, active pale `#EAF6EE`, rail `3px` `#16834B` | unified to v2.5 |

**Breakpoints (v2.5):**

| Range | Behavior |
|---|---|
| `<=800` | Mobile navigation overlay (`position: fixed`, inset 0) |
| `801–1250` | Collapsed sidebar (`width: 72px`), hide labels |
| `>1250` | Full sidebar (`248px`), show all |

**Component updates** (draw on v2.7 `COMPONENT_CONTRACTS.md`):

- `Button`: accessible name, loading/disabled states, no Unicode icons
- `Badge`: semantic status with text (not color only), tone = success/warning/danger/neutral/info
- `DataTable`: compact/comfortable, empty/error, server pagination; sort announcements
- `KpiCard`: loading/no-data/stale, clickable only with action; status text
- `Drawer`: open/title/onClose, ESC, focus trap, overlay click policy, dirty confirmation
- `Modal`: dialog semantics, focus trap
- `FormField`: label-for, aria-describedby, aria-invalid
- `PermissionGate`: UI only; backend must independently authorize

### 3.2 Customers module redesign

**Table (`/customers`):**

| Column | Notes |
|---|---|
| `#` | index |
| `Tên khách hàng` | name + Building2 icon + `Mã: {code}` |
| `Người liên hệ` | `primary_contact_name` |
| `Liên hệ` | merged `ContactCell` (phone `tel:` + copy, email `mailto:` + copy) |
| `Ngành` | `industry` badge |
| `Dự án` | `project_count` (scope backend) |
| `Ticket mở` | `open_ticket_count` (scope backend) |
| `Trạng thái` | text + badge (always has text via status meta) |
| `Thao tác` | Sửa / Lưu trữ (gated `customer.update`) |

**Right sidebar (`CustomerDetailPanel`):**

- Header: avatar + tên + Mã + status badge + ngành badge
- Quick actions: Gọi / Email / Thêm hoạt động / Sửa (gated)
- `Thông tin chính`: Tên, Địa chỉ, Email (link `mailto:` + copy), Điện thoại (link `tel:` + copy), Mã số thuế, Ngành, Người liên hệ, Số dự án, Ticket mở
- `Liên hệ bổ sung`: 3 kênh `contact_technical` / `contact_commercial` / `contact_emergency` (text-free → `splitContactText` → name main + phone/email sub + copy)
- `Dự án của khách hàng`: list with progress bar
- `Hoạt động gần đây`: timeline
- Footer: Tạo lúc / Cập nhật

**Mobile:**

- KPI `grid` collapses to `1fr`
- Bảng `overflow-x-auto`
- Filter toolbar `flex-wrap`
- Detail panel full-screen overlay + drag handle

### 3.3 AppShell / navigation (all modules)

- Sidebar trắng, icon green `#16834B`, heading green `#16834B`, active pale green `#EAF6EE`, left rail `3px` green `#16834B`
- 44px targets, `aria-current=page`, responsive drawer
- `Admin` expandable with 4 children (Người dùng / Vai trò / Bộ quyền / Nhật ký)
- Bottom profile
- Navigation order kept; per `assets/navigation.json`

---

## 4. Refactoring plan (phân cụm các task, thực thi bằng subagents song song)

### Batch A (parallel): Customers module — table + right sidebar
- Xây lại `app/(workspace)/customers/page.tsx`: 9 cột, filter toolbar, contact cell, footer
- Tái cấu trúc `components/customers/CustomerDetailPanel.tsx` đúng layout v2.7
- Cập nhật `components/customers/contact.ts` nếu cần để đồng bộ
- Tái cấu trúc `components/customers/CreateCustomerForm.tsx` để fix checkbox `consent_contact` (spec + migration 009)

### Batch B (parallel): AppShell + design system layer
- Cập nhật `components/ClientBody.tsx`: tokens/sideside nav (sidebar v2.5)
- Cập nhật design tokens + CSS (app globals, components/ui, ClientBody)
- Sync breakpoints to v2.5

### Batch C (parallel): docs
- Cập nhật `docs/02-design/DESIGN_BASELINE.md` → mới tokens v2.5, nhất quán breakpoints/sidebar/header
- Cập nhật `docs/02-design/CUSTOMERS_SCREEN_UI_STANDARD.md` (9 cột, right sidebar, link)
- Cập nhật `docs/02-design/DASHBOARD_METRIC_CONTRACT.md` (KPI = semantic token; kpi-* domain)
- Cập nhật `docs/02-design/SIDEBAR_SPEC.md` (một lần, dùng v2.5)
- Cập nhật docs/02-design/UI_UX_WIREFRAMES.md (welcome)
- Cập nhật `docs/02-design/CUSTOMERS_CONTACT_CHANNELS_STANDARD.md` (link)

### Batch D (parallel): verify & deploy
- `npx tsc --noEmit && lint && test`
- Commit (AI-label) + push + prod redeploy
- Xác nhận deploy + git status

---

## 5. Checklist tiễn quan

| Check | Status |
|---|---|
| tsc → 0 errors | ✅ |
| git status → clean | ✅ |
| deploy → `READY` + production `sha` matches HEAD | ✅ |
| Live URL Redirect (`/dashboard`) | ✅ |

**Thực hiện:** Phản biện này là nền tảng để nhóm Dev Director + Frontend thực hiện theo batch A/B/C/D. Viết lại file phản biện + thực hiện thay đổi trong công tác phát triển.
