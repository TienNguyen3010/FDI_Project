# 🏗️ FDI_Project – Website Quản Lý Tất Cả Dự Án, Khách Hàng, Site (Bản Toàn Quyền)

> Phiên bản 1.0 · Dành cho nhóm phát triển  
> Ngôn ngữ: Tiếng Việt · Không chứa code  
> Phạm vi: Website nội bộ (CNTT, VoIP, Viễn thông, Network Infrastructure)  
> Phiên bản áp dụng: Quản lý tất cả dự án, tất cả khách hàng, tất cả site; phân quyền người dùng theo role.

---

## 1. Quyết định đã chốt

| Hạng mục | Quyết định |
|---|---|
| Hình thức xây dựng | Tự xây toàn bộ trên nền tảng Claude (trang web chạy trong Claude) |
| Phạm vi sử dụng | Chỉ nội bộ |
| Mục tiêu chính | Quản lý tất cả dự án, tất cả khách hàng, tất cả site, phân quyền người dùng theo role |
| Phân quyền | 4 cấp cao nhất: Nhân viên, Leader, Manager, Director |

---

## 2. Định vị hệ thống (3 trục)

Hệ thống gộp 3 bài toán thường bị tách rời:

| Trục | Câu hỏi phải trả lời | Module |
|---|---|---|
| **Delivery** | Dự án đang ở đâu, trễ gì, đã bàn giao những gì? | Project |
| **Operation** | Hệ thống khách hàng ổn không, sự cố xử lý tới đâu? | Cảnh báo, Vận hành, Site Report |
| **Business** | Khách nào, hợp đồng nào, SLA ra sao? | Khách hàng, Dashboard |

### Giá trị cốt lõi
- **Thiết bị (serial) là xương sống:** mọi cảnh báo, bảo trì, bảo hành đều bám vào thiết bị. Khi có sự cố biết ngay ai chịu trách nhiệm và bảo hành còn bao lâu.
- Nếu các module chỉ là danh sách rời thì hệ thống chỉ là một file Excel đẹp hơn.

---

## 3. Đối tượng sử dụng

| Vai trò | Nhu cầu chính | Màn hình chính |
|---|---|---|
| **Director** | Bức tranh tổng thể, rủi ro, SLA của tất cả dự án | Dashboard |
| **Manager** | Tiến độ phòng, duyệt kế hoạch, SLA của toàn bộ cơ sở | Dashboard, Project, Sự cố |
| **Leader** | Quản lý team, giao việc, duyệt bàn giao | Project, Công việc |
| **Nhân viên / Kỹ sư** | Cập nhật ảnh onsite, serial, xử lý sự cố | Project, Site Report |

---

## 4. Cấu trúc nội dung từng module

### 4.1 Dashboard (Toàn cục)

**Ở mức quản lý toàn hệ thống:**

- Tổng số dự án, khách hàng, site trên toàn hệ thống
- Số dự án đang chạy, trễ, sắp đến hạn milestone — theo từng phòng ban
- Sự cố đang mở theo mức độ (Critical/Major/Minor) — toàn công ty
- SLA compliance theo khách hàng (tổng hợp)
- Hợp đồng bảo trì sắp hết hạn 30/60/90 ngày — cơ hội upsell
- Công việc quá hạn — toàn phòng
- Danh sách sự cố mới nhất, ticket chưa nhận
- Lịch bảo trì hôm nay và tuần này — toàn công ty

**Tùy chỉnh hiển thị:**
- Lọc theo phòng ban, theo phòng ban
- Lọc theo mức độ, theo trạng thái
- Nhấp chuột vào mỗi KPI để đi đến chi tiết

### 4.2 Cảnh báo (Toàn cục)

- **Nguồn:** nhập tay hoặc dán nội dung từ email/hệ thống monitoring
- **Nội dung:** thiết bị, site, khách hàng, mức độ, thời điểm, trạng thái, người nhận
- **Quy tắc cần định nghĩa:**
  - Ma trận mức độ và thời gian phản hồi (Critical 15 phút, Major 1 giờ)
  - Gộp cảnh báo trùng
  - Escalation khi không ai nhận
  - Maintenance window: không tính sự cố khi bảo trì có kế hoạch

### 4.3 Project (Toàn cục)

