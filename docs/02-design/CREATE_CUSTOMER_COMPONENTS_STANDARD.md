# Create Customer — Component & UI Standard

> **Trạng thái:** v1.0 · Chuẩn thiết kế cho route `/customers/new` (Phase 1).
> Đây là **target contract**, không phải mô tả code hiện hữu. Hiện trạng là modal generic trong `CrudPage` (xem `../04-governance/CREATE_CUSTOMER_PLAN.md` §1).
> Nguồn: mockup `Thêm khách hàng mới` + `02_CREATE_CUSTOMER_UI_SPEC` (bundle gốc) — đã được phản biện và chốt lại theo schema đang chạy.

## 1. Nguyên tắc xung đột (Dev Director đã chốt)

| Đề xuất spec/mockup | Quyết định | Lý do (evidence) |
|---|---|---|
| REST `POST /api/v1/customers` + bảng `contacts`, `customer_contact_roles` | **Giữ Supabase query trực tiếp**, bảng `customers` flat | Kiến trúc repo đang chạy; `app/api/customers/` rỗng. Rebuild REST = phá schema đang dùng |
| `code` do client nhập / prefix `CUS-` | **Input prefix `CUS-` (UI-only, KHÔNG gửi payload; DB chưa có cột `code`)** | Prefix `CUS-` là minh họa theo mockup — DB chưa có cột `code`; input chỉ nhận phần sau prefix, backend tự sinh khi có migration |
| Date picker `31/01/2025` cho Ngày tạo | **Không render**, backend `created_at DEFAULT now()` | Spec cấm user sửa `created_at`; DB đã đúng |
| 3 ô liên hệ là contact selector | **Text input** Phase 1, gợi ý "Tên + SĐT" | DB lưu `TEXT`; selector cần bảng `contacts` (Phase 2) |
| `industry_id` uuid | **`industry` TEXT + Select options cố định** | Schema đang chạy là `industry TEXT` |
| Hardcode USD / value lộ ra | **Không có currency/value trên màn này** | Màn tạo hồ sơ, không hiển thị giá trị hợp đồng |
| `editableBy: ['manager','director']` | **`['project_manager','director','super_admin']`** | `ROLES` v1 chỉ có 6 giá trị; `manager`/`leader` không tồn tại |

## 2. Layout

- AppShell/sidebar/topbar giữ nguyên; nav `Customers` active (`components/ClientBody.tsx:80`).
- Breadcrumb dạng text: `Trang chủ / Khách hàng / Thêm khách hàng` (repo chưa có primitive Breadcrumb — không tự tạo component mới).
- Tiêu đề `Thêm khách hàng mới`; subtitle: `Tạo hồ sơ khách hàng (doanh nghiệp/đơn vị) để quản lý dự án, dịch vụ và hỗ trợ vận hành.`
- Desktop `lg:grid-cols-3`: form chiếm 2 cột, panel tóm tắt 1 cột, gap 16–24px.
- Form gồm 3 `Card` theo thứ tự: **Thông tin doanh nghiệp**, **Người liên hệ chính**, **Thông tin bổ sung**.
- Footer action bar `sticky bottom-0`: `Hủy` (secondary) → `/customers`; `Lưu khách hàng` (primary green, icon `Save`).

## 3. Field contract (Phase 1)

| Field | UI | Bắt buộc | Cột DB | Ghi chú |
|---|---|---|---|---|
| Tên khách hàng | `Input` text | Có | `customers.name` | Trim, 2–255 ký tự |
| Mã khách hàng | `Input` text + prefix `CUS-` (UI-only) | Không | — | Prefix `CUS-` là **minh họa** theo mockup; KHÔNG gửi payload, DB chưa có cột `code` |
| Mã số thuế | `Input` text | Không | `customers.tax_id`* | Giữ chuỗi; duplicate check Phase 2 |
| Ngành nghề | `Select` | Không | `customers.industry` | Options cố định lưu dạng TEXT |
| Địa chỉ trụ sở | `Input` text | Có | `customers.headquarters_address`* | Text tự do |
| Người liên hệ chính | `Input` text | Có | `customers.primary_contact_name`* | Gợi ý "Họ tên + SĐT" |
| Chức vụ | `Input` text | Không | `customers.primary_contact_position`* | ≤120 ký tự |
| Số điện thoại | `Input` tel | Có | `customers.phone` | Chuẩn hoá E.164 khi có country code |
| Email | `Input` email | Có | `customers.email` | Trim + lowercase domain |
| Liên hệ kỹ thuật | `Input` text | Không | `customers.contact_technical` | Phase 1 = text |
| Liên hệ thương mại | `Input` text | Không | `customers.contact_commercial` | Phase 1 = text |
| Liên hệ khẩn cấp | `Input` text | Không | `customers.contact_emergency` | Gợi ý hotline 24/7 |
| Ghi chú | `Textarea` | Không | `customers.notes`* | `maxLength=500`, counter `n / 500` |
| Ngày tạo | readonly | Hệ thống | `customers.created_at` | Không render trong form |

