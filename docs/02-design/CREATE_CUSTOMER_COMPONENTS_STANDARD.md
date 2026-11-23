# Create Customer — Component & UI Standard

> **Trạng thái:** v1.0 · Chuẩn thiết kế cho route `/customers/new` (Phase 1).
> Đây là **target contract**, không phải mô tả code hiện hữu. Hiện trạng là modal generic trong `CrudPage` (xem `../04-governance/CREATE_CUSTOMER_PLAN.md` §1).
> Nguồn: mockup `Thêm khách hàng mới` + `02_CREATE_CUSTOMER_UI_SPEC` (bundle gốc) — đã được phản biện và chốt lại theo schema đang chạy.

## 1. Nguyên tắc xung đột (Dev Director đã chốt)

| Đề xuất spec/mockup | Quyết định | Lý do (evidence) |
|---|---|---|
| REST `POST /api/v1/customers` + bảng `contacts`, `customer_contact_roles` | **Giữ Supabase query trực tiếp**, bảng `customers` flat | Kiến trúc repo đang chạy; `app/api/customers/` rỗng. Rebuild REST = phá schema đang dùng |
| `code` do client nhập / prefix `CUS-` | **BỎ input — readonly, hiển thị mã THẬT** (hardening 2026-11-19; 010 apply 2026-11-23) | Input UI-only nhưng KHÔNG vào payload → user nhập xong mã biến mất (false affordance + mất data). DB có `customers.code` (migration 010); form gọi RPC `fdi_next_customer_code` lúc submit, ô mã hiện `CUS-2026-NNN` thật hoặc "Tự động tạo" trước khi lưu |
| Date picker `31/01/2025` cho Ngày tạo | **Không render**, backend `created_at DEFAULT now()` | Spec cấm user sửa `created_at`; DB đã đúng |
| 3 ô liên hệ là contact selector | **Text input** Phase 1, gợi ý "Tên + SĐT" | DB lưu `TEXT`; selector cần bảng `contacts` (Phase 2) |
| `industry_id` uuid | **`industry` TEXT + Select options cố định** | Schema đang chạy là `industry TEXT` |
| Hardcode USD / value lộ ra | **Không có currency/value trên màn này** | Màn tạo hồ sơ, không hiển thị giá trị hợp đồng |
| `editableBy: ['manager','director']` | **`['project_manager','director','super_admin']`** | `ROLES` v1 chỉ có 6 giá trị; `manager`/`leader` không tồn tại |
| DNC / consent (field Zoho/Sugar có) | **THÊM `consent_contact` checkbox** (default false) — 2026-11-19 | Compliance: outbound action phải biết khách từ chối liên hệ. Không copy revenue/website/employees (ngoài domain FDI). Migration 009; `true` → gửi `consent_contact_at` ISO, `false` → `null` |
| RBAC route gate `customer.create` | **Cấp cho `director` + `project_manager` + `super_admin`**; mirror SQL migration 009 thêm `super_admin` vào `fdi_current_role()`/`fdi_is_manager_plus()` | Trước đó chỉ `super_admin` có permission nhưng RLS whitelist lại loại `super_admin` → deadlock, không role nào tạo ổn định |

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
| Mã khách hàng | readonly display, mã THẬT `CUS-YYYY-NNN` | Không | `customers.code` (migration 010) | **BỎ input** (hardening 2026-11-19): input UI-only gây mất dữ liệu. Form gọi RPC `fdi_next_customer_code` khi submit; ô hiện mã thật sau khi lưu, "Tự động tạo" trước đó. DB trigger là rào cuối |
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
| Đồng ý liên hệ | `Checkbox` | Không | `customers.consent_contact`** | default `false`; `true` → gửi `consent_contact_at` ISO, `false` → `null`. Migration 009 |
| Ngày tạo | readonly | Hệ thống | `customers.created_at` | Không render trong form |

`*` = cột bổ sung bởi migration 008 · `**` = cột bổ sung bởi migration 009 (xem plan §3). Field không có cột (`code`, `created_at`) chỉ hiển thị/ready, không gửi payload.

> **Minh họa, không phải dữ liệu thật:** prefix `CUS-` theo mockup. DB **đã có** `customers.code` (migration 010, apply 2026-11-23) → ô hiển thị mã THẬT do backend sinh, không có ô nhập. Không suy mã từ `tax_id`. DNC (`consent_contact`) là boolean có audit, **không lưu trong `notes`**.

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
- Role được cấp `customer.create`: `super_admin`, `director`, `project_manager` (`lib/rbac/policy.core.mjs` ROLE_PERMISSIONS, hardening 2026-11-19). **Không dùng** `manager`/`leader`; deny cho engineer/support/customer_viewer.
- RLS là lớp chặn cuối: `fdi_customers_insert` → `fdi_is_manager_plus()`. **Sau migration 009** hàm này gồm `manager, director, super_admin` (trước đó whitelist `fdi_current_role()` loại `super_admin` → deadlock). Hai đầu client+SQL phải đồng bộ.
- API-compatible: mọi mutation đi qua `supabase.from('customers').insert(...)`; payload optional trống = `null`, email lowercase, name ≥2 ký tự, phone sai format chỉ cảnh báo (không chặn submit); không gửi `code`/`created_at`.

