# 📖 FDI_Project — Hướng dẫn sử dụng (User Guide)

> 📁 **Vị trí tài liệu:** `docs/USER_GUIDE.md`  
> Phiên bản 1.0 · Ngày lập 2026-11-17 · Ngôn ngữ: Tiếng Việt  
> Đối tượng: 4 vai trò **Nhân viên (Employee), Leader, Manager, Director**.

---

## 0. Về tài liệu này

Hướng dẫn dùng hệ thống website quản lý dự án, khách hàng, thiết bị, sự cố, bảo trì
và báo cáo. Mỗi luồng có **placeholder ảnh màn hình** — chưa có ảnh thật nên để chỗ
trống (`[ẢNH: ...]`) để bổ sung sau (xem §7).

> ⚠️ Hệ thống là **website nội bộ**, dùng cho môi trường tin cậy. Không nhập dữ liệu
> nhạy cảm của khách (mật khẩu, IP quản trị, thông tin ngân hàng/NDA) vào bất kỳ field nào.

---

## 1. Đăng nhập

1. Mở địa chỉ website (URL do quản trị cung cấp).
2. Nếu chưa đăng nhập, hệ thống tự chuyển tới trang **Đăng nhập** (`/login`).
3. Nhập **Email** và **Mật khẩu** → nhấn **Đăng nhập**.
4. Thành công → chuyển tới `/dashboard`. Sai → thông báo lỗi hiển thị ngay trên form.

> [ẢNH: màn hình đăng nhập `/login` — ô email, mật khẩu, nút Đăng nhập, thông báo lỗi.]

**Đăng xuất:** nhấn nút **Đăng xuất** trên thanh điều hướng (sidebar) → quay lại `/login`.

**Lưu ý phiên đăng nhập:** cookie `sb-access-token` được lưu dạng HttpOnly (JS không đọc được).
Nếu hết hạn, hệ thống tự yêu cầu đăng nhập lại.

---

## 2. Giao diện chung

Sau khi đăng nhập, màn hình gồm:

- **Sidebar (thanh bên trái)**: menu điều hướng. Menu tự ẩn theo vai trò (xem §3).
- **Top bar**: tiêu đề trang, nút thu gọn sidebar, nút đăng xuất.
- **Nội dung chính**: bảng dữ liệu, form, KPI.
- **Mobile**: menu dưới cùng (bottom nav) gồm Dashboard / Dự án / Cảnh báo / Báo cáo.

Trên bảng dữ liệu bạn có: **ô tìm kiếm**, **lọc**, **sắp xếp**, nút **Thêm mới**, **Sửa**, **Xóa**
(tùy quyền). Mỗi thao tác có **toast thông báo** kết quả ở góc phải trên.

> [ẢNH: giao diện tổng thể — sidebar + top bar + bảng dữ liệu + toast.]

---

## 3. Menu theo vai trò (RBAC mềm)

| Menu | Nhân viên | Leader | Manager | Director |
|---|---|---|---|---|
| Dashboard | Phần việc của mình | Của team | Của phòng | Toàn công ty |
| Khách hàng | Xem | Xem, sửa liên hệ | Thêm/Sửa | Toàn quyền, hợp đồng & giá trị |
| Dự án | Xem & cập nhật được gán | Tạo/Sửa team, duyệt checklist | Toàn phòng, đổi trạng thái | Xem tất cả, duyệt nghiệm thu |
| Thiết bị | Nhập khi được gán | Sửa/Duyệt | Sửa/Xóa | Xem |
| Cảnh báo | Nhận & xử lý | Giao việc, đóng | Duyệt RCA, xem SLA | Xem báo cáo |
| Bảo trì | Thực hiện | Lập lịch | Duyệt kế hoạch | Xem |
| Công việc | Của mình | Giao cho team | Giao cho Leader | Xem |
| Báo cáo | Tạo | Duyệt | Duyệt, xuất cho khách | Xem |
| **Quản trị** | ❌ ẩn | ❌ ẩn | ✅ (hạn chế) | ✅ toàn quyền |

> Menu ẩn hoặc nút bị khóa là **phân quyền mềm** (UI). Dữ liệu thật còn được chặn
> bởi RLS ở database — người dùng thường không thể vượt qua.

---

## 4. Hướng dẫn theo vai trò