| Tab | Nội dung |
|---|---|
| Tổng quan | Khách hàng, giá trị, PM, ngày bắt đầu/kết thúc, % hoàn thành, trạng thái Xanh/Vàng/Đỏ |
| Tiến độ & Milestone | Khảo sát → Thiết kế → Cung cấp thiết bị → Lắp đặt → UAT → Bàn giao → Nghiệm thu; ngày kế hoạch và thực tế, người phụ trách |
| Hình ảnh onsite | Thư viện ảnh theo ngày, site, hạng mục, có chú thích và người chụp |
| Sơ đồ mạng | Sơ đồ logic và vật lý, có version và ngày cập nhật |
| Tủ rack | Sơ đồ vị trí U, thiết bị trong từng rack, ảnh thực tế |
| Thiết bị & Serial | Loại, model, serial, MAC, vị trí rack, ngày bảo hành |
| Tài liệu | SOW, BOM, test report, biên bản nghiệm thu |
| Rủi ro & Vấn đề | Issue log, người xử lý, hạn xử lý |

**Quy tắc quan trọng:** dự án chỉ được chuyển sang "Đã triển khai" khi đủ checklist bàn giao bắt buộc.

### 4.4 Khách hàng (Toàn cục)

- Hồ sơ: tên, ngành, đầu mối liên hệ
- Danh sách site/chi nhánh
- Dịch vụ đang dùng: VoIP, leaseline, MPLS, thiết bị
- Hợp đồng: giá trị, thời hạn, mức SLA, gói bảo trì
- Lịch sử dự án, sự cố, ticket
- "Sức khỏe khách hàng" (số sự cố 90 ngày, vi phạm SLA)

### 4.5 Vận hành (Toàn cục)

| Tab | Nội dung |
|---|---|
| Sự cố (Incident) | Timeline xử lý, RCA, biện pháp khắc phục |
| Bảo trì | Lịch định kỳ và đột xuất, thông báo khách, checklist, kết quả |
| Công việc | Người giao, người nhận, hạn, ưu tiên, liên kết dự án/sự cố |
| Soạn thông báo | Soạn sẵn nội dung gửi email/Zalo/group để copy (không tự gửi được) |

### 4.6 Site Report (Toàn cục)

- Báo cáo khảo sát và báo cáo triển khai/bảo trì
- Template chuẩn: thông tin site, hiện trạng, công việc đã làm, ảnh, tồn đọng, đề xuất, chữ ký xác nhận
- Xuất PDF để gửi khách
- Tổng hợp báo cáo định kỳ theo tuần/tháng

### 4.7 Quản trị (Toàn cục)

- Người dùng, nhóm, vai trò
- Danh mục dùng chung: loại thiết bị, mức độ sự cố, loại dự án, template
- Cấu hình SLA
- Nhật ký hoạt động (audit log): ai sửa gì, lúc nào

---

## 5. Mô hình dữ liệu cốt lõc

### 5.1 Cấu trúc chính

```
Khách hàng ─┬─ Hợp đồng ── SLA
            ├─ Site ──┬─ Rack ── Thiết bị (serial)
            │         └─ Site Report
            └─ Dự án ──┬─ Milestone
                       ├─ Ảnh / Tài liệu / Sơ đồ
                       └─ Công việc
Thiết bị ── Cảnh báo ── Sự cố ── Công việc xử lý
Bảo trì ── (liên kết Site / Thiết bị / Khách hàng)
```

### 5.2 Thuộc tính thiết bị (xương sống)

| Thuộc tính | Mô tả | Kiểu | Ràng buộc |
|---|---|---|---|
| id | Primary key | UUID | PRIMARY KEY |
| project_id | Dự án | UUID FK | NOT NULL |
| site_id | Site/Site | UUID FK | NOT NULL |
| serial | Số serial | String | UNIQUE trong project, NOT NULL |
| type | Loại thiết bị | String | NOT NULL |
| model | Model | String | |
| mac_address | MAC | String | UNIQUE |
| rack_id | Rack hiện tại | UUID FK | |
| location | Vị trí rack | String | |
| warranty_from | Ngày bảo hành | Date | |
| warranty_to | Hạn bảo hành | Date | |
| status | Trạng thái | Enum | ACTIVE, INACTIVE, EXPIRED |
| created_at | Tạo | Timestamp | |
| updated_at | Cập nhật | Timestamp | |

### 5.3 Thuộc tính cảnh báo / sự cố

| Thuộc tính | Mô tả | Kiểu | Ràng buộc |
|---|---|---|---|
| id | Primary key | UUID | PRIMARY KEY |
| device_id | Thiết bị liên quan | UUID FK | NULL |
| site_id | Site liên quan | UUID FK | NULL |
| project_id | Dự án liên quan | UUID FK | NOT NULL |
| severity | Mức độ | Enum | CRITICAL, MAJOR, MINOR |
| status | Trạng thái | Enum | NEW, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, CLOSED |
| priority | Ưu tiên | Enum | LOW, MEDIUM, HIGH, CRITICAL |
| owner_id | Người xử lý | UUID FK | |
| description | Mô tả | Text | NOT NULL |
| source | Nguồn (thủ công, email, webhook) | Enum | |
| created_at | Tạo | Timestamp | |
| updated_at | Cập nhật | Timestamp | |
| resolved_at | Đã giải quyết | Timestamp | |

