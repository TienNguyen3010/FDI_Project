# 🔐 FDI Project Management – RBAC Matrix

> Phiên bản 1.0 · Dành cho group bảo trì & security  
> Ngôn ngữ: Tiếng Việt · Không chứa code

---

## 1. Overview

- 4 roles: **Employee**, **Leader**, **Manager**, **Director**
- Permission levels: **Viewer**, **Contributor**, **Editor**, **Owner**
- Scope: team, project, department (soft)
- Audit log for all changes

---

## 2. Hierarchical access (soft)

| Role | Scope |
|---|---|
| Employee | Hộc dự án được gán |
| Leader | Dự án của team |
| Manager | Toàn phòng |
| Director | Toàn công ty |

---

## 3. Permission Matrix

| Function | Employee | Leader | Manager | Director |
|---|---|---|---|---|
| **Dashboard** | Phần việc của mình | Của team | Của phòng | Toàn công ty |
| **Project** | Xem & cập nhật dự án được gán | Tạo/Sửa dự án của team, duyệt checklist | Toàn bộ dự án phòng, đổi trạng thái | Xem tất cả, duyệt nghiệm thu |
| **Customer** | Xem | Xem, sửa liên hệ | Thêm/Sửa | Toàn quyền, xem hợp đồng & giá trị |
| **Device / Serial** | Nhập khi được gán | Sửa / Duyệt | Sửa / Xóa | Xem |
| **Incident** | Nhận & xử lý | Giao việc, đóng | Duyệt RCA, xem SLA | Xem báo cáo |
| **Maintenance** | Thực hiện | Lập lịch | Duyệt kế hoạch | Xem |
| **Work** | Của mình | Giao cho team | Giao cho Leader | Xem |
| **Site Report** | Tạo | Duyệt | Duyệt, xuất cho khách | Xem |
| **Admin** | ❌ | ❌ | Thêm user, team | Toàn quyền |

---

## 4. Role Definition

| Role | Namespace | Description |
|---|---|---|
| Employee | `employee` | Cấp 1, chỉnh sửa nội bộ, cập nhật công việc |
| Leader | `leader` | Cấp 2, quản lý đội, giao việc, duyệt |
| Manager | `manager` | Cấp 3, quản lý phòng, duyệt kế hoạch |
| Director | `director` | Cấp 4, theo dõi tổng thể, duyệt nghiệm thu |

---

## 5. RBAC Rules

### 5.1 Hard (System)

- Only 4 levels of permissions: **View**, **Contribute**, **Edit**, **Owner**
- Apply minimum privilege per data scope

### 5.2 Soft (UI / Business)

- 4 business roles with scope by team / project
- Hide menus, lock buttons, filter data
- **Not absolute** — a technically skilled user can bypass

### 5.3 Key Policy

- Do NOT store plain passwords, IP addresses, access info in database
- Audit log must be enabled
- Sensitive customer data (bank, FDI, NDA) must be excluded or masked

---

## 6. Test Cases

- Test all actions by role
- Test non-owner cannot see data from other projects
- Test deleting or editing restricted field
- Test escalation (leader → manager → director)
- Test audit logs
- Test role change

---

## 7. Notes

- This is **internal trust model**, not a high-security multi-tenant environment
- Additional enforcement needed if external access is required

---