### 4.1 Nhân viên / Kỹ sư (Employee)

**Mục tiêu:** cập nhật công việc, ảnh onsite, serial, xử lý sự cố được gán.

1. Đăng nhập → **Dashboard**: xem các KPI **phần việc của mình**.
2. Vào **Dự án** (`/projects`): chỉ thấy dự án được gán; cập nhật tiến độ, thêm ảnh/site report.
3. Vào **Thiết bị** (`/devices`): nhập serial khi được gán.
4. Vào **Cảnh báo** (`/alerts`): nhận sự cố, cập nhật trạng thái xử lý.
5. Vào **Bảo trì** (`/maintenance`): thực hiện theo checklist, ghi kết quả.
6. Vào **Báo cáo** (`/reports`): tạo báo cáo khảo sát/triển khai/bảo trì, đính kèm ảnh (1–20 ảnh, mỗi ≤5MB).
7. **Công việc**: chỉ thấy việc gán cho mình.

> Không thấy menu **Quản trị** — đây là thiết kế đúng.

> [ẢNH: Dashboard mức Employee + form tạo Site Report.]

**Luồng phổ biến:** nhận cảnh báo → mở dự án liên quan → kiểm tra thiết bị (serial) →
xử lý → cập nhật trạng thái sự cố → tạo site report có ảnh.

---

### 4.2 Leader

**Mục tiêu:** quản lý team, giao việc, duyệt bàn giao.

1. **Dashboard**: KPI **của team**.
2. **Dự án**: tạo/sửa dự án của team, duyệt checklist bàn giao (dự án chỉ sang
   "Deployed" khi checklist đầy đủ).
3. **Cảnh báo**: giao việc cho nhân viên, đóng sự cố đã xử lý.
4. **Công việc**: giao cho team, đặt hạn & ưu tiên.
5. **Khách hàng**: xem, sửa thông tin liên hệ.
6. **Bảo trì**: lập lịch cho team.
7. **Báo cáo**: duyệt báo cáo của nhân viên.

> [ẢNH: màn hình giao việc từ cảnh báo + duyệt checklist dự án.]

**Luồng phổ biến:** xem cảnh báo mới → giao việc cho nhân viên → theo dõi tiến độ →
duyệt site report → duyệt checklist bàn giao dự án.

---

### 4.3 Manager

**Mục tiêu:** tiến độ phòng, duyệt kế hoạch, SLA, thêm user/team.

1. **Dashboard**: KPI **của phòng** (sự cố, SLA, bảo trì sắp hết hạn).
2. **Dự án**: xem toàn bộ dự án phòng, đổi trạng thái.
3. **Khách hàng**: thêm/sửa hồ sơ, xem hợp đồng & giá trị.
4. **Cảnh báo**: duyệt RCA, xem báo cáo SLA.
5. **Bảo trì**: duyệt kế hoạch.
6. **Công việc**: giao cho Leader.
7. **Báo cáo**: duyệt, xuất PDF cho khách.
8. **Quản trị** (`/admin`): thêm user/team (hạn chế theo phạm vi phòng).
9. **Cấu hình quyền** (`/admin/roles`): xuất/nhập cấu hình vai trò.

> [ẢNH: Dashboard mức Manager + trang Quản trị user.]

**Luồng phổ biến (export/import quyền):**
1. Vào **Quản trị → Cấu hình quyền** (`/admin/roles`).
2. Nhấn **Xuất cấu hình** → tải file JSON (danh sách user + ma trận quyền).
3. Mở file, chỉnh `role`/`team`/`active` cho cần thiết (role hợp lệ: `employee`,
   `leader`, `manager`, `director`).
4. Nhấn **Chọn file** → chọn file vừa sửa → hệ thống cập nhật theo email.
5. Xem toast kết quả: `Cập nhật X/Y user`. Mỗi thay đổi được ghi audit log.

> Lưu ý: chỉ cập nhật user **đã tồn tại**; không tự hạ quyền của chính mình;
> muốn tạo user mới phải qua màn hình Quản trị (đặt mật khẩu).

> [ẢNH: trang `/admin/roles` — nút Xuất, ô chọn file, bảng ma trận quyền.]

---

### 4.4 Director

**Mục tiêu:** bức tranh tổng thể, rủi ro, SLA toàn công ty, duyệt nghiệm thu.

