> **ARCHIVED (2026-11-19)** — bản checklist NOC/PMO cũ (17/11). Nội dung đã hợp nhất vào `docs/04-governance/CHECKLISTS.md` (mục "Checklist triển khai" + "Nhật ký đồng bộ"). FILE NÀY CHỈ ĐỂ TRUY VẾT — KHÔNG CẬP NHẬT Ở ĐÂY.

# CheckList Tiến Hành Code — Web Site NOC/PMO (Bản 1)
> Dành cho nhóm phát triển & QA  
> Mục đích: chuẩn bị tài liệu, môi trường, cơ sở dữ liệu, phân quyền, giao diện, vận hành cho lần build đầu tiên.  
> Không chứa code, chỉ liệt kê checklist bằng ý nghĩa nghiệp vụ & kỹ thuật.

---

## 1. Checklist UI / UX

| # | Nội dung kiểm tra | Loại | Trạng thái |
|---|---|---|---|
| 1 | Trang chủ (Dashboard) hiển thị KPI chính: Số dự án, sự cố đang mở, SLA, bảo trì đủ hạn | Thử nghiệm | ✅ / ❌ / ⏳ |
| 2 | Dashboard hiển thị sự cố theo mức độ (Critical/Major/Minor) | Thử nghiệm | ✅ / ❌ / ⏳ |
| 3 | Người dùng không có vai trò Quản trị không xem phân là mục admin/đăng nhập | Thử nghiệm | ✅ / ❌ / ⏳ |
| 4 | Khi đăng nhập đúng tài khoản, giao diện chỉ hiển thị menu phù hợp vai trò | Thử nghiệm | ✅ / ❌ / ⏳ |
| 5 | Tất cả nút nhấn có thao tác rõ ràng, không dead button | Thử nghiệm | ✅ / ❌ / ⏳ |
| 6 | Nhóm chức năng nhóm: Dashboard, Project, Khách hàng, Sự cố, Vận hành, Site Report, Quản trị | Thử nghiệm | ✅ / ❌ / ⏳ |
| 7 | Tiêu đề, menu, icon, thành phần hiển thị không bị chồng lên nhau (dense layout) | Thử nghiệm | ✅ / ❌ / ⏳ |
| 8 | Màn hình responsive: tablet, laptop, desktop, mobile | Thử nghiệm | ✅ / ❌ / ⏳ |
| 9 | Tất cả form có đầy đủ label, placeholder, văn bản hỗ trợ (tool tip, ngắn gọn) | Thử nghiệm | ✅ / ❌ / ⏳ |
| 10 | Ngôn ngữ: tiếng Việt đầy đủ; không có khóa ngôn ngữ bị thiếu (ví dụ: “Add”, “SAVE”) | Thử nghiệm | ✅ / ❌ / ⏳ |
| 11 | Phân loại: offline-first, mobile-first, điện thoại phát hiện & redirect | Thử nghiệm | ✅ / ❌ / ⏳ |
| 12 | Màu sắc, icon, cỡ chữ, khoảng cách không vi phạm design guide | Thử nghiệm | ✅ / ❌ / ⏳ |
| 13 | Lỗi (error) được hiển thị rõ ràng, không tràn màn hình | Thử nghiệm | ✅ / ❌ / ⏳ |
| 14 | Silent/fail state (ảnh không hiện, file không upload) cần thông báo rõ | Thử nghiệm | ✅ / ❌ / ⏳ |
| 15 | Thông báo (toast/notification) hiển thị đúng thông tin, thời gian phù hợp | Thử nghiệm | ✅ / ❌ / ⏳ |
| 16 | Nút xác nhận, nút đăng xuất, nút xóa, nút khóa có xác nhận cẩn thận | Thử nghiệm | ✅ / ❌ / ⏳ |

---

## 2. Checklist Figma

