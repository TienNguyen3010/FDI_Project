# 🗄️ FDI_Project – Database Schema (Local Time: GMT +7, Asia/HCM)

> Phiên bản 1.0 · Dành cho nhóm phát triển  
> Ngôn ngữ: Tiếng Việt / English · Không chứa code thực thi  
> Lưu ý: Mọi timestamp lưu theo LOCALTIME: Asia/Ho_Chi_Minh (GMT +7)

---

## 1. Tóm tắt bảng chính

| Bảng | Mô tả | Mối liên kết chính |
|---|---|---|
| `user` | Người dùng, role, team | — |
| `customer` | Khách hàng | — |
| `site` | Site/chi nhánh | customer |
| `project` | Dự án triển khai | customer, site, pm |
| `device` | Thiết bị, serial, rack, bảo hành | project, site, rack |
| `alert` | Cảnh báo, sự cố | device, site, project, user |
| `maintenance` | Bảo trì | device, project, user |
| `work` | Công việc, nhiệm vụ | project, incident, user |
| `report` | Site Report | project, user |
| `document` | Tài liệu, sơ đồ, ảnh | project, type |
| `audit_log` | Nhật ký thay đổi | user, resource |
| `config` | Cấu hình chung | — |

---

## 2. CSDL cơ bản (PostgreSQL – Supabase/Uno)

```sql
-- ---------------------------------------------------------
-- Khóa chính & Cấu trúc dạng rời (uni-quity, FK, NULL, CHECK)
-- ---------------------------------------------------------
```

---

## 3. Schema chi tiết

### 3.1 Khóa chính & User

```sql
-- users
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
email TEXT UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
role TEXT NOT NULL CHECK (role IN ('employee','leader','manager','director')),
team TEXT,
active BOOLEAN DEFAULT TRUE,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
```

### 3.2 Khách hàng / Site

```sql
-- customers
id UUID PK, name TEXT, phone TEXT, email TEXT, industry TEXT,
contact_technical TEXT, contact_commercial TEXT, contact_emergency TEXT,
created_at, updated_at

-- sites
id UUID PK, name TEXT, customer_id UUID FK, address TEXT,
contact TEXT, working_hours JSONB, created_at, updated_at
```

### 3.3 Dự án

```sql
-- projects
id UUID PK, customer_id UUID FK, site_id UUID FK,
name TEXT, status TEXT CHECK (status IN ('planned','in_progress','deployed','paused','ended')),
start_date DATE, end_date DATE, progress DECIMAL(5,2),
pm_id UUID FK, color TEXT, checklist JSONB,
created_at, updated_at
```

### 3.4 Thiết bị

```sql
-- devices
id UUID PK, project_id UUID FK, site_id UUID FK,
serial TEXT, type TEXT, model TEXT, mac_address TEXT UNIQUE,
rack_id TEXT, location TEXT, warranty_from DATE, warranty_to DATE,
status TEXT CHECK (status IN ('active','inactive','expired')),
created_at, updated_at
```

### 3.5 Cảnh báo / Sự cố

```sql
-- alerts
id UUID PK, device_id UUID FK, site_id UUID FK, project_id UUID FK,
severity TEXT CHECK (severity IN ('critical','major','minor')), status TEXT,
priority TEXT CHECK (priority IN ('low','medium','high','critical')),
owner_id UUID FK, description TEXT, source TEXT,
created_at, updated_at, resolved_at
```

### 3.6 Bảo trì

```sql
-- maintenances
id UUID PK, device_id UUID FK, project_id UUID FK,
type TEXT CHECK (type IN ('regular','emergency')),
schedule JSONB, due_date DATE, status TEXT,
checklist JSONB, result TEXT,
created_at, updated_at
```

### 3.7 Công việc

```sql
-- works
id UUID PK, project_id UUID FK, incident_id UUID FK,
assignee_id UUID FK, creator_id UUID FK, type TEXT,
title TEXT, description TEXT, status TEXT,
priority TEXT, due_date DATE,
created_at, updated_at
```

### 3.8 Báo cáo hiện trường

```sql
-- reports
id UUID PK, project_id UUID FK, user_id UUID FK,
type TEXT CHECK (type IN ('survey','deployment','maintenance')),
content TEXT, progress JSONB, photos JSONB,
signature TEXT, created_at, updated_at
```