`*` = cột bổ sung bởi migration 008 (xem plan §3). Field không có cột (`code`, `created_at`) chỉ hiển thị/ready, không gửi payload.

> **Minh họa, không phải dữ liệu thật:** prefix `CUS-` trên ô "Mã khách hàng" và trong panel tóm tắt chỉ là illustration theo mockup. DB chưa có cột `code` → giá trị này KHÔNG bao giờ vào payload `insert`; backend tự sinh `CUS-YYYY-XXX` ở Phase 2 (xem plan §2). Không hiểu prefix này là mã khách hàng đã tồn tại.

## 4. Validation & state

- Validate inline khi blur + khi submit; lỗi hiển thị **dưới field** (`text-destructive`), không chỉ tô viền.
- Required: name, headquarters_address, primary_contact_name, phone, email — chặn submit nếu trống sau trim.
- Email: `type="email"` + check regex cơ bản. Phone: cho phép `0xxxxxxxxx` hoặc `+84xxxxxxxx`; chỉ cảnh báo, không chặn cứng.
- Summary panel cập nhật realtime từ state form; giá trị trống hiện `—`.
- Khi lưu: disable nút + spinner; thành công toast + `router.push('/customers')`; thất bại giữ nguyên form + hiện lỗi.
- `Hủy` về list; nếu form có thay đổi → `window.confirm('Rời trang và bỏ thay đổi?')` (phase sau thay bằng ConfirmDialog).
- Không gửi `created_at` / `id` từ client.

## 5. RBAC

- Route gate: `hasPermission(role, 'customer.create')` — `lib/rbac/policy.ts:17`. Không có quyền → render trạng thái "Không có quyền truy cập", không render form.
- Role hợp lệ: `super_admin`, `director`, `project_manager` (`lib/rbac/policy.core.mjs:4-6`). **Không dùng** `manager`/`leader`.
- RLS là lớp chặn cuối: `fdi_customers_insert` chỉ cho `fdi_is_manager_plus()` (`migrations/002_rls_policies.sql:306-307`).
- API-compatible: mọi mutation đi qua `supabase.from('customers').insert(...)`; không tự sinh `code` ở client.

## 6. Dùng primitive có sẵn (`components/ui/ui.tsx`)

| Primitive | Dùng cho |
|---|---|
| `Card`, `CardHeader`, `CardTitle`, `CardContent` (`:102-128`) | 3 card + summary panel |
| `Input`, `Textarea`, `Label`, `Select` (`:68-96`, `:226`) | Field controls |
| `Button` variant `outline`/default (`:59`) | Hủy / Lưu |
| `Badge` (`:195`) | Nhãn "Tự động tạo", nhãn required |
| `useToast` (`:497`) | Thông báo lưu |

Token màu từ `app/globals.css:13-83`: `--primary #087f30`, `--border #d9e4f2`, `--muted #445a7b`, `--surface #ffffff`. Không hardcode hex mới.

## 7. Responsive & accessibility

- `<lg`: single column, summary xuống dưới form, footer sticky.
- Mọi input có `<Label htmlFor>`; required có dấu `*` + giải thích; lỗi có `aria-invalid` + `aria-describedby`.
- Focus ring theo token; target ≥44px; thứ tự tab theo thứ tự field; không mất dữ liệu khi submit lỗi.

## 8. Điểm sạch / Điểm cần làm rõ

**Điểm sạch:** schema flat đang chạy đã covers phone/email/industry/3 contact; `created_at` đúng chuẩn backend; RLS chặn mutation; primitive + token đầy đủ.

**Cần làm rõ:** migration 008 chưa apply → 5 cột mới chưa tồn tại trên DB thật; application phải chạy 008 trước khi bấm Lưu với các field đó. Duplicate check/idempotency/transaction/audit correlation → Phase 2. Không claim production-ready khi migration chưa apply.