| # | Nội dung kiểm tra | Loại | Trạng thái |
|---|---|---|---|
| 1 | Sơ đồ dàn trang (user flow) cho từng vai trò: Employee, Leader, Manager, Director | Thử nghiệm | ✅ / ❌ / ⏳ |
| 2 | Sơ đồ màn hình (wireframe) cho Dashboard, Project, Site Report, Sự cố, Vận hành, Customer, Admin | Thử nghiệm | ✅ / ❌ / ⏳ |
| 3 | Quy trình: Login, Dashboard, chọn dự án, xem chi tiết, xử lý sự cố, báo cáo | Thử nghiệm | ✅ / ❌ / ⏳ |
| 4 | Style Guide: màu sắc, font, kích thước, khoảng cách, icon | Thử nghiệm | ✅ / ❌ / ⏳ |
| 5 | Component system: button, input, textarea, table, dropdown, modal, badge, chip | Thử nghiệm | ✅ / ❌ / ⏳ |
| 6 | Form làm việc: tạo dự án, thêm thiết bị, tạo sự cố, tạo công việc, nhập báo cáo | Thử nghiệm | ✅ / ❌ / ⏳ |
| 7 | Tiêu đề cấu trúc màn hình (Header, Sidebar, Main, Footer) rõ ràng | Thử nghiệm | ✅ / ❌ / ⏳ |
| 8 | Hiển thị hình ảnh (upload, preview, thumbnail, full view) | Thử nghiệm | ✅ / ❌ / ⏳ |
| 9 | Bảng tài liệu, tệp tin, lịch sự, ảnh onsite | Thử nghiệm | ✅ / ❌ / ⏳ |
| 10 | Giao diện mobile: offline, bottom nav, sticky bar | Thử nghiệm | ✅ / ❌ / ⏳ |
| 11 | Prototype: thử tất cả flow trên thực tế (click), không thao tác form thực tế | Thử nghiệm | ✅ / ❌ / ⏳ |
| 12 | Viết lại tài liệu: cần biết thiết kế UI từ file Figma, chuyển sang code | Thử nghiệm | ✅ / ❌ / ⏳ |

---

## 3. Checklist Database

| # | Nội dung kiểm tra | Loại | Trạng thái |
|---|---|---|---|
| 1 | Cơ sở dữ liệu: PostgreSQL (hoặc Supabase) đã cấu hình xong | Environment | ✅ / ❌ / ⏳ |
| 2 | Mọi bảng cần thiết đã được tạo trong database | Environment | ✅ / ❌ / ⏳ |
| 3 | Tên bảng, tên trường không vi phạm quy tắc, dễ đọc, dễ dùng | Environment | ✅ / ❌ / ⏳ |
| 4 | Tất cả mối liên kết (FK) được đặt đúng, không thừa, không thiếu | Environment | ✅ / ❌ / ⏳ |
| 5 | Trạng thái thường dùng đều dùng ENUM hoặc danh mục chung (status, level) | Data | ✅ / ❌ / ⏳ |
| 6 | Tất cả mối liên kết (FK) đã được khai báo đúng, cascade/action rõ ràng | Environment | ✅ / ❌ / ⏳ |
| 7 | Backup thường xuyên (tự động), restore test | Data | ✅ / ❌ / ⏳ |
| 8 | Logic của tất cả chức năng cần map đúng với mô hình dữ liệu | Data | ✅ / ❌ / ⏳ |
| 9 | Kiểm thử: thiết bị có thể liên kết nhiều sự cố, bảo trì, bảo hành | Data | ✅ / ❌ / ⏳ |
| 10 | Schema đã được thiết kế để không cần đổi lại sau khi release 1.0 | Data | ✅ / ❌ / ⏳ |
| 11 | Index đã được thiết lập cho các cột thường query (project, serial, status) | Data | ✅ / ❌ / ⏳ |
| 12 | Tất cả dữ liệu nhập vào phải có ràng buộc không null, unique, phân loại | Data | ✅ / ❌ / ⏳ |
| 13 | Tất cả dữ liệu được lưu theo định dạng chuẩn (timestamp, UUID) | Data | ✅ / ❌ / ⏳ |

---

## 4. Checklist RBAC (Phân Quyền)

