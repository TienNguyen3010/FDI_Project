# Customers — Screen UI Design (màn hình Khách hàng bảng + sidebar phải)

> **Trạng thái:** design-doc-chốt · 2026-11-25
> **Là chuẩn thiết kế** cho route `/customers` (bảng danh sách) + right sidebar (`CustomerDetailPanel`).
> Nguồn: `CUSTOMERS_CONTACT_CHANNELS_STANDARD.md`, `CUSTOMERS_LIST_COMPONENTS_STANDARD.md`,
> code thực `app/(workspace)/customers/page.tsx` + `components/customers/CustomerDetailPanel.tsx`.

## 1. Cấu trúc màn hình

### 1.1 Topbar (desktop ≥1280)
- Sidebar trái `248px` (collapsible), topbar `56px`.
- Bảng nội dung max `1600px`.

### 1.2 Header (dòng 1)
- Tiêu đề: `Khách hàng`
- Subtitle: `Quản lý hồ sơ khách hàng, thông tin liên hệ, dự án và hỗ trợ dịch vụ.`
  (`app/(workspace)/customers/page.tsx:365-372`)

### 1.3 KPI row — 4 thẻ
Thứ tự: green / blue / orange / info
1. `Tổng khách hàng` (icon `Users`) — màu `var(--primary)`
2. `Khách hàng có dự án` (icon `FolderKanban`) — màu `var(--kpi-projects)`
3. `Ticket đang mở` (icon `Ticket`) — màu `var(--kpi-tickets)`
4. `Mức độ hài lòng (CSAT)` (icon `Smile`) — màu `var(--info)`
→ Mọi giá trị lấy từ `summary` API, KHÔNG hardcode.

### 1.4 Filter toolbar
Đếm 3 `Select` (Tất cả ngành / Tất cả trạng thái / Có/không có dự án) + ô search
`Tìm kiếm khách hàng...` + nút Refresh + CTA `+ Thêm khách hàng` (chỉ render khi có `customer.create`).

- Filter URL state: `page`, `page_size`, `search`, `industry`, `status`, `has_project` (xóa qua `history.replaceState`).
- Search debounce 300ms, tự reset `page` khi user sửa.
- Refresh → `refreshTick`, giữ filter/page, gọi API lại.

### 1.5 Dòng as_of / data_quality
- `as_of` (UTC), `data_quality` stale indicator (`complete` / `partial` / `stale`).

### 1.6 Bảng (card trắng)
- `min-w-[1080px]` + `overflow-x-auto`.
- 8 cột: `#` · `Tên khách hàng` · `Người liên hệ` · `Liên hệ` · `Ngành` · `Dự án` · `Ticket mở` · `Trạng thái` · `Thao tác` (kèm `#` → 9 cột hiển thị).

Vị trí cột & nguồn dữ liệu (file:line thật):
| Cột UI | Nguồn | file:line | Ghi chú |
|---|---|---|---|
| `#` | index trang | `page.tsx:527-529` | `(currentPage-1)*effectivePageSize + index + 1` |
| Tên khách hàng | `name` + `Building2` + `Mã: {code}` | `page.tsx:530-538` | `code` null → `—` |
| Người liên hệ | `primary_contact_name` | `page.tsx:1042-1050` | không có → `—`; icon `Users` |
| Liên hệ | `ContactCell({ phone, email })` | `page.tsx:1045-1053` | SĐT `tel:` + copy, Email `mailto:` + copy; rỗng cả hai → `—`. Xem `CUSTOMERS_CONTACT_CHANNELS_STANDARD.md` |
| Ngành | `industry` (Badge) | `page.tsx:519,545` | rỗng → `—` |
| Dự án | `project_count` | `page.tsx:546` | đếm theo scope backend |
| Ticket mở | `open_ticket_count` | `page.tsx:547` | đếm theo scope backend |
| Trạng thái | `status` → `STATUS_META` | `page.tsx:520-524,548` | API luôn `'active'` |
| Thao tác | Sửa / Lưu trữ (drawer) | `page.tsx:549-569` | gated `customer.update`, `aria-disabled` |

- Skeleton 5 hàng × 8 ô khi loading; empty state `"Chưa có khách hàng nào"`; error `role="alert"` + `"Thử lại"`.
- Footer/pagination: `Hiển thị start–end trên total` + page-size `[10,20,50,100]` + `Trang current / total` + Prev/Next.

### 1.7 Right sidebar (drawer / `CustomerDetailPanel`)
Mở khi click bất kỳ ô nào của row (trừ cột Thao tác).
- Overlay mờ + `aside role="dialog" aria-modal="true"`, đóng bằng X / nút "Đóng" / click overlay / phím Escape.
- Content lấy trực tiếp từ `Customer` item đã fetch (KHÔNG fetch riêng, KHÔNG bịa).

