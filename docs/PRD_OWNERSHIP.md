# 📋 FDI_Project — PRD Ownership, Acceptance Criteria & Test Plan

> 📁 **Vị trí tài liệu:** `docs/PRD_OWNERSHIP.md`  
> Phiên bản 1.0 · Ngày lập 2026-11-17 · Ngôn ngữ: Tiếng Việt  
> Bám sát `checklist.md` §9 (7 mục) + `rbac_matrix.md` + `roadmap.md` + `product.md`.

---

## 1. Mục đích & Phạm vi

Tài liệu này gán **owner rõ ràng** cho mọi module hiện có, đồng thời định nghĩa
**requirement**, **acceptance criteria (AC)**, **test plan (test case + test data)**,
**risk/dependency/constraint** cho từng module — đáp ứng §9 #1–7.

- §9 #1: mọi module có owner (PM/Leader/Manager/Director/Engineer).
- §9 #2: requirement rõ ràng, không mơ hồ.
- §9 #3: acceptance criteria (cách kiểm tra, standard).
- §9 #4: test plan (test cases, test data).
- §9 #5: owner theo vai trò dự án (dev, QA, PM, design).
- §9 #6: plan gồm scope, team, timeline, budget.
- §9 #7: risk, dependency, constraint.

> ⚠️ **Ghi chú về số liệu:** các cột "Timeline/Budget" là ước tính theo `roadmap.md`
> (Bản 1 = 10 tuần, Bản 2 = 4 tuần, Bản 3 = 2 tuần). Budget không được ghi cụ thể
> vì không có số liệu thật — để `TBD (chưa có số liệu))`, KHÔNG bịa.

---

## 2. Bảng ký hiệu owner

| Ký hiệu | Vai trò dự án | Trách nhiệm chính |
|---|---|---|
| PM | Product Manager | Scope, requirement, priority, acceptance |
| TL | Tech Lead / Leader | Kiến trúc, review code, kỹ thuật |
| MGR | Manager (nghiệp vụ) | Duyệt kế hoạch, SLA, dữ liệu phòng |
| DIR | Director | Duyệt nghiệm thu, bức tranh tổng thể |
| ENGR | Engineer (dev) | Implement, unit test |
| QA | QA | Test plan, test case, báo lỗi |
| DES | Design | UI/UX, design token |

---

## 3. Ma trận Ownership tổng hợp (§9 #1, #5)

| Module | Owner (nghiệp vụ) | Owner (dev) | QA | Design | Bản |
|---|---|---|---|---|---|
| Dashboard | DIR | TL | QA | DES | Bản 3 |
| Login / Auth & RBAC | MGR | TL | QA | DES | Bản 1 |
| Customers (Khách hàng) | MGR | ENGR | QA | DES | Bản 1 |
| Projects (Dự án) | TL | ENGR | QA | DES | Bản 1 |
| Devices (Thiết bị/Serial) | TL | ENGR | QA | DES | Bản 1 |
| Alerts (Cảnh báo/Sự cố) | MGR | ENGR | QA | DES | Bản 2 |
| Maintenance (Bảo trì) | MGR | ENGR | QA | DES | Bản 2 |
| Reports (Site Report) | MGR | ENGR | QA | DES | Bản 1/3 |
| Admin (Quản trị) | DIR | TL | QA | DES | Bản 1 |
| Works (Công việc) | TL | ENGR | QA | DES | Bản 2 |
| Notifications (Thông báo) | MGR | ENGR | QA | DES | Bản 2 |

---

## 4. Chi tiết từng module

### 4.1 Dashboard