### 3.9 Tài liệu

```sql
-- documents
id UUID PK, project_id UUID FK, name TEXT, file_url TEXT,
type TEXT, version INT, created_at, updated_at
```

### 3.10 Nhật ký truy cập

```sql
-- audit_logs
id UUID PK, user_id UUID FK, action TEXT, resource_type TEXT,
resource_id UUID FK, ip TEXT, user_agent TEXT,
created_at, updated_at
```

---

## 4. Phân quyền chi tiết (RBAC)

| Role | Dashboard | Project | Customer | Device | Incident | Maintenance | Work | Site Report | Admin |
|---|---|---|---|---|---|---|---|---|---|
| Employee | Xem | Xem | Xem | Xem | Xem | Xem | Xem | Xem | ✗ |
| Leader | Xem | Tạo/Sửa/Duyệt | Xem | Sửa/Duyệt | Giao/Đóng | Lập lịch | Giao cho team | Duyệt | ✗ |
| Manager | Xem | Toàn bộ | Thêm/Sửa | Sửa/Xóa | Duyệt RCA | Duyệt kế hoạch | Giao cho Leader | Duyệt | Thêm user/team mình (hạn chế) |
| Director | Xem toàn công ty | Xem tất cả | Toàn quyền | Xem | Xem báo cáo | Xem | Xem | Xem | ✓ |

---

## 5. Danh mục dùng chung

| Loại | Giá trị mẫu |
|---|---|
| device_type | VLAN, Router, Switch, Firewall, AP, Camera, Server |
| incident_severity | critical, major, minor |
| incident_priority | low, medium, high, critical |
| incident_status | new, acknowledged, in_progress, resolved, closed |
| project_status | planned, in_progress, deployed, paused, ended |
| maintenance_type | regular, emergency |
| report_type | survey, deployment, maintenance |

---

## 6. Local Time – Asia/Ho_Chi_Minh (GMT +7)

### 6.1 Tất cả trường datetime trong database

| Cột | Kiểu | Lưu ý |
|---|---|---|
| `created_at` | TIMESTAMP WITH TIME ZONE (timestamptz) | Lưu ISO 8601 với UTC, hiển thị ngược lại thành Asia/Ho_Chi_Minh |
| `updated_at` | TIMESTAMP WITH TIME ZONE (timestamptz) | Cập nhật tự động khi thay đổi |
| `due_date` | DATE | Không có giờ, chỉ ngày (ví dụ: 2026-11-17) |
| `start_date`, `end_date` | DATE | Cho dự án, bảo trì |
| `warranty_from`, `warranty_to` | DATE | Bảo hành |
| `audit_logs.created_at` | TIMESTAMP WITH TIME ZONE | Ghi lại thời gian thao tác |

### 6.2 Điều hướng giờ trong hệ thống

| Mặt | Cách xử lý |
|---|---|
| Frontend | Hiển thị theo UTC+7 (Asia/Ho_Chi_Minh) |
| Backend | Lưu thời gian từ `timestamptz` chuẩn UTC |
| Database | Mặc định `Time Zone = 'Asia/Ho_Chi_Minh'` |

### 6.3 Ví dụ

```sql
-- Tạo bảng với mặc định: giờ local tăng dần
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Query: lấy thời gian theo GMT+7
SELECT created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' AS vietnam_time
FROM reports
WHERE created_at > now() - interval '1 day';
```

---

## 7. Lưu ý thiết kế

- Tên bảng dùng snake_case, chuẩn thành tiếng Việt
- UUID dùng `gen_random_uuid()`
- Datetime dùng `TIMESTAMP WITH TIME ZONE (timestamptz)` để tự động xử lý GMT+7
- JSONB dùng cho định dạng linh hoạt (checklist, schedule, photos)
- Không lưu mật khẩu thiết bị, IP, thông tin truy cập trực tiếp
- Audit log ghi lại tất cả thay đổi
- Backup định kỳ, restore test

---

## 8. Kiểm thử cơ sở dữ liệu

- Xem dữ liệu không bị rò rả (RLS, row filter)
- Test cascade delete
- Test unique serial trùng
- Test role-based filter
- Test backup & restore
- Test index hiệu suất
- Test JSONBquet
- Test giờ địa phương (GMT+7)