1. **Dashboard**: **xem toàn công ty** — tổng dự án/khách/site, sự cố theo mức độ,
   SLA compliance, hợp đồng sắp hết hạn (30/60/90 ngày), công việc quá hạn, lịch bảo trì.
2. **Dự án**: xem tất cả, duyệt nghiệm thu.
3. **Khách hàng**: toàn quyền, xem hợp đồng & giá trị.
4. **Thiết bị / Cảnh báo / Bảo trì / Công việc / Báo cáo**: chỉ xem (theo ma trận).
5. **Quản trị**: toàn quyền — user, team, vai trò, audit log, cấu hình SLA.
6. **Cấu hình quyền** (`/admin/roles`): export/import như Manager nhưng không bị giới hạn.

> [ẢNH: Dashboard toàn công ty (Director) + bảng audit log trong Quản trị.]

**Luồng phổ biến:** mở Dashboard buổi sáng → xem KPI toàn công ty → bấm KPI để
drill-down vào chi tiết → duyệt nghiệm thu dự án → review audit log trong Quản trị.

---

## 5. Luồng nghiệp vụ phổ biến (tổng hợp)

### 5.1 Luồng cảnh báo → xử lý sự cố
```
Phát hiện sự cố → tạo/nhận alert (severity) → Leader giao việc → Engineer xử lý
→ cập nhật trạng thái → Manager duyệt RCA → đóng sự cố → ghi audit
```

### 5.2 Luồng triển khai dự án
```
Manager tạo khách + dự án → Leader lập milestone/ checklist → Engineer nhập thiết bị (serial),
ảnh onsite, site report → đổi trạng thái deployed (khi đủ checklist) → Director duyệt nghiệm thu
```

### 5.3 Luồng báo cáo & xuất PDF
```
Engineer tạo report + ảnh → Leader duyệt → Manager duyệt & xuất PDF gửi khách
```

### 5.4 Luồng cấu hình quyền (Manager/Director)
```
/admin/roles → Xuất JSON → chỉnh role/team/active → Nhập JSON → toast kết quả → audit log
```

---

## 6. Xử lý tình huống thường gặp

| Tình huống | Cách xử lý |
|---|---|
| Không vào được `/admin` | Đúng nếu bạn là Employee/Leader. Liên hệ Manager/Director. |
| Upload ảnh thất bại | Kiểm tra ≤5MB, định dạng JPEG/PNG/HEIC, thử lại (retry). |
| Không thấy dữ liệu của dự án khác | Đúng theo phân quyền scope; không phải lỗi. |
| Quá nhiều request → 429 | Chờ vài giây rồi thử lại (giới hạn 100 request/phút). |
| Quên mật khẩu | Liên hệ quản trị viên (không tự reset nếu không có email recovery). |
| Import quyền báo "user chưa tồn tại" | Tạo user trước qua màn hình Quản trị rồi import lại. |

---

## 7. Placeholder ảnh màn hình

Tài liệu này **chưa có ảnh màn hình thật**. Các vị trí cần bổ sung:

| STT | Địa điểm trong tài liệu | Mô tả ảnh cần chụp |
|---|---|---|
| 1 | §1 Đăng nhập | Trang `/login` với form + thông báo lỗi |
| 2 | §2 Giao diện chung | Sidebar + top bar + bảng + toast |
| 3 | §4.1 Employee | Dashboard employee + form Site Report |
| 4 | §4.2 Leader | Giao việc từ alert + duyệt checklist |
| 5 | §4.3 Manager | Dashboard manager + trang Quản trị user |
| 6 | §4.3 Manager | Trang `/admin/roles` (export/import + ma trận) |
| 7 | §4.4 Director | Dashboard toàn công ty + audit log |

> Khi có ảnh, lưu vào `assets/` (thư mục đã tồn tại) và thay `[ẢNH: ...]` bằng
> `![Mô tả](../assets/ten-anh.png)`. Không chèn ảnh bịa hoặc link ngoài không kiểm chứng.

---

*Người lập: [Tên] – [Vai trò] – 2026-11-17 – v1.0*  
*Nguồn: `product.md`, `rbac_matrix.md`, `roadmap.md`, luồng code thực tế (`app/`, `components/`).*
