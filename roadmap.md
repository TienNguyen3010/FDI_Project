# 🗺️ FDI Project Management – Roadmap

> Phiên bản 1.0 · Dành cho nhóm phát triển & quản lý dự án  
> Ngôn ngữ: Tiếng Việt · Không chứa code

---

## 1. Overview

| Bản | Mục tiêu | Dữ liệu cần |
|---|---|---|
| **Bản 1** | Run thử với 1 dự án & 1 khách thật | Login, customer, site, project, devices, RBAC |
| **Bản 2** | Vận hành có quy trình, SLA | Incident, maintenance, work, notification |
| **Bản 3** | Quản trị bằng số liệu | Dashboard, site report PDF, tổng hợp báo cáo |

---

## 2. Lộ trình chi tiết

### 2.1 Bản 1 – MVP (Core @ 10 tuần)

| Module | Nội dung | Target |
|---|---|---|
| Login & RBAC | 4 role, scope, audit | V1.0 |
| Customer | Hồ sơ, site, liên hệ | V1.0 |
| Project | Milestone, progress, status | V1.0 |
| Device | Serial, rack, bảo hành | V1.0 |
| Quản trị | Gán role, cấu hình | V1.0 |
| Site Report (cơ bản) | Create report, photo | V1.0 |

**Target:** Chạy thử với 1 dự án + 1 khách thật. Đảm bảo dọn dẹp & dùng được.

---

### 2.2 Bản 2 – Vận hành (4 tuần)

| Module | Nội dung | Target |
|---|---|---|
| Incident | Nhận, xử lý, đóng, SLA | V2.0 |
| Maintenance | Lịch, checklist, kết quả | V2.0 |
| Work | Giao công việc, lịch, ưu tiên | V2.0 |
| Notification | Soạn email/Zalo/group, khai báo | V2.0 |

**Target:** Quy trình vận hành có định hình rõ, kiểm thử SLA.

---

### 2.3 Bản 3 – Điều hành & Báo cáo (2 tuần)

| Module | Nội dung | Target |
|---|---|---|
| Dashboard | KPI tổng quan, incident, SLA | V3.0 |
| Site Report PDF | Xuất PDF, báo cáo định kỳ | V3.0 |
| Tổng hợp báo cáo | Tuần/tháng, PDF/Excel | V3.0 |

**Target:** Quản trị bằng số liệu, báo cáo định kỳ.

---

### 2.4 Bên sau (Tùy chọn & Tăng cường)

| Mô-đun | Câu hỏi |
|---|---|
| On-call roster | Ai trực đêm, escalation |
| Change management | Phê duyệt thay đổi, rollback |
| RMA / spare part | Tự bảo hành, kho spare |
| Knowledge base | Runbook, troubleshooting |
| Offline app | Xử lý khi mất mạng |
| Success KPI | Đo lường hiệu quả |

---

## 3. Quy trình phát triển

| Giai đoạn | Thời gian | Mục tiêu |
|---|---|---|
| Research & prototyping | 2 tuần | UX/UI flow |
| MVP | 10 tuần | Dashboard, project, site report |
| Beta | 4 tuần | Alert, maintenance, field test |
| Production | 2 tuần | Release |
| Phase 2 | 8 tuần | Advanced dashboard, integrations |

---

## 4. Lưu ý

- Không đặt mốc tuần cụ thể vì phụ thuộc dữ liệu & vòng chỉnh sửa
- Ưu tiên module có ích tức thì, tránh bắt đầu bằng nhập tài sản nhàm chán
- Dùng checklist `checklist.md` cho mỗi phase

---
