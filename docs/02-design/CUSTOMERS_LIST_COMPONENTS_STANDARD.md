# Customers List — Component & UI Standard

> **Trạng thái:** v1.0 · Chuẩn thiết kế cho route `/customers` (rewrite theo spec 01, 2026-11-19).
> Nguồn: `01_CUSTOMERS_LIST_UI_SPEC` (Customers List UI Specification v1.0) + code thực `app/(workspace)/customers/page.tsx` + `app/api/v1/customers/route.ts`.
> Đây là standard mô tả **contract đang chạy**, không phải mockup. Mọi số liệu lấy từ API — KHÔNG hardcode KPI/CSAT/delta.

## 1. Nguyên tắc xung đột (Dev Director đã chốt)

| Đề xuất spec / Figma | Quyết định | Evidence |
|---|---|---|
| Các con số **36 / 28 / 47 / 98%** trên mockup | Là **minh họa (illustration)** — KHÔNG bịa, KHÔNG hardcode thành KPI. Mọi giá trị lấy từ `summary` API | spec §1 "Các số liệu trên mockup là dữ liệu minh họa"; `app/(workspace)/customers/page.tsx:6,374-408` |
| CSAT có % trên mockup | Schema không có survey/CSAT → API trả `csat: null`; UI hiện `Chưa có dữ liệu`, KHÔNG hiện `0%`, KHÔNG render delta giả | `app/api/v1/customers/route.ts:226-227`; `app/(workspace)/customers/page.tsx:356-358,141-158` |
| Mã `CUS-0001` (spec §5) | DB **đã có** `customers.code` (migration 010, apply 2026-11-23). API **hiện trả `code: null`** (chưa thêm vào select — việc còn lại) | `app/api/v1/customers/route.ts:30-34,155`; `app/(workspace)/customers/page.tsx:516,535` |
| `status` active/inactive/archived | DB chưa có cột `customers.status` → API gán `'active'` cho mọi item; filter `inactive`/`archived` trả rỗng (KHÔNG bịa trạng thái) | `app/api/v1/customers/route.ts:44-45,165,184-189`; `DATA_DICTIONARY.md:34` |
| `project_count` / `open_ticket_count` | Đếm theo **scope backend** (grant), không phải global. Project = `active\|in_progress\|deployed`; ticket = `OPEN_TICKET_STATUSES` | `app/api/v1/customers/route.ts:15,21,100-132,141-151` |
| Spec §5 response flat `{items, pagination, as_of}` + endpoint `/summary` riêng | Thực thi envelope `{ data: { items, pagination, summary }, as_of, effective_scope, data_quality }`; summary nhúng trong list, KHÔNG có `/summary` riêng | `app/api/v1/customers/route.ts:232-243` |
| `industry_id` uuid + lookup (spec CUS-L02) | Dùng `industry` TEXT; options suy từ dữ liệu thật, KHÔNG hardcode danh sách ngành | `app/api/v1/customers/route.ts:23,179-182`; `app/(workspace)/customers/page.tsx:303-307,412-422` |
| Search theo "tên, mã, mã số thuế, contact" (spec CUS-L05) | Thực thi `SEARCH_FIELDS = name, phone, email, industry, tax_id`; KHÔNG search `code` (null) hay `primary_contact_name` | `app/api/v1/customers/route.ts:23,170-177` |
| KPI click mở filter, View, Edit, Archive (spec CUS-L01/08/09/10) | Chưa implement: `KpiCard` không có `onClick`; nút Sửa/Lưu trữ `aria-disabled` "Sẽ hỗ trợ ở bản sau"; không có nút View | `app/(workspace)/customers/page.tsx:160-192,551-569` |

## 2. Layout (desktop)

- AppShell/sidebar/topbar giữ nguyên (xem `DESIGN_BASELINE.md`), nav `Khách hàng` active.
- Header: `Khách hàng` + subtitle `Quản lý hồ sơ khách hàng, thông tin liên hệ, dự án và hỗ trợ dịch vụ.` — `app/(workspace)/customers/page.tsx:365-372`.
- **KPI row — 4 thẻ**, thứ tự green/blue/orange/info: `Tổng khách hàng` (Users), `Khách hàng có dự án` (FolderKanban), `Ticket đang mở` (Ticket), `Mức độ hài lòng (CSAT)` (Smile) — `app/(workspace)/customers/page.tsx:374-408`. Token màu `var(--primary)`, `var(--kpi-projects)`, `var(--kpi-tickets)`, `var(--info)`; KHÔNG hardcode hex mới.
- **Filter toolbar**: 3 Select (`Tất cả ngành`, `Tất cả trạng thái`, `Có/không có dự án`) + ô search `Tìm kiếm khách hàng...` + nút Refresh + CTA `+ Thêm khách hàng` (chỉ render khi có `customer.create`) — `app/(workspace)/customers/page.tsx:410-472`.
- Dòng `as_of` / `data_quality` (stale indicator) — `app/(workspace)/customers/page.tsx:474-480`.
- **Bảng** card trắng, **8 cột**, `min-w-[1080px]` + `overflow-x-auto` — `app/(workspace)/customers/page.tsx:492-502`.
- **Footer/pagination**: `Hiển thị start–end trên total`, page-size `[10,20,50,100]`, `Trang current / total`, Prev/Next — `app/(workspace)/customers/page.tsx:598-640`.