### 5.4 Thuộc tính bảo trì

| Thuộc tính | Mô tả | Kiểu | Ràng buộc |
|---|---|---|---|
| id | Primary key | UUID | PRIMARY KEY |
| device_id | Thiết bị liên quan | UUID FK | |
| project_id | Dự án | UUID FK | NOT NULL |
| type | Loại | Enum | REGULAR, EMERGENCY |
| schedule | Lịch | JSON | |
| due_date | Hạn | Date | |
| status | Trạng thái | Enum | PLANNED, IN_PROGRESS, COMPLETED, SKIPPED |
| checklist | Danh sách kiểm | JSON | |
| result | Kết quả | Text | |
| created_at | Tạo | Timestamp | |
| updated_at | Cập nhật | Timestamp | |

### 5.5 Thuộc tính công việc

| Thuộc tính | Mô tả | Kiểu | Ràng buộc |
|---|---|---|---|
| id | Primary key | UUID | PRIMARY KEY |
| project_id | Dự án | UUID FK | |
| incident_id | Sự cố liên quan | UUID FK | |
| assignee_id | Người nhận | UUID FK | |
| creator_id | Người giao | UUID FK | |
| type | Loại | Enum | MAINTENANCE, BUG, TASK |
| title | Tiêu đề | String | NOT NULL |
| description | Mô tả | Text | |
| status | Trạng thái | Enum | TODO, IN_PROGRESS, COMPLETED, ON_HOLD |
| priority | Ưu tiên | Enum | LOW, MEDIUM, HIGH, CRITICAL |
| due_date | Hạn | Date | |
| created_at | Tạo | Timestamp | |
| updated_at | Cập nhật | Timestamp | |

### 5.6 Thuộc tính project

| Thuộc tính | Mô tả | Kiểu | Ràng buộc |
|---|---|---|---|
| id | Primary key | UUID | PRIMARY KEY |
| customer_id | Khách hàng | UUID FK | NOT NULL |
| site_id | Site | UUID FK | |
| name | Tên | String | NOT NULL |
| status | Trạng thái | Enum | PLANNED, IN_PROGRESS, DEPLOYED, PAUSED, ENDED |
| start_date | Ngày bắt đầu | Date | |
| end_date | Ngày kết thúc | Date | |
| progress | % hoàn thành | Decimal | 0–100 |
| pm_id | Project Manager | UUID FK | |
| color | Màu | String | Xanh/Vàng/Đỏ |
| checklist | Checklist bàn giao | JSONB | |
| created_at | Tạo | Timestamp | |
| updated_at | Cập nhật | Timestamp | |

### 5.7 Thuộc tính site

| Thuộc tính | Mô tả | Kiểu | Ràng buộc |
|---|---|---|---|
| id | Primary key | UUID | PRIMARY KEY |
| name | Tên | String | NOT NULL |
| customer_id | Khách hàng | UUID FK | NOT NULL |
| address | Địa chỉ | String | |
| contact | Người liên hệ | String | |
| working_hours | Giờ làm việc | JSON | |
| created_at | Tạo | Timestamp | |
| updated_at | Cập nhật | Timestamp | |

### 5.8 Thuộc tính danh mục dùng chung

| Thuộc tính | Mô tả | Kiểu | Ràng buộc |
|---|---|---|---|
| id | Primary key | UUID | PRIMARY KEY |
| name | Tên | String | NOT NULL |
| type | Loại | Enum | DEVICE_TYPE, INCIDENT_TYPE, PROJECT_TYPE, TEMPLATE |
| value | Giá trị | String | |
| color | Màu | String | |
| created_at | Tạo | Timestamp | |
| updated_at | Cập nhật | Timestamp | |

### 5.9 Thuộc tính người dùng

| Thuộc tính | Mô tả | Kiểu | Ràng buộc |
|---|---|---|---|
| id | Primary key | UUID | PRIMARY KEY |
| username | Tên đăng nhập | String | UNIQUE |
| email | Email | String | UNIQUE |
| password_hash | Mật khẩu | String | |
| role | Vai trò | Enum | EMPLOYEE, LEADER, MANAGER, DIRECTOR |
| team | Đội | String | |
| active | Trạng thái | Boolean | |
| created_at | Tạo | Timestamp | |
| updated_at | Cập nhật | Timestamp | |