| # | Nội dung kiểm tra | Loại | Trạng thái |
|---|---|---|---|
| 1 | 4 vai trò được định nghĩa: Employee, Leader, Manager, Director | Data | ✅ / ❌ / ⏳ |
| 2 | Mỗi vai trò có target rõ ràng (danh sách quyền, phạm vi dữ liệu) | Data | ✅ / ❌ / ⏳ |
| 3 | Mọi tính năng (Dashboard, Project, Customer, Sự cố, Vận hành, Site Report, Quản trị) được gán quyền cho từng vai trò | Data | ✅ / ❌ / ⏳ |
| 4 | API level: authentication, authorization, role check | System | ✅ / ❌ / ⏳ |
| 5 | Data level: row-level security (RLS), filter dữ liệu thuộc từng project | System | ✅ / ❌ / ⏳ |
| 6 | Quyền: Viewer (xem), Contributor (đóng góp), Editor (chỉnh sửa), Owner (chủ sở hữu) | Data | ✅ / ❌ / ⏳ |
| 7 | Quyền: phạm vi theo team, dự án, phòng ban | Data | ✅ / ❌ / ⏳ |
| 8 | Quyền: giao diện tự ẩn menu, khóa nút, lọc dữ liệu | Data | ✅ / ❌ / ⏳ |
| 9 | Audit log: ghi lại ai làm gì, lúc nào, từ đâu | Data | ✅ / ❌ / ⏳ |
| 10 | Mọi thiết lập_permission: role-based access control (RBAC) | Data | ✅ / ❌ / ⏳ |
| 11 | Khả năng export/import quy tắc / quyền (role config) | Data | ✅ / ❌ / ⏳ |
| 12 | Test trên tất cả các vai trò: nhân viên, leader, manager, director | System | ✅ / ❌ / ⏳ |
| 13 | Test: người dùng không có quyền không truy cập được menu/action | System | ✅ / ❌ / ⏳ |
| 14 | Test: người dùng không có quyền không có được dữ liệu trái phép | System | ✅ / ❌ / ⏳ |
| 15 | Test: quyền chỉ được cấp khi cần (dưới quyền cao nhất) | System | ✅ / ❌ / ⏳ |
| 16 | Test: quyền không bị nhiễu khi đổi role | System | ✅ / ❌ / ⏳ |

---

## 5. Checklist Vận Hành (Operations)

| # | Nội dung kiểm tra | Loại | Trạng thái |
|---|---|---|---|
| 1 | Dashboard: báo cáo, cảnh báo, bảo trì cần được view trước khi fix | System | ✅ / ❌ / ⏳ |
| 2 | Công việc: người giao, người nhận, hạn, ưu tiên, liên kết dự án/sự cố | System | ✅ / ❌ / ⏳ |
| 3 | Tạo công việc từ sự cố (incident → task) | System | ✅ / ❌ / ⏳ |
| 4 | Cảnh báo: mức độ (critical, major, minor), thời gian phản hồi | System | ✅ / ❌ / ⏳ |
| 5 | Gộp cảnh báo trùng (duplicate merge) | System | ✅ / ❌ / ⏳ |
| 6 | Escalation: khi không ai nhận, tự động chuyển việc | System | ✅ / ❌ / ⏳ |
| 7 | Maintenance window: không tính sự cố khi bảo trì có kế hoạch | System | ✅ / ❌ / ⏳ |
| 8 | Sự cố: timeline xử lý, RCA, biện pháp khắc phục, status lifecycle | System | ✅ / ❌ / ⏳ |
| 9 | Bảo trì: lịch định kỳ, đột xuất, thông báo khách, checklist, kết quả | System | ✅ / ❌ / ⏳ |
| 10 | Site Report: báo cáo khảo sát + triển khai/bảo trì, template, xuất PDF | System | ✅ / ❌ / ⏳ |
| 11 | Thông báo: soạn nội dung (email, Zalo, Group), copy (không tự gửi) | System | ✅ / ❌ / ⏳ |
| 12 | Offline-first: field report, photo, queue, sync | System | ✅ / ❌ / ⏳ |
| 13 | Mobile-friendly: chạy trên điện thoại, không cần cài đặt | System | ✅ / ❌ / ⏳ |
| 14 | Backup thường xuyên, restore test | System | ✅ / ❌ / ⏳ |
| 15 | SLA: track từ khi nhận đến khi đóng, MTTR, % vi phạm | System | ✅ / ❌ / ⏳ |