#### 1.7.1 "Thông tin chính"
- Header: avatar + tên + Mã (nusun) + badge trạng thái, badge ngành (2026-11-24).
- Nhóm **Liên hệ** (thêm 2026-11-25): SĐT + Email thành link `tel:`/`mailto:` kèm `CopyButton`.
- Nhóm **Thông tin chính** (2026-11-25): `Người liên hệ` hiển thị `primary_contact_name` (không phải số điện thoại).

#### 1.7.2 "Liên hệ bổ sung" (2026-11-25)
- 3 kênh **Kỹ thuật / Thương mại / Khẩn cấp**.
- Giá trị DB là text tự do (`contact_technical` / `contact_commercial` / `contact_emergency`) → parse bằng
  `splitContactText()` rồi hiển thị: tên (dòng chính) + SĐT/email (dòng phụ) dạng link `tel:`/`mailto:` kèm `CopyButton`.
- Rỗng → `—`; cả 3 kênh trống → empty state `"Chưa có liên hệ bổ sung."` (KHÔNG cảnh báo giả).
- Lookup `customer_contact_name` không có cs const/vn → dùng hardcoded list (ghi rõ ở docs).

#### 1.7.3 Dự án (2026-11-24)
- Với `customer_id` khác `PROSPECT`/`active|in_progress|deployed`, ẩn block Dự án + Ticket đang mở (gán `0`).
- `project_count` / `open_ticket_count` đếm scope backend, KHÔNG global.

### 1.8 Footer (desktop)
- `main md:pb-0` + footer `mt-auto`, KHÔNG sticky. Footer nền đục `bg-[#ffffff]`; không debounce scroll.

## 2. Dữ liệu thật của khách hàng mẫu dùng làm chuẩn (2026-11-25)
> **Nguồn chuẩn chính (canonical source)** để tạo customer reference record khi làm module Product / Asset / Project / Ticket. Nhìn trước `CUSTOMERS_CONTACT_CHANNELS_STANDARD.md` + `migrations/017_customer_benchmark.sql` trước khi tạo record mới.

| Cột | Giá trị mẫu | Lưu ý |
|---|---|---|
| `name` | `Khải Thiên Media` | 2–255 ký tự, trim |
| `code` | `CUS-2026-006` (do DB sinh, migration 010) | KHÔNG tự suy, KHÔNG hardcode |
| `phone` | `0900000000` | chuẩn E.164 khi có country code, trim |
| `email` | `sales@ktm.example` | lowercase domain |
| `industry` | `Manufacturing` | TEXT, gợi ý từ dữ liệu thật, không hardcode |
| `primary_contact_name` | `Đỗ Quang Hiểu` | cột `Người liên hệ` màn bảng |
| `contact_technical` | `Kỹ thuật Demo` | text tự do, parse bằng `splitContactText` |
| `contact_commercial` | `Kinh doanh Demo` | text tự do |
| `contact_emergency` | `Hotline Demo` | text tự do, hotline 24/7 |
| `headquarters_address` | (nếu có) | text tự do |
| `notes` | (nếu có) | `maxLength=500` |
| `consent_contact` | `false` mặc định | DNC: không được liên hệ khi false |
| `lifecycle_stage` | `prospect` / `active` / `closed` | PSM mốc thật, không `status` giả |

### 2.1 Common pitfalls
> - `CopyButton` trong ô `Liên hệ` phải có fallback `document.execCommand('copy')` (clipboard API bị chặn ở iframe/HTTP).
> - `useToast()` repo KHÔNG có `toast()`; gọi `addToast(...)`.
> - Copy state phải theo key động (`'phone-' + id`), không dùng boolean chung.
> - Không ghi giá trị thật/sensitive vào file design; benchmark lấy từ DB thật.
> - Migration benchmark 017 phải idempotent `ON CONFLICT DO NOTHING`.

### 2.2 Dữ liệu sample thư mục
- Cột: `id` (uuid), `name`, `phone`, `email`, `industry`, `contact_technical`, `contact_commercial`, `contact_emergency`, `primary_contact_name`.
- Tạo bằng migration 003 (`migrations/003_seed.sql`) — idempotent `ON CONFLICT DO NOTHING`.
- Không seed password hash thật, không thông tin nhạy cảm.

## 3. Hành vi + state
- Loading skeleton; empty; error `role="alert"`; stale `as_of`. Toggle filter → URL + `setPage(1)`.
- Search: debounce 300ms, tự reset page, cancel `AbortController` cũ.
- A11y: `aria-label` trên Select/Input/Button, `scope="col"`, `role="alert"`, `sr-only sm:not-sr-only`.
- Targets icon action `h-9` (36px) — cần review lên ≥44px theo WCAG.

## 4. Hạ tầng & contract
- API: `GET /api/v1/customers` (envelope `data.{items,pagination,summary}`, `as_of`, `data_quality`).
- Filter/sort params: `search`, `industry`, `status`, `has_project`, `page`, `page_size` (cap 100), `sort`.
- Scope deny-by-default; RLS là lớp chặn cuối.
- Migration 003 (seed) + 008 (+5 cột) + 009 (consent) + 010 (code) — idempotent.