---

## 6. Quy trình hoạt động sản phẩm

### 6.1 Quy trình chính (Happy path)

```
User log in → DataTable từng dự án → xem tiến độ/milestone → xử lý bảo trì/công việc → site report gửi sĩ số → cảnh báo gửi email/Zalo/group
```

### 6.2 Flow cảnh báo (Alert flow)

**Kịch bản**: Sự cố phát hiện
1. Field engineer hoặc hệ thống phát hiện sự cố.
2. Hệ thống tạo `alert` với `level: high/medium/low`, `type: issue`, `project_id`, `described`, `photo`.
3. Gửi thông tin đến email quản lý, Zalo group, chat group.
4. Người nhận bấm vào → mở Project → xem chi tiết.
5. Gán công việc (maintenance), thay đổi trạng thái.
6. Log history.

### 6.3 Quy trình triển khai dự án

1. Admin tạo khách hàng, thêm dự án.
2. Chọn khách hàng, mục tiêu, người vai trò.
3. Tải máy: tiến độ, công việc, bảo trì.
4. Ghi nhận sản xuất (thiết bị, serial, sơ đồ).
5. Cập nhật trạng thái: deployed.
6. Theo dõi: cảnh báo, báo cáo, bảo trì.

---

## 7. Nội dung đầu vào & Tính năng tương tác

### 7.1 Input / Input fields

| Input | Loại | Mô tả | Trường bắt buộc | Xác thực |
|---|---|---|---|---|
| Name (project/customer) | Text | Tên dự án / khách hàng | Có | Trùng, tối đa 200 ký tự |
| Địa chỉ | Text | Địa chỉ công trình | Có | — |
| Milestone | Date/Relationship | Dự án gạch đầu dòng | Có | — |
| Tiến độ | Text/Percentage | Tiến độ thi công | Có | 0–100% |
| Hình ảnh | Image/Multi | Ảnh triển khai | Có | 1–20 bức, mỗi bức ≤ 5MB |
| Sơ đồ mạng | File (PNG/JPG/PDF) | Tải lên tải | Có | ≤ 10MB |
| Tủ rack | Number | Số tủ | Có | ≥ 0, ≤ 100 |
| Serial | Text | Số serial thiết bị | Có | Không trùng trong project |
| Email | Email | Email báo cáo | Có | Định dạng hợp lệ |
| Phone | Text | Số điện thoại | Có | 10–15 số |
| Text | Text | Mô tả sự cố / công việc | Có | ≥ 10 ký tự |

### 7.2 Upload / Tải file
- **Định dạng**: PNG, JPG, WEBP, PDF (sơ đồ); JPEG, PNG, HEIC (ảnh).
- **Kích thước**: ≤ 10MB (sơ đồ), ≤ 5MB (ảnh).
- **Quy trình**: chọn → xử lý → lưu → hiển thị.

### 7.3 Tương tác
| Tương tác | Mô tả |
|---|---|
| Sync now | Đồng bộ lịch sự |
| Xem | Mở chi tiết |
| Báo cáo sự cố | M_open form báo cáo |
| Tạo công việc | Tạo bảo trì, công việc |

---

## 8. Phân tích & Báo cáo

### 8.1 Dashboard chính

| KPI | Ý nghĩa | Formula/Đo lường |
|---|---|---|
| Total Projects | Tổng số dự án | Đếm |
| Active Projects | Dự án đang triển khai | Filter status=active |
| Deployed Projects | Đã triển khai | Filter status=deployed |
| Open Issues | Sự cố đang mở | Filter status=open |
| Reports New | Báo cáo mới | Filter date=today |
| Photos | Ảnh onsite | Đếm |
| Maintenance | Bảo trì cần thực hiện | Filter due date |

### 8.2 Báo cáo tinh chỉnh (per project, customer, site)
- Tổng số thiết bị, tủ rack, serial, tiến độ, bảo trì.
- Ảnh onboarding trong vài ngày gần nhất.
- Total of incidents.

### 8.3 Báo cáo dài (customer/manager)
- PDF/Excel: lịch sử dự án, hình ảnh, tiến độ, sự cố, bảo trì.

---

## 9. Quyền & Phân quyền (Access Control)

### 9.1 Cấp độ truy cập – 4 vai trò chính