## 6. Dùng primitive có sẵn (`components/ui/ui.tsx`)

| Primitive | Dùng cho |
|---|---|
| `Card`, `CardHeader`, `CardTitle`, `CardContent` (`:102-128`) | 3 card + summary panel |
| `Input`, `Textarea`, `Label`, `Select` (`:68-96`, `:226`) | Field controls |
| `Button` variant `outline`/default (`:59`) | Hủy / Lưu |
| `Badge` (`:195`) | Nhãn "Tự động tạo", nhãn required, summary Mã |
| `Spinner` (`:314`) | Trạng thái "Đang lưu..." trên nút Lưu |
| `useToast` (`:497`) | Thông báo lưu |

Token màu từ `app/globals.css:13-83`: `--primary #087f30`, `--border #d9e4f2`, `--muted #445a7b`, `--surface #ffffff`. Không hardcode hex mới.

## 7. Responsive & accessibility

- `<lg`: single column, summary xuống dưới form, footer sticky.
- **Footer sticky bền (2026-11-23):** footer phải nằm **ngoài cột grid** (không lồng trong `lg:col-span-2`) vì flex item `stretch` khiến chiều cao chỉ bằng nội dung → sticky không phủ viewport. Nền **đục tuyệt đối** `bg-[#ffffff]` + bóng đổ nhẹ; **cấm** `bg-*/95` / `backdrop-blur` (chữ card lọt qua khi cuộn).
- **Modal căn giữa viewport:** đặt trực tiếp trong `<form>` (không lồng cột), `fixed inset-0 z-50 flex !items-center justify-center`. Primitive `Modal` (`components/ui/ui.tsx`) đã chốt `!items-center` + `p-4` + `overflow-y-auto`; `ModalContent` có `mx-4`.
- Mọi input có `<Label htmlFor>`; required có dấu `*` + giải thích; lỗi có `aria-invalid` + `aria-describedby`.
- Focus ring theo token; target ≥44px; thứ tự tab theo thứ tự field; không mất dữ liệu khi submit lỗi.

## 8. Điểm sạch / Điểm cần làm rõ

**Điểm sạch:** schema flat đang chạy covers phone/email/industry/3 contact; `created_at` đúng chuẩn backend; RLS chặn mutation; primitive + token đầy đủ; **hardening 2026-11-19**: bỏ input mã giả, RBAC 2 đầu đồng bộ, consent/DNC checkbox, validation blur + focus lỗi đầu, phone warning không chặn, null thay ''.

**Cần làm rõ:** migration 008 (đã apply theo user) + **migration 009 chưa apply** → cột `consent_contact` chưa tồn tại trên DB thật; user phải chạy 009 trong SQL Editor trước khi bấm Lưu (nếu không → `PGRST204`). Duplicate check/idempotency/transaction/audit correlation → Phase 2. Không claim production-ready khi 009 chưa apply.

> **Bổ sung 2026-11-23:** migration **010** (mã `CUS-YYYY-NNN` do DB sinh) + **011** (RLS mở scope cho PM) + **012** (sửa gốc `fdi_current_role()` whitelist JWT thiếu `project_manager`). Riêng 011 **chưa đủ** — 012 mới là bản sửa gốc cho lỗi "mã KH không hiện khi sửa". Xem `DEPLOY_AND_MIGRATION.md` §16e.

> **Bổ sung 2026-11-23 (v2) — THIẾT KẾ LẠI THEO GỐC ADD LEAD + NEXT ACTION.** User chốt: lấy `AddLeadForm.tsx` của SoftNET CRM làm gốc thiết kế lại form Thêm Khách hàng, và bổ sung mọi hoạt động liên quan khách hàng/dự án vào **bảng Activities**. Chi tiết:
> - **Layout**: section đánh số + icon (`1. Thông tin doanh nghiệp` · `2. Người liên hệ chính` · `3. Next Action đầu tiên` · `4. Thông tin bổ sung`), grid `lg:grid-cols-[minmax(0,1fr)_272px]`, field grid `md:grid-cols-3`.
> - **Panel phải 3 card**: Kiểm tra trùng lặp · Hoàn thiện dữ liệu (5 mục, `CheckCircle`/`Circle`) · Tóm tắt khách hàng.
> - **Section 3 Next Action**: checkbox `Tạo Next Action đầu tiên` + Loại hoạt động* + Ngày và giờ* (`datetime-local`) + Nội dung cần thực hiện. Ẩn section khi sửa.
> - **Lưu qua RPC `create_customer_with_activity`** (migration **013**, nguyên tử + idempotent qua `metadata.idem_key`) — không còn insert trực tiếp.
> - **Bảng `activities` đa hình** (`entity_type` = customer/project/site, `entity_id` không FK vật lý) + lookup `activity_types`/`channels` + RLS theo `fdi_can_read` + RPC `log_activity`. Tham chiếu `migrations/013_customer_activities.sql`.