## 3. Field / cột mapping (file:line thật)

| Cột UI | Nguồn dữ liệu | file:line | Ghi chú |
|---|---|---|---|
| `#` | index trang | `app/(workspace)/customers/page.tsx:527-529` | `(currentPage-1)*effectivePageSize + index + 1` |
| Tên khách hàng | `name` + icon `Building2` + `Mã: {code}` | `app/(workspace)/customers/page.tsx:530-538` | `code` null → `—` (`:516`) |
| Liên hệ chính | `primary_contact_name` + `email · phone` | `app/(workspace)/customers/page.tsx:539-544` | select `route.ts:117,161-162`; không có contact → `—` |
| Ngành | `industry` (Badge) | `app/(workspace)/customers/page.tsx:519,545` | select `route.ts:117,159`; rỗng → `—` |
| Dự án | `project_count` | `app/(workspace)/customers/page.tsx:546` | đếm theo scope: `route.ts:141-145,163` |
| Ticket mở | `open_ticket_count` | `app/(workspace)/customers/page.tsx:547` | đếm theo scope: `route.ts:147-151,164` |
| Trạng thái | `status` → `STATUS_META` | `app/(workspace)/customers/page.tsx:115-119,520-524,548` | API luôn `'active'` (`route.ts:165`) |
| Thao tác | Sửa / Lưu trữ | `app/(workspace)/customers/page.tsx:549-569` | `aria-disabled`, "Sẽ hỗ trợ ở bản sau" |

- `formatNumber()` trả `—` khi value không phải số hữu hạn — `app/(workspace)/customers/page.tsx:127-129`.
- `industryName()` chấp nhận industry dạng string hoặc `{name}` — `app/(workspace)/customers/page.tsx:121-125`.
- Gợi ý ngành lấy từ `items` trả về, sort `localeCompare('vi')` — `app/(workspace)/customers/page.tsx:303-307`.

## 4. Hành vi, state & responsive

- **URL state**: khôi phục `page`, `page_size`, `search`, `industry`, `status`, `has_project` — `app/(workspace)/customers/page.tsx:219-235`; ghi lại bằng `history.replaceState` — `:249-265`. Đổi filter → `setPage(1)` — `:415,427,439`.
- **Search debounce 300 ms**, tự reset page khi người dùng sửa — `app/(workspace)/customers/page.tsx:237-247`.
- **Refresh** tăng `refreshTick`, giữ nguyên filter/page; gọi lại API — `app/(workspace)/customers/page.tsx:326-329,211`. `clearFilters()` — `:331-339`.
- **Fetch**: `cache: 'no-store'` + `AbortController` huỷ request cũ — `app/(workspace)/customers/page.tsx:281-285,319-324`.
- **States**: loading skeleton 5 hàng × 8 ô (`:506-512`); empty "Chưa có khách hàng nào" (`:581-584`); empty filtered + "Xóa bộ lọc" (`:585-586`); lỗi `role="alert"` + "Thử lại" (`:482-489`, toast `:313`); stale `as_of` (`:474-480`); confirm archive — **chưa có** (action disabled); toast refresh/info (`:327`).
- **Không render delta giả**: `Delta()` trả `null` khi current/previous không phải số — `app/(workspace)/customers/page.tsx:141-158`.
- **Responsive**: KPI `grid md:grid-cols-2 xl:grid-cols-4` (`:375`); toolbar `flex-wrap` (`:411`); bảng scroll ngang `overflow-x-auto` (`:494-495`). Chưa có customer-card thay bảng ở `<768px` như spec §8 — gap cần làm rõ; CTA vẫn nằm trong toolbar wrap.
- **A11y**: `aria-label` trên Select/Input/Button, `scope="col"`, `role="alert"`, `sr-only sm:not-sr-only` cho nhãn Refresh — `app/(workspace)/customers/page.tsx:412-461,496-500,557-565`. Target icon action `h-9` (36px) — cần review lên ≥44px. Focus ring theo token.

## 5. Metrics contract — `GET /api/v1/customers`

- Query params: `search`, `industry`, `status`, `has_project` (`true|false`), `page` (mặc định 1), `page_size` (mặc định 20, **cap 100**), `sort` — whitelist `name|created_at|industry|project_count|open_ticket_count`, prefix `-` = giảm, mặc định `-created_at` — `app/api/v1/customers/route.ts:25-28,170-220`.
- Envelope (thực thi) — `app/api/v1/customers/route.ts:232-243`:

```json
{
  "as_of": "2026-11-19T08:00:00Z",
  "effective_scope": { "requested_customer_id": null, "customer_ids": null, "role": "super_admin" },
  "data_quality": "complete",
  "data": {
    "items": [{
      "id": "uuid", "code": null, "name": "string",
      "phone": null, "email": null, "industry": null, "tax_id": null,
      "headquarters_address": null, "primary_contact_name": null,
      "project_count": 0, "open_ticket_count": 0,
      "status": "active", "created_at": "timestamp"
    }],
    "pagination": { "page": 1, "page_size": 20, "total": 0 },
    "summary": {
      "total_customers": 0, "with_projects": 0, "open_tickets": 0,
      "csat": null, "comparison": null
    }
  }
}
```

- `total` = số item **sau filter, trước slice** — `app/api/v1/customers/route.ts:215-220`.
- `data_quality: 'complete'` vì `csat: null` là field **không tồn tại trong schema**, không phải dữ liệu thiếu — `app/api/v1/customers/route.ts:235-237`.
- Client đọc `data.items`, `data.pagination`, `data.summary`, `as_of`, `data_quality`, và `summary.comparison ?? comparison` — `app/(workspace)/customers/page.tsx:293-301`.
- `GET /api/v1/customers/summary` như spec §5 **không tồn tại** trong code — summary nằm trong response list. Xem thêm `DASHBOARD_METRIC_CONTRACT.md`.

## 6. RBAC & scope

- API: `authorize('customer.read')` — `app/api/v1/customers/route.ts:94`; lỗi 401/403 qua `apiError`.
- **Scope deny-by-default**: global grant (super_admin) không lọc; role khác phải có customer grant, không có → 403 — `app/api/v1/customers/route.ts:100-113`.
- `customers` lọc theo cột `id` (KHÔNG có `customer_id`) — `app/api/v1/customers/route.ts:115-122`; `projects`/`tickets` dùng `scoped()` theo `customer_id` — `:124-132`. RLS là lớp chặn cuối, xem `RBAC_MATRIX.md`.
- UI: `hasPermission(role, 'customer.create')` → CTA "Thêm khách hàng" — `app/(workspace)/customers/page.tsx:38-39,201,463-471`; CTA trong empty state — `:587-593`.
- `customer.update` / `customer.archive`: nút render **disabled**, KHÔNG phải RBAC gate — `app/(workspace)/customers/page.tsx:551-569`. Backend vẫn phải từ chối thao tác trái phép (spec §6) — không coi ẩn icon là kiểm tra quyền.

## 6b. Right detail drawer (CUS-L08 — view)

- Bấm vào **bất kỳ ô nào của row** (trừ cột Thao tác) → mở drawer phải `CustomerDetailDrawer` — `app/(workspace)/customers/page.tsx:200-312,638-642`; action cell `stopPropagation` nên nút Sửa/Lưu trữ không mở drawer — `:665`.
- Drawer = overlay mờ + `aside role="dialog" aria-modal="true"`, đóng bằng nút X, nút "Đóng", click overlay, hoặc phím **Escape** — `:212-260`.
- Nội dung lấy **trực tiếp từ `Customer` item đã fetch** (KHÔNG fetch riêng, KHÔNG bịa): header tên + mã + badge trạng thái/ngành; 3 nhóm **Thông tin doanh nghiệp** (name, code, tax_id, industry, headquarters_address), **Liên hệ chính** (primary_contact_name, email, phone), **Thống kê** (project_count, open_ticket_count, created_at) — `:262-308`. Trống → `—`.
- `Customer` interface bổ sung `headquarters_address` để khớp contract API — `:54`. Regression: `tests/customer-detail-drawer.test.mjs` (3/3).
- **Không** dùng modal: drawer giữ ngữ cảnh danh sách, đúng yêu cầu "right sidebar thông tin khách hàng".

## 7. Điểm sạch / Điểm cần làm rõ

**Sạch:** mọi KPI/count lấy từ API theo scope, không hardcode; CSAT null → `Chưa có dữ liệu`; `code` null → `—`; status `'active'` không bịa; search debounce + URL state đầy đủ; skeleton/empty/error rõ; scope deny-by-default ở backend; view chi tiết qua right drawer không fetch thừa.

**Cần làm rõ:** KPI click-through (CUS-L01), Edit/Archive (CUS-L09/10) chưa implement (nút disabled); mobile chưa có customer cards; schema chưa có survey/CSAT → KPI mãi `Chưa có dữ liệu` tới Phase 2; **`customers.code` đã có (010) nhưng API `/api/v1/customers` vẫn hardcode `code: null`** → phải thêm `code` vào select + trả thật (việc tiếp theo); options ngành chỉ suy từ page hiện tại (chưa có lookup đầy đủ); endpoint `/customers/summary` riêng chưa có; `data_quality` vẫn `'complete'` dù CSAT null — cần PO xác nhận có nên trả `'partial'` không. Drawer hiện là read-only — chưa có nút "Sửa" bên trong.

Standard/plan liên quan: `CREATE_CUSTOMER_COMPONENTS_STANDARD.md` · `../04-governance/CREATE_CUSTOMER_PLAN.md` · nhật ký đồng bộ `../04-governance/CHECKLISTS.md`.