---

## 6. Checklist Công Nghệ Viết Website

| # | Nội dung kiểm tra | Loại | Trạng thái |
|---|---|---|---|
| 1 | Frontend: framework chiếm ưu thế (React, Next.js, Vue, Angular) | Environment | ✅ / ❌ / ⏳ |
| 2 | Backend: API server (Node.js, Python, Go) | Environment | ✅ / ❌ / ⏳ |
| 3 | Database: PostgreSQL / Supabase | Environment | ✅ / ❌ / ⏳ |
| 4 | Storage: file upload (AWS S3, Supabase) | Environment | ✅ / ❌ / ⏳ |
| 5 | Auth: JWT, refresh token, role check | System | ✅ / ❌ / ⏳ |
| 6 | CI/CD: GitHub Actions, deploy, rollback | System | ✅ / ❌ / ⏳ |
| 7 | Monitoring: Sentry, Firebase Analytics, logs | System | ✅ / ❌ / ⏳ |
| 8 | Mobile: React Native / Flutter (nếu cần app mobile) | Environment | ✅ / ❌ / ⏳ |
| 9 | Testing: unit test, integration test, e2e | System | ✅ / ❌ / ⏳ |
| 10 | Code quality: lint, format, pre-commit, pre-push | System | ✅ / ❌ / ⏳ |
| 11 | Environment: staging, production | System | ✅ / ❌ / ⏳ |
| 12 | Security: HTTPS, XSS, CSRF, SQL injection, rate limit | System | ✅ / ❌ / ⏳ |
| 13 | Rate limit: giới hạn request mỗi người dùng một giờ | System | ✅ / ❌ / ⏳ |
| 14 | Backup: định kỳ, restore test | System | ✅ / ❌ / ⏳ |

---

## 7. Checklist Design & Component

| # | Nội dung kiểm tra | Loại | Trạng thái |
|---|---|---|---|
| 1 | Design system: màu, font, spacing, icon, background | System | ✅ / ❌ / ⏳ |
| 2 | Component: button, input, select, table, dropdown, modal, card, badge | System | ✅ / ❌ / ⏳ |
| 3 | Layout: header, sidebar, main, footer | System | ✅ / ❌ / ⏳ |
| 4 | Interactive: hover, focus, active, disabled | System | ✅ / ❌ / ⏳ |
| 5 | Responsive: desktop, tablet, mobile | System | ✅ / ❌ / ⏳ |
| 6 | Offline indicator (synchronize, queue, sync) | System | ✅ / ❌ / ⏳ |
| 7 | Loading state (spinner, skeleton) | System | ✅ / ❌ / ⏳ |
| 8 | Error state (toast, alert, banner) | System | ✅ / ❌ / ⏳ |
| 9 | Empty state (no data, no image) | System | ✅ / ❌ / ⏳ |
| 10 | Form validation (required, max, min, pattern) | System | ✅ / ❌ / ⏳ |
| 11 | Navigation (tabs, breadcrumb, menu, search) | System | ✅ / ❌ / ⏳ |
| 12 | Visibility (small, medium, large) | System | ✅ / ❌ / ⏳ |

---

## 8. Checklist Ngoài Cục / Dọn Dẹp Sau Mỗi Phase

| # | Nội dung kiểm tra | Loại | Trạng thái |
|---|---|---|---|
| 1 | Code review (peer, senior) | Code | ✅ / ❌ / ⏳ |
| 2 | Unit test, integration test, e2e | Code | ✅ / ❌ / ⏳ |
| 3 | Perfromance test (load, stress) | Code | ✅ / ❌ / ⏳ |
| 4 | Security test (penetration, static analysis) | Code | ✅ / ❌ / ⏳ |
| 5 | Accessibility (WCAG AA) | Code | ✅ / ❌ / ⏳ |
| 6 | Document: README, API docs, user guide | Code | ✅ / ❌ / ⏳ |
| 7 | Database migration: schema, seed, backup | Code | ✅ / ❌ / ⏳ |
| 8 | Environment: staging, production, config | Code | ✅ / ❌ / ⏳ |
| 9 | Release: pre-release, release note, hotfix | Code | ✅ / ❌ / ⏳ |
| 10 | Monitoring: alert, log, crash | Code | ✅ / ❌ / ⏳ |
| 11 | Post-Release: bug, feedback, next iteration | Code | ✅ / ❌ / ⏳ |
| 12 | Final: commit formal, merge main branch, tag version | Code | ✅ / ❌ / ⏳ |