| Mục | Nội dung |
|---|---|
| **Owner** | DIR (nghiệp vụ) / TL (dev) / QA / DES |
| **Requirement (§9 #2)** | KPI: tổng dự án, sự cố đang mở theo mức độ, SLA, bảo trì đủ hạn; lọc theo phòng/mức độ/trạng thái; bấm KPI tới chi tiết; scope 4 role (employee→việc của mình, director→toàn công ty). |
| **Acceptance Criteria (§9 #3)** | (1) Mọi số liệu query từ DB thật, không hardcode; (2) scope đúng 4 role qua `fdi_current_role()`; (3) giờ hiển thị GMT+7 (`Intl`); (4) KPI clicks điều hướng đúng; (5) không có nút dead. |
| **Test Cases (§9 #4)** | TC1: login từng role → số KPI đúng scope. TC2: đổi severity → lọc đúng. TC3: kiểm tra không còn chuỗi hardcode cũ (`VN Telecom`, `-2 %`, `98%`). TC4: bấm KPI → route chi tiết. |
| **Test Data** | Seed migration `003`: 4 user, 1 customer, 1 site, 1 project, 3 device, 3 alert, 2 maintenance, 2 work, 1 report. |
| **Risk / Dependency / Constraint (§9 #7)** | Rủi ro: lệch scope do JWT stale. Dependency: RPC `fdi_current_role()`, bảng alerts/projects/maintenances. Constraint: Director = "Xem toàn công ty" (quyết định Dev Director 2026-11-17). |
| **Scope / Team / Timeline / Budget (§9 #6)** | Scope: KPI + lọc + drill-down. Team: TL+ENGR+QA+DES. Timeline: Bản 3 (2 tuần, roadmap §2.3). Budget: TBD. |

### 4.2 Login / Auth & RBAC

| Mục | Nội dung |
|---|---|
| **Owner** | MGR (nghiệp vụ) / TL (dev) / QA / DES |
| **Requirement** | 4 role (employee/leader/manager/director); JWT + refresh; cookie HttpOnly (`sb-access-token`); RBAC cứng tầng edge (`proxy.ts`) chặn `/admin` với employee/leader; RLS 47 policy; audit log mọi thay đổi. |
| **Acceptance Criteria** | (1) Token giả/hết hạn → 307 về `/login?callbackUrl=`; (2) employee/leader vào `/admin` → redirect `/dashboard`; (3) security headers present (`X-Content-Type-Options`, `X-Frame-Options`, ...); (4) rate-limit 100 req/60s (req 101 → 429). |
| **Test Cases** | TC1: login đúng → cookie HttpOnly set. TC2: fake token → 307. TC3: mỗi role truy cập `/admin`. TC4: curl `-D -` kiểm tra header. TC5: 105 request → 100×401 + 5×429. TC6: RLS set claims → employee thấy 0 dòng, manager/director thấy 4/1/1/3/3. |
| **Test Data** | 4 user seed (`@fdi.local`); JWT có `app_metadata.role`. |
| **Risk / Dependency / Constraint** | Rủi ro: lộ secret (đã yêu cầu rotate 2026-11-17). Dependency: Supabase Auth, Upstash Redis. Constraint: internal trust model — not high-security multi-tenant (`rbac_matrix.md` §7). |
| **Scope / Team / Timeline / Budget** | Scope: login, RBAC, audit, rate-limit. Team: TL+ENGR+QA. Timeline: Bản 1 (10 tuần). Budget: TBD. |

### 4.3 Customers (Khách hàng)

| Mục | Nội dung |
|---|---|
| **Owner** | MGR / ENGR / QA / DES |
| **Requirement** | Hồ sơ khách (tên, ngành, đầu mối), site/chi nhánh, dịch vụ, hợp đồng (giá trị/SLA/bảo trì), lịch sử dự án/sự cố/ticket, "sức khỏe khách hàng". |
| **Acceptance Criteria** | (1) CRUD đầy đủ, form có label/placeholder; (2) chỉ manager/director thêm/sửa (theo matrix); (3) employee/leader chỉ xem; (4) mọi thay đổi ghi audit (DB trigger + client helper). |
| **Test Cases** | TC1: manager tạo customer → row xuất hiện. TC2: employee cố sửa → nút ẩn/blocked. TC3: INSERT/UPDATE/DELETE → audit 0→1→2→3 với diff đúng. TC4: validate tên trùng, email format. |
| **Test Data** | Seed: 1 customer (`AUDIT TEST` trong transaction rollback). |
| **Risk / Dependency / Constraint** | Rủi ro: dữ liệu nhạy cảm (bank, NDA) phải ẩn (`rbac_matrix.md` §5.3). Dependency: bảng `customers`, `sites`. Constraint: giá trị hợp đồng chỉ Director thấy đầy đủ. |
| **Scope / Team / Timeline / Budget** | Scope: hồ sơ + site + hợp đồng. Team: ENGR+QA+DES. Timeline: Bản 1. Budget: TBD. |

### 4.4 Projects (Dự án)

| Mục | Nội dung |
|---|---|
| **Owner** | TL / ENGR / QA / DES |
| **Requirement** | Tab: tổng quan, tiến độ & milestone, ảnh onsite, sơ đồ mạng, tủ rack, thiết bị & serial, tài liệu, rủi ro. Progress 0–100%; chỉ chuyển "Deployed" khi đủ checklist bàn giao. |
| **Acceptance Criteria** | (1) Status enum đúng `planned/in_progress/deployed/paused/ended`; (2) progress trong [0,100]; (3) rule checklist bàn giao khi chuyển deployed; (4) scope theo role (leader sửa team, director duyệt nghiệm thu). |
| **Test Cases** | TC1: tạo project → milestone hiển thị. TC2: progress=150 → reject. TC3: đổi status thiếu checklist → block. TC4: employee chỉ thấy dự án được gán (RLS). |
| **Test Data** | Seed: 1 project. |
| **Risk / Dependency / Constraint** | Dependency: `customers`, `sites`, `devices`. Constraint: checklist bàn giao bắt buộc (`product.md` §4.3). |
| **Scope / Team / Timeline / Budget** | Scope: CRUD + milestone + checklist + upload. Team: ENGR+QA+DES. Timeline: Bản 1. Budget: TBD. |

### 4.5 Devices (Thiết bị / Serial)

| Mục | Nội dung |
|---|---|
| **Owner** | TL / ENGR / QA / DES |
| **Requirement** | Serial (xương sống): type, model, MAC, rack, vị trí, bảo hành từ–đến, status `active/inactive/expired`. Liên kết alert/maintenance/warranty. |
| **Acceptance Criteria** | (1) serial unique trong project; (2) MAC unique; (3) ngày bảo hành `timestamptz`/date đúng; (4) quyền: employee nhập khi được gán, manager sửa/xóa, director chỉ xem. |
| **Test Cases** | TC1: serial trùng → reject. TC2: gán device → xem được alert/maintenance liên quan. TC3: director cố xóa → blocked. TC4: hạn bảo hành hết → status=expired. |
| **Test Data** | Seed: 3 device. |
| **Risk / Dependency / Constraint** | Dependency: `projects`, `sites`, `alerts`, `maintenances`. Rủi ro: serial trùng gây nhầm bảo hành. |
| **Scope / Team / Timeline / Budget** | Scope: CRUD + liên kết. Team: ENGR+QA+DES. Timeline: Bản 1. Budget: TBD. |

### 4.6 Alerts (Cảnh báo / Sự cố)

| Mục | Nội dung |
|---|---|
| **Owner** | MGR / ENGR / QA / DES |
| **Requirement** | Nhập tay/dán email; severity `critical/major/minor`; status `new/acknowledged/in_progress/resolved/closed`; ma trận thời gian phản hồi (Critical 15p, Major 1h); gộp trùng; escalation; maintenance window không tính sự cố. |
| **Acceptance Criteria** | (1) Enum hợp lệ (không có ghost `open` — đã sửa); (2) sort theo severity/status; (3) SLA track từ nhận→đóng; (4) leader giao việc/đóng, manager duyệt RCA. |
| **Test Cases** | TC1: tạo alert severity=critical → hiện đúng badge. TC2: filter severity. TC3: escalation leader→manager→director. TC4: maintenance window → không tính vi phạm. TC5: gộp alert trùng. |
| **Test Data** | Seed: 3 alert. |
| **Risk / Dependency / Constraint** | Dependency: `devices`, `projects`, `works`. Rủi ro: trễ SLA. Constraint: maintenance window logic (`product.md` §4.2). |
| **Scope / Team / Timeline / Budget** | Scope: alert + severity + SLA + escalation. Team: ENGR+QA+DES. Timeline: Bản 2 (4 tuần). Budget: TBD. |

### 4.7 Maintenance (Bảo trì)

| Mục | Nội dung |
|---|---|
| **Owner** | MGR / ENGR / QA / DES |
| **Requirement** | Lịch định kỳ/đột xuất (`regular`/`emergency`), thông báo khách, checklist, kết quả; trạng thái `planned/in_progress/completed/skipped`. |
| **Acceptance Criteria** | (1) Type/schedule/checklist/result lưu đúng; (2) manager duyệt kế hoạch; (3) employee thực hiện; (4) bảo trì trong window không tính sự cố. |
| **Test Cases** | TC1: tạo lịch định kỳ → due_date đúng. TC2: employee cập nhật result. TC3: manager duyệt. TC4: maintenance window purge alert. |
| **Test Data** | Seed: 2 maintenance. |
| **Risk / Dependency / Constraint** | Dependency: `devices`, `projects`, `alerts`. Constraint: thông báo khách phải soạn tay (không tự gửi). |
| **Scope / Team / Timeline / Budget** | Scope: lịch + checklist + kết quả. Team: ENGR+QA+DES. Timeline: Bản 2. Budget: TBD. |

### 4.8 Reports (Site Report)

| Mục | Nội dung |
|---|---|
| **Owner** | MGR / ENGR / QA / DES |
| **Requirement** | Báo cáo khảo sát/triển khai/bảo trì; template chuẩn (thông tin site, hiện trạng, công việc, ảnh, tồn đọng, đề xuất, chữ ký); xuất PDF; tổng hợp tuần/tháng. |
| **Acceptance Criteria** | (1) Type `survey/deployment/maintenance`; (2) ảnh 1–20, mỗi ≤5MB; (3) PDF export đúng template; (4) leader/manager duyệt, director chỉ xem. |
| **Test Cases** | TC1: tạo report + upload ảnh. TC2: export PDF → nội dung đúng. TC3: file >5MB → reject. TC4: employee tạo, leader duyệt. |
| **Test Data** | Seed: 1 report. |
| **Risk / Dependency / Constraint** | Dependency: `projects`, `pdf-lib`, storage. Rủi ro: upload fail → retry queue (`product.md` §10.3). |
| **Scope / Team / Timeline / Budget** | Scope: form + ảnh + PDF. Team: ENGR+QA+DES. Timeline: Bản 1 (cơ bản) / Bản 3 (PDF). Budget: TBD. |

### 4.9 Admin (Quản trị)

| Mục | Nội dung |
|---|---|
| **Owner** | DIR / TL / QA / DES |
| **Requirement** | Người dùng, team, vai trò; danh mục dùng chung; cấu hình SLA; audit log; **export/import role config** (§4 #11, API `/api/admin/roles` + UI `/admin/roles`). |
| **Acceptance Criteria** | (1) Chỉ manager/director truy cập (edge + API check → 403); (2) export JSON có users + roleMatrix; (3) import validate role, upsert theo email, không tự hạ quyền; (4) audit log ghi lại thao tác; (5) UI ẩn với employee/leader. |
| **Test Cases** | TC1: employee GET → 403. TC2: director GET → 200 JSON đúng schema. TC3: POST role=invalid → 400. TC4: POST upsert → updated count. TC5: manager tự hạ role → skipped. TC6: UI ẩn với employee. |
| **Test Data** | 4 user seed + file JSON export mẫu. |
| **Risk / Dependency / Constraint** | Dependency: bảng `users` (password_hash NOT NULL → chỉ update user có sẵn), RLS policies. Constraint: không tạo user mới qua import (phải qua màn hình đặt mật khẩu). |
| **Scope / Team / Timeline / Budget** | Scope: user/team/role CRUD + export/import + audit. Team: TL+ENGR+QA+DES. Timeline: Bản 1 + §4 #11. Budget: TBD. |

### 4.10 Works (Công việc)

| Mục | Nội dung |
|---|---|
| **Owner** | TL / ENGR / QA / DES |
| **Requirement** | Người giao/nhận, hạn, ưu tiên, liên kết project/incident; type `maintenance/bug/task`; status `todo/in_progress/completed/on_hold`; tạo từ sự cố. |
| **Acceptance Criteria** | (1) Liên kết `incident_id`/`project_id` đúng; (2) leader giao team, manager giao leader; (3) employee chỉ thấy việc của mình; (4) incident→task activity. |
| **Test Cases** | TC1: tạo work từ alert. TC2: gán assignee. TC3: đổi status. TC4: employee chỉ thấy việc mình. |
| **Test Data** | Seed: 2 work. |
| **Risk / Dependency / Constraint** | Dependency: `projects`, `alerts`. Constraint: scope theo assignee (`rbac_matrix.md` §3 Work). |
| **Scope / Team / Timeline / Budget** | Scope: CRUD + giao việc + link. Team: ENGR+QA+DES. Timeline: Bản 2. Budget: TBD. |

### 4.11 Notifications (Thông báo)

| Mục | Nội dung |
|---|---|
| **Owner** | MGR / ENGR / QA / DES |
| **Requirement** | Soạn nội dung email/Zalo/group để **copy** (không tự gửi); đăng ký kênh notification; gắn với alert/maintenance. |
| **Acceptance Criteria** | (1) Nội dung soạn hiển thị để copy; (2) không có hành vi tự gửi thật; (3) chỉ manager+ soạn/thêm kênh (theo matrix). |
| **Test Cases** | TC1: soạn nội dung → copy được. TC2: employee cố gửi → blocked. TC3: validate kênh (email format). |
| **Test Data** | Nội dung mẫu soạn tay (không gửi thật). |
| **Risk / Dependency / Constraint** | ⚠️ **Chưa có bảng `notifications` trong schema hiện tại** — module này mới ở dạng spec (`roadmap.md` Bản 2), chưa implement. Constraint: KHÔNG tự gửi (rủi ro gửi nhầm khách). |
| **Scope / Team / Timeline / Budget** | Scope: soạn + copy + registry (cần migration mới). Team: ENGR+QA+DES. Timeline: Bản 2. Budget: TBD (cần migration bảng). |

---

## 5. Checklist §9 — đối chiếu nhanh

| §9 # | Yêu cầu | Trạng thái | Bằng chứng |
|---|---|---|---|
| 1 | Owner rõ cho mọi module | ✅ | Bảng §3 + §4 (11 module, mỗi module có owner) |
| 2 | Requirement rõ ràng | ✅ | Dòng "Requirement" mỗi module |
| 3 | Acceptance criteria | ✅ | Dòng "Acceptance Criteria" mỗi module |
| 4 | Test plan (case + data) | ✅ | Dòng "Test Cases" + "Test Data" mỗi module |
| 5 | Owner dev/QA/PM/design | ✅ | Bảng §3 (cột dev, QA, design) |
| 6 | Scope/team/timeline/budget | ✅ | Dòng cuối mỗi module (budget = TBD, không bịa) |
| 7 | Risk/dependency/constraint | ✅ | Dòng "Risk / Dependency / Constraint" mỗi module |

> **Lưu ý trung thực:** budget để `TBD` vì không có số liệu thật; module Notifications
> **chưa có bảng DB** (mới spec). Không ghi ✅ cho items chưa có bằng chứng.

---

*Người lập: [Tên] – [Vai trò] – 2026-11-17 – v1.0*  
*Nguồn: `checklist.md` §9, `rbac_matrix.md`, `product.md`, `roadmap.md`, `database_schema.sql`.*