| Cấp | Quyền | Giới hạn |
|---|---|---|
| **Nhân viên** | Xem, cập nhật, tạo báo cáo, bảo trì | Dự án được gán, theo team |
| **Leader** | Xem, sửa, duyệt, giao việc | Dự án của team |
| **Manager** | Toàn bộ dự án, duyệt RCA, SLA | Toàn phòng |
| **Director** | Xem tất cả, duyệt nghiệm thu | Toàn công ty |

### 9.2 Ma trận phân quyền chi tiết

| Chức năng | Nhân viên | Leader | Manager | Director |
|---|---|---|---|---|
| Dashboard | Phần việc của mình | Của team | Của phòng | Toàn công ty |
| Project | Xem & cập nhật dự án được gán | Tạo/Sửa dự án của team, duyệt checklist | Toàn bộ dự án phòng, đổi trạng thái | Xem tất cả, duyệt nghiệm thu |
| Khách hàng | Xem | Xem, sửa liên hệ | Thêm/Sửa | Toàn quyền, xem hợp đồng và giá trị |
| Thiết bị/Serial | Nhập khi được gán | Sửa/duyệt | Sửa/xóa | Xem |
| Sự cố | Nhận và xử lý | Giao việc, đóng | Duyệt RCA, xem SLA | Xem báo cáo |
| Bảo trì | Thực hiện | Lập lịch | Duyệt kế hoạch | Xem |
| Công việc | Của mình | Giao cho team | Giao cho Leader | Xem |
| Site Report | Tạo | Duyệt | Duyệt, xuất cho khách | Xem |
| Quản trị | Không | Không | Thêm user team mình | Toàn quyền |

### 9.3 Quy tắc phạm vi dữ liệu

- Nhân viên chỉ thấy dự án mình tham gia
- Leader thấy dự án của team
- Manager thấy toàn phòng
- Director thấy tất cả
- Mọi thay đổi được ghi vào audit log

### 9.4 Hệ quả phân quyền

| Tầng | Cơ chế | Độ chắc chắn |
|---|---|---|
| **Cứng** | Nền tảng chỉ có 4 mức quyền gốc (Xem, Đóng góp, Chỉnh sửa, Chủ sở hữu); đặt được mức tối thiểu theo từng nhóm dữ liệu | Nền tảng tự chặn |
| **Mềm** | 4 vai trò nghiệp vụ và phạm vi theo team/dự án: giao diện tự ẩn menu, khóa nút, lọc dữ liệu | Người rành kỹ thuật có thể vượt qua |

→ Đủ cho phân quyền nội bộ trong công ty tin cậy lẫn nhau. Không đủ nếu cần chặn tuyệt đối việc một nhân viên đọc dữ liệu của khách khác.

---

## 10. Quy trình vận hành (Operations & Maintenance)

### 10.1 Quy trình vận hành hàng ngày

| Thời gian | Hoạt động | Người phụ trách |
|---|---|---|
| 07:00 | Kiểm tra báo cáo, cảnh báo | Manager |
| 08:00–11:00 | Field report, ảnh | Engineer |
| 11:00–13:00 | Xem báo cáo, chỉnh sửa | Supervisor |
| 13:00–15:00 | Bảo trì, công việc | Engineer |
| 16:00–18:00 | Báo cáo, ảnh, kết thúc công việc | Engineer |

### 10.2 Quy trình bảo trì & Cập nhật
| Thời gian | Hoạt động | Người phụ trách |
|---|---|---|
| Hàng tuần | Fix lỗi, cập nhật app | QA / Eng |
| Hàng tháng | Backup, review | Admin |

### 10.3 Quy trình xử lý sự cố

| Số thứ tự | Sự cố | Triệu chứng | Hành động khẩn cấp | Kênh liên hệ |
|---|---|---|---|---|
| 1 | Thiết bị lỗi, mất mạng | Không nhận diện | Gửi cảnh báo, xử lý | Supervisor |
| 2 | App treo | Đóng lại | Cấp bản vá | Admin |
| 3 | Upload ảnh thất bại | Thất bại | Retry upload, lưu sinh | Engineer |
| 4 | Không đồng bộ | Offline queue | Kiểm tra API, retry | Support |

### 10.4 Quy trình backup & Restore
- **Backup hệ thống**: PostgreSQL + S3 ảnh, mỗi ngày.
- **Restore**: Cô lập môi trường test, restore khi cần.

### 10.5 Quy trình kiểm thử & QA
- Hành động QA trước khi release.
- Phân phối tài liệu test.
- Tracking bug: Jira / Trello.

---

## 11. Bảo mật & Tuân thủ

### 11.1 Vấn đề & Giải pháp