---

## 9. Checklist Nguyên Tắc Phát Triển (PRD)

| # | Nội dung kiểm tra | Loại | Trạng thái |
|---|---|---|---|
| 1 | Tất cả module đều có owner rõ ràng (PM, Leader, Manager, Director, Engineer) | PRD | ✅ / ❌ / ⏳ |
| 2 | Mọi tính năng có requirement rõ ràng, không mơ hồ | PRD | ✅ / ❌ / ⏳ |
| 3 | Mọi tính năng có acceptance criteria (cách kiểm tra, standard) | PRD | ✅ / ❌ / ⏳ |
| 4 | Mọi tính năng có test plan (test cases, test data) | PRD | ✅ / ❌ / ⏳ |
| 5 | Mọi tính năng có owner (dev, QA, PM, design) | PRD | ✅ / ❌ / ⏳ |
| 6 | Mọi tính năng có plan: scope, team, timeline, budget | PRD | ✅ / ❌ / ⏳ |
| 7 | Mọi tính năng có risk, dependency, constraint | PRD | ✅ / ❌ / ⏳ |

---

## 10. Checklist Lưu Trữ & Conference (Ngoài Cục)

| # | Nội dung kiểm tra | Loại | Trạng thái |
|---|---|---|---|
| 1 | Tất cả file code đã được push (git, GitHub) | Code | ✅ / ❌ / ⏳ |
| 2 | Tất cả database schema đã được migrate | Code | ✅ / ❌ / ⏳ |
| 3 | Tất cả API đã được documented | Code | ✅ / ❌ / ⏳ |
| 4 | Tất cả image/file đã được uploaded | Code | ✅ / ❌ / ⏳ |
| 5 | Tất cả test đã được run | Code | ✅ / ❌ / ⏳ |
| 6 | Tất cả user đã được debug | Code | ✅ / ❌ / ⏳ |
| 7 | Tất cả issue đã được closed | Code | ✅ / ❌ / ⏳ |
| 8 | Tất cả release đã được tagged | Code | ✅ / ❌ / ⏳ |
| 9 | Tất cả log đã được lưu (sentry, firefox, chrome) | Code | ✅ / ❌ / ⏳ |
| 10 | Tất cả bug đã được fixed | Code | ✅ / ❌ / ⏳ |
| 11 | Tất cả feature đã được delivered | Code | ✅ / ❌ / ⏳ |
| 12 | Tất cả documentation đã được updated | Code | ✅ / ❌ / ⏳ |

---

## 11. Checklist Tăng Cường An Toàn (Security)

| # | Nội dung kiểm tra | Loại | Trạng thái |
|---|---|---|---|
| 1 | Passwords gốc chỉ được dùng một lần (1-password) | Security | ✅ / ❌ / ⏳ |
| 2 | Không lưu mật khẩu của thiết bị, IP quản trị, thông tin truy cập vào DB | Security | ✅ / ❌ / ⏳ |
| 3 | Khách hàng để lại mật khẩu, IP, địa chỉ truy cập bảo mật | Security | ✅ / ❌ / ⏳ |
| 4 | Áp dụng SSL/TLS, HTTPS | Security | ✅ / ❌ / ⏳ |
| 5 | Thêm 2FA, SSO, email notification | Security | ✅ / ❌ / ⏳ |
| 6 | Kiểm tra bảo mật định kỳ (penetration test, audit) | Security | ✅ / ❌ / ⏳ |

---

*Người làm: [Tên] – [Vai trò] – [Ngày lập] – [Phiên bản]*  
*Chuẩn: No Code – Nghiệp vụ + Cấu trúc + Checklist thực hiện*
