# Customers — Contact channels standard (bảng + right sidebar)

> **Trạng thái:** v1.0 · Chuẩn cho việc gộp cột liên hệ + hiển thị kênh liên hệ bổ sung.
> Nguồn dữ liệu: `customers.phone`, `customers.email`,
> `customers.contact_technical`, `customers.contact_commercial`, `customers.contact_emergency`
> (`migrations/001_initial_schema.sql:41-46`) — KHÔNG bịa giá trị.

## 1. Yêu cầu & quyết định

| Yêu cầu user | Quyết định | Lý do |
|---|---|---|
| Gộp cột Email + Điện thoại thành "Liên Hệ" | **Một cột duy nhất**, bảng vẫn 9 cột (8 tiêu đề + `#`) | Giảm chiều rộng bảng; mọi kênh liên hệ nằm chung một chỗ |
| Số điện thoại click to call | `<a href="tel:...">` + icon `Phone` | Chuẩn mobile/desktop dialer |
| Email click gửi mail | `<a href="mailto:...">` + icon `Mail` | Mở client mail, KHÔNG tự gửi |
| Biểu tượng copy cho SĐT/email | `CopyButton` (icon `Copy` → `Check` khi đã chép) | Phản hồi rõ ràng, không cần toast ngoài |
| Sidebar hiển thị thêm Liên hệ kỹ thuật / Thương mại / Khẩn cấp | Thêm khối **Liên hệ bổ sung** trong `CustomerDetailPanel` | PSM cần hotline 24/7 và contact kỹ thuật khi có sự cố |

## 2. Bảng danh sách — cột "Liên hệ"

- Vị trí: thay 2 cột `Email` và `Điện thoại` (trước đây tách riêng).
- Thứ tự tiêu đề (9 cột): `#` · `Tên khách hàng` · `Người liên hệ` · `Liên hệ` · `Dự án` · `Vòng đời` · `Ngày tạo` · `Thao tác`.
- Ô "Liên hệ" = `ContactCell({ phone, email })`:
  - Dòng 1: icon `Phone` + link `tel:` (số chuẩn hoá) + `CopyButton`.
  - Dòng 2: icon `Mail` + link `mailto:` + `CopyButton`.
  - Cả hai rỗng → `—` (không render link rỗng).
  - Mỗi nút trong ô gọi `stopPropagation()` → bấm copy/link KHÔNG mở detail panel.
- Sort: cột "Liên hệ" không sort được (giữ văn bản thường, không phải button).

## 3. Right sidebar — `CustomerDetailPanel`

- Nhóm **Liên hệ** trong "Thông tin chính": SĐT + Email thành link `tel:`/`mailto:` kèm `CopyButton`.
- Khối mới **Liên hệ bổ sung**: ba kênh Kỹ thuật / Thương mại / Khẩn cấp.
  - Giá trị DB là **text tự do** (user nhập "Tên + SĐT", email, hoặc cả hai) → parse bằng
    `splitContactText()` để tách `name` / `phone` / `email`; KHÔNG in thẳng ra màn hình.
  - Tên liên hệ hiện ở dòng chính; số/email hiện ở dòng phụ kèm link + copy.
  - Rỗng → `—`; cả ba kênh rỗng → empty state "Chưa có liên hệ bổ sung." (KHÔNG cảnh báo giả).

## 4. Helper dùng chung — `components/customers/contact.ts`

| Export | Việc |
|---|---|
| `normalizePhone` | Trim, giữ số + `+` đầu → chuỗi dùng cho `tel:` |
| `phoneDisplay` | Chuỗi hiển thị cho người dùng |
| `isEmailLike` | Kiểm tra dạng email cơ bản |
| `emailHref` | Trả `mailto:<email>` hoặc `''` khi rỗng |
| `splitContactText` | Tách name/phone/email từ text tự do (email regex + cụm 9–11 số) |
| `CopyButton` | Nút icon tự xử lý clipboard + fallback `execCommand('copy')`; nháy `Check` 1500ms |
| `ContactCell` | Ô gộp cho bảng |

**Pitfalls:**
- Clipboard API có thể bị chặn (iframe/HTTP) → `CopyButton` PHẢI có fallback `document.execCommand('copy')`.
- `useToast()` của repo KHÔNG có `toast()`; gọi `addToast(...)`. (`components/ui/ui.tsx`)
- Copy state phải theo key động (`'phone-' + id`), không dùng boolean chung — nếu không
  icon "đã sao chép" nhảy sai sang dòng khác.
- Icon chỉ lấy từ `lucide-react`; không vẽ SVG tay.

## 5. Contract API

- `GET /api/v1/customers` phải `select` và map đủ 3 cột `contact_*`; `SEARCH_FIELDS` gồm
  3 cột này để tìm khách hàng theo số hotline kỹ thuật/khẩn cấp.
- `GET /api/v1/customers/[id]` đã select 3 cột (dùng cho form sửa) — không cần sửa.
- Type `Customer` (`components/customers/types.ts`) bổ sung 3 optional field.

## 6. Regression

`tests/customer-contact-merge.test.mjs` — 9 test: cột bảng, helper tel/mailto/copy,
API select 3 cột, type, panel hiển thị + parse + a11y.