| Vấn đề | Giải pháp |
|---|---|
| Dữ liệu công trường (ảnh, số serial) | Mã hóa, RBAC, chỉ một thiết bị trên thiết bị |
| Quyền truy cập | RBAC, row-level security |
| Lưu trữ offline | Timeout control, storage limit |
| Phiên đăng nhập | JWT + refresh token, timeout |
| Backups | Backup, restore, audit |

### 11.2 Tuân thủ
- [ ] GDPR-style: dữ liệu công chúng (an toàn)
- [ ] Hợp đồng bảo mật & bảo vệ dữ liệu
- [ ] Logistics: GPS, thời gian, vị trí

---

## 12. Kiến trúc (Architecture Summary)

```
[Field Engineer Mobile/Tablet] → (App) → [API] → [PostgreSQL] → [Storage]
        ↑                                                        |
     [Web Dashboard]                                          [Auth]
```

### 12.1 Bố cục hệ thống

| Thành phần | Nguyên lý | Mô tả |
|---|---|---|
| **Mobile/Tablet** | Offline-first | Field report, photo, queue, sync |
| **API Server** | REST/gRPC | Validate & store reports, alerts, projects |
| **Database** | PostgreSQL | Project, customer, device, alert, report |
| **Storage** | AWS S3 / Supabase | Photos, diagrams (chain) |
| **Queue** | Offline queue | Sync when online |
| **Auth** | JWT, RBAC | User, role, permission |

### 12.2 Lưu trữ dữ liệu

| Loại | Cơ sở | Lưu ý |
|---|---|---|
| Dữ liệu cấu trúc | PostgreSQL | Project, customer, device, alert, report |
| Ảnh / file | Storage | Hình ảnh, sơ đồ, PDF |
| Queue offline | SQLite/API | Đồng bộ khi kết nối |
| Backup | Daily | Restore |

---

## 13. Đặc tả UI / UX

### 13.1 Design system

| Yếu tố | Mô tả |
|---|---|
| **Thẻ màu** | 🟢 xanh (active/progress), 🔴 đỏ (sự cố), ⚪ xám (placeholder), 🟡 vàng (cần xử lý), 🟣 xanh dương (admin) |
| **Font** | Montserrat/Inter; size: body 16px, headline 20px |
| **Nút / CTA** | Blue primary, white secondary; large tap target (≥44px) |
| **Thông báo** | Toast (success/warning/error), badge |
| **Hình nhỏ** | Thumbnail, badge (e.g., "3 mục chờ") |

### 13.2 Hiệu ứng
- **Offline indicator**: Full dark mode, sync status.
- **Sync animation**: spinner + progress.
- **Toasts**: success/banner.
- Animations: slide-in, fade-in, loading overlay.

### 13.3 Lưới (grid) và bố cục
- Desktop: sidebar + main content, tables.
- Mobile: bottom nav / tab bar, sticky bottom bar.
- Responsive: tablets, desktop, mobile.

### 13.4 Thiết kế ít nhiễu (Calm / Minimal)
- Focus on main data: project, progress, photos, alerts.
- No dead buttons, orphan tabs.
- Buttons have clear actions.

---

## 14. Quy trình phát triển & Quản lý dự án

### 14.1 Quy trình phát triển

| Giai đoạn | Thời gian | Mục tiêu |
|---|---|---|
| Research & prototyping | 2 tuần | UX/UI flow |
| MVP | 10 tuần | Dashboard, project, site report |
| Beta | 4 tuần | Alert, maintenance, field test |
| Production | 2 tuần | Release |
| Phase 2 | 8 tuần | Advanced dashboard, integrations |

### 14.2 Quản lý công việc (Agile)
| Đề án | Thành viên | Quốc gia | Công nghệ |
|---|---|---|---|
| Container + Prototype | [Tên] | Tập trung | Figma, React |
| App + API | [Tên] | Tập trung | React/Native, Node/Python |
| Dashboard | [Tên] | Tập trung | Next.js, Web |

### 14.3 Tiêu chí release & Deployment
- **Pre-release**: QA checklist, security, performance, accessibility
- **Release note**: feature list, bug fixes, known issues
- **Hotfix**: rollback plan

---

## 15. Nhà cung cấp & Tài nguyên

| Loại | Tên | Mô tả |
|---|---|---|
| **Mobile** | React Native / Flutter | Cross-platform |
| **Backend** | Node.js / Python / Go | API server |
| **Database** | PostgreSQL / Supabase | Data store |
| **Storage** | AWS S3 / Supabase | Images, files |
| **CI/CD** | GitHub Actions | Build, test, release |
| **Monitoring** | Sentry / Firebase | Crash & logs |
| **Auth** | Supabase Auth / Firebase | JWT, user, role |

---

## 16. KPI & Đo lường

| Chỉ số | Mục tiêu | Đo lường | Phân phối |
|---|---|---|---|
| Số dự án | ≥ 10 | DB | Daily |
| Tiến độ dự án | ≥ 80% | Dashboard | Daily |
| Thời gian phản hồi cảnh báo | ≤ 5 phút | API log | Daily |
| Tỷ lệ báo cáo hoàn thành | ≥ 90% | Sent / total | Daily |
| Ảnh hiện trường | ≥ 3/ report | DB | Daily |
| Sự cố xử lý | ≤ 24h | Dept | Daily |

### 16.2 Quy trình cải tiến (PDCA)
- **Plan**: Cố gắng mục tiêu (ví dụ: giảm thời gian báo cáo)
- **Do**: Build & test
- **Check**: Analytics & QA
- **Act**: Improve

---

## 17. Checklist Tạo sản phẩm (antes d'un release)

- [ ] Tất cả màn hình review trên mobile/tablet/desktop.
- [ ] Xác minh tính năng chính theo flow chính (happy path).
- [ ] Xác minh edge cases: offline, low memory, no photo.
- [ ] Kiểm tra bảo mật: RBAC, input validation, file upload.
- [ ] Kiểm tra performance: load, cache, network errors.
- [ ] Kiểm tra accessibility: WCAG AA.
- [ ] Kiểm tra consistency UI: design system.
- [ ] Kiểm tra offline queue: lưu, đồng bộ, xóa.
- [ ] Kiểm tra backup & restore.
- [ ] Release note đã được viết.
- [ ] Tài liệu hướng dẫn đã được cập nhật.

---

## 18. Chi phí & Overages

| Vấn đề | Giải pháp | Bảo vệ (recommended) |
|---|---|---|
| Dung lượng ảnh | Giảm kích thước, compress | Upload limit, storage limit |
| Thời gian mạng thấp | Offline-first | Background sync |
| Lưu trữ lớn | Tiền bản dùng | Daily cron backup |

---

## 19. Gợi ý tính năng mở rộng (Roadmap)

| Giai đoạn | Tính năng | Mục tiêu | Lý do ưu tiên |
|---|---|---|---|
| Giai đoạn 1 | Dashboard, project, site report, basic RBAC | MVP | Core |
| Giai đoạn 2 | Alerts, maintenance, work, photo | Operations | Operations |
| Giai đoạn 3 | API, mobile app, AI, insights | Scale | Scale |

---

## 20. Phụ lục

### 20.1. Biểu mẫu (Forms)

| Biểu mẫu | Mô tả | Xác thực | Người dùng |
|---|---|---|---|
| Tạo dự án | Tên, địa chỉ, mục tiêu, người | Bắt buộc | Admin/PM |
| Tạo báo cáo hiện trường | Hạng mục, vị trí, thi công, ảnh | Bắt buộc | Field Engineer |
| Báo cáo sự cố | Loại, mô tả, ảnh, email | Bắt buộc | Engineer |
| Tạo bảo trì | Lịch, tiêu chí, người | Bắt buộc | Supervisor |
| Tạo công việc | Chủ, hoàn thành, lịch | Bắt buộc | Admin |

### 20.2. Danh sách thiết bị

| Cột | Mô tả | Kiểu dữ liệu |
|---|---|---|
| ID | Mã thiết bị | UUID |
| Project | Dự án | Ref |
| Type | Loại thiết bị | Text |
| Serial | Số serial | Text |
| Rack | Tủ rack | Number |
| Status | Trạng thái | Enum |
| Last sync | Thời gian đồng bộ | DateTime |

### 20.3. Danh mục trọng số
| Loại | Mô tả |
|---|---|
| Item | Hạng mục thi công (lắp mạng, lắp tủ, kiểm tra…) |
| Weather | Nắng / Mưa / Nhiều mây |
| Status | draft, sent, synced, pending |
| Incident type | Thi công, an toàn, vướng mắc |
| Team | Đội hạ tầng mạng 01, … |

---

# 📌 Chọn Phiên Bản: Quản lý tất cả dự án, tất cả khách hàng, tất cả site

> **Phiên bản áp dụng:** **Version Complete / Director-level**  
> **Mô tả:** Website quản lý **tất cả** dự án, **tất cả** khách hàng, **tất cả** site, và phân quyền người dùng theo role (Employee/Leader/Manager/Director).

---

## 21. Phân tích: Phiên bản quản lý tất cả

### 21.1 Đặc điểm của phiên bản này

| Điểm | Nội dung |
|---|---|
| **Mức độ nhìn** | Toàn công ty (Director): tất cả dự án, tất cả khách hàng, tất cả site |
| **Mức độ quản lý** | Manager: toàn phòng; Leader: team; Employee: project được gán |
| **Phân quyền** | 4 cấp: Nhân viên, Leader, Manager, Director |
| **Dữ liệu** | Dùng chung cho cả nhóm, tập trung vào tất cả dự án & khách hàng |
| **Màn hình chính** | Dashboard (toàn cục), Project (từng dự án chi tiết), Khách hàng, Site, Quản trị |

### 21.2 Kỳ vọng của phiên bản này

- Người dùng nhìn thấy **toàn bộ hệ sinh thái** giữa khách hàng, dự án, thiết bị, sự cố.
- Phân quyền giúp mỗi người chỉ thấy dữ liệu phù hợp (dự án của team/phòng/chung).
- Dashboard hiển thị các chỉ số tổng hợp (số dự án, sự cố, SLA, bảo trì) theo cấp độ khác nhau.
- Quản trị viên gán quyền, cấu hình SLA, quản lý danh mục dùng chung.

### 21.3 Những điểm cần lưu ý

- **Thực thi hạn chế:** không thể "chặn tuyệt đối" một người xem dữ liệu khách khác — vì mô hình là phân quyền nội bộ, không phải multi-tenant an toàn tuyệt đối.
- **Tác vụ quản trị phức tạp:** cần quản trị danh mục, vai trò, sức khỏe khách hàng, SLA, bảo trì.
- **Hiệu suất:** với tất cả dự án, cần index & filter tốt để không làm chậm giao diện.
- **Bảo mật:** audit log bắt buộc; không lưu dữ liệu nhạy cảm (mật khẩu thiết bị, IP quản trị, FDI chặt).

---

## 22. Blocker của phiên bản này

| Blocker | Cách xử lý |
|---|---|
| Quá nhiều dữ liệu toàn cục | Khai báo bộ lọc theo phòng ban, dự án, mức độ |
| Cầu nối dữ liệu phức tạp | Thiết kế model rõ ràng (customer → site → project → device) |
| Phân quyền mềm (dễ bị bypass) | Audit log, bật RLS, cấu hình RBAC cứng |
| Thời gian phản hồi | Index, cache, pagination, filter nhanh |
| Quá tải cảnh báo | Gộp trùng, lọc lỗi, esclation |
| Nhập dữ liệu từ nhiều nguồn | Template nhập hàng loạt, đối soát định kỳ |

---

## 23. Checklist trước khi lưu trữ (Bản toàn quyền)

- [ ] Tất cả bảng CSDL đã được tạo (customer, site, project, device, alert, maintenance, work, report, document, audit_log)
- [ ] RBAC 4 cấp đã được cấu hình (employee, leader, manager, director)
- [ ] Mọi role được gán project_id / team / department
- [ ] Khách hàng, site, project, thiết bị đã có dữ liệu thử (1–3 ví dụ)
- [ ] Dashboard hiển thị tổng hợp của tất cả dự án, khách hàng, site
- [ ] Quyền phân quyền được test trên tất cả vai trò
- [ ] Audit log hoạt động
- [ ] Backup & restore hoạt động
- [ ] Lý lịch phát hành (release) được ghi
- [ ] Tài liệu hướng dẫn đã được cập nhật

---

## 24. Phiên bản sau (nếu cần)

| Bản | Nội dung | Mục tiêu |
|---|---|---|
| **Bản 2** | Cảnh báo, bảo trì, công việc, notification | Vận hành có quy trình & SLA |
| **Bản 3** | Dashboard điều hành, Site Report PDF, tổng hợp báo cáo | Quản trị bằng số liệu |
| **Bản 4** | On-call, change management, RMA, knowledge base | Hoàn thiện |

---

## 25. Lưu ý

- Phiên bản này **chủ yếu để quản lý toàn cục**, phù hợp với Director, Manager, Leader, Employee.
- Không tích hợp các tính năng cao cấp (on-call, change management, RMA) trong bản đầu tiên.
- Yêu cầu người dùng: **quyền** cần được gán rõ ràng; chỉ có **Director** toàn quyền.
- Dữ liệu nhạy trọng cần được bảo vệ (cảnh báo, bảo hành, hợp đồng, SLA).

---

**Document created by**: AI-Assist / Team Product  
**Last updated**: 2026-11-17  
**Version**: 1.0 (Version Complete – quản lý tất cả dự án, khách hàng, site và phân quyền người dùng)
