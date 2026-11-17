# FDI_Project — PRD Ownership, Acceptance Criteria & Test Governance

**Phiên bản:** 2.0 (đề xuất review)  
**Ngày:** 2026-11-17  
**Đường dẫn đề xuất:** `docs/PRD_OWNERSHIP.md`  
**Trạng thái:** DRAFT — chưa phê duyệt, chưa xác nhận triển khai  
**Nguồn:** `PRD_OWNERSHIP.md` v1.0 do nhóm cung cấp; các tham chiếu `product.md`, `rbac_matrix.md`, `roadmap.md`, `checklist.md`, `database_schema.sql` chưa được đối chiếu trực tiếp trong lần biên tập này.

> **Nguyên tắc:** Tài liệu này quản trị ownership, nghiệm thu và bằng chứng kiểm thử. `product.md` là nguồn yêu cầu nghiệp vụ; `rbac_matrix.md` là nguồn ma trận quyền; `tech_spec.md`/`api_spec.md` là nguồn contract kỹ thuật. Nếu mâu thuẫn, ghi **OPEN / cần quyết định**, không tự giả định đã được chốt.

## 1. Phạm vi và nguyên tắc

- Ứng dụng **nội bộ của một tổ chức**, không SaaS, không Multi-Tenant; kiến trúc dự kiến **một Next.js 16 app + Supabase PostgreSQL**, theo định hướng đã thống nhất. Không phát sinh tenant/billing/subscription.
- Quản lý các module hiện có trong v1: Dashboard; Login/Auth/RBAC; Customers; Projects; Devices; Alerts; Maintenance; Reports/Site Report; Admin; Works; Notifications.
- Bốn **vai trò người dùng nghiệp vụ**: Employee, Leader, Manager, Director. **Vai trò delivery** (Product Owner, Tech Lead, QA, Designer, Developer, Release Owner) là khái niệm khác.
- Mỗi yêu cầu có ID, nguồn, người quyết định, acceptance criteria, test cases và bằng chứng. Không đánh dấu PASS chỉ vì đã viết tài liệu.
- Các mục có nhãn **[PROPOSED]** cần xác nhận; **[SOURCE v1]** là thông tin từ tài liệu gốc; **[OPEN]** chưa quyết định.

## 2. Document control và trạng thái

| Trường | Giá trị |
|---|---|
| Business sponsor | [OPEN: cá nhân cụ thể] |
| Product Owner | [OPEN: cá nhân cụ thể] |
| Technical Owner | [OPEN: cá nhân cụ thể] |
| QA Owner | [OPEN: cá nhân cụ thể] |
| Release Owner | [OPEN: cá nhân cụ thể] |
| Quyền phê duyệt | Business DRI duyệt nghiệp vụ; Technical DRI duyệt kỹ thuật; QA xác nhận test; Release Owner quyết định phát hành [PROPOSED] |
| Trạng thái tài liệu | Draft → In Review → Approved → Superseded [PROPOSED] |
| Thay đổi yêu cầu | Ghi change request, impact, người duyệt, phiên bản, ngày hiệu lực [PROPOSED] |

### 2.1 Phân biệt các trạng thái

- **Documented:** đã có nội dung mô tả.
- **Reviewed:** đã có review và xử lý comments.
- **Approved:** được người có thẩm quyền phê duyệt.
- **Implemented:** có code/DB migration liên kết.
- **Tested:** có test run và kết quả.
- **Accepted:** Business DRI ký nghiệm thu.
- **Released:** triển khai production và có release evidence.

Không suy ra một trạng thái từ trạng thái khác. Đặc biệt, `Documented ≠ Tested ≠ Accepted`.

## 3. Quy tắc Ownership / RACI

**DRI (Directly Responsible Individual)** phải là **một cá nhân được chỉ định** cho mỗi trách nhiệm; role dưới đây chỉ là vị trí đề xuất. Không dùng ký hiệu `TL` làm Business Owner chỉ vì TL phát triển tính năng.

| Vai trò delivery | Trách nhiệm | Quyền quyết định |
|---|---|---|
| Business DRI | Mục tiêu, scope, business rules, UAT | Phê duyệt AC nghiệp vụ |
| Technical DRI | Thiết kế, API/DB, security, review | Phê duyệt thiết kế kỹ thuật |
| Implementation Owner | Code, migration, unit/integration test | Đề xuất hoàn thành implementation |
| QA Owner | Test strategy, test evidence, defect triage | Xác nhận QA pass/fail |
| Designer | UX flows, usability, accessibility | Sign-off UI theo phạm vi phân công |
| Release Owner | Release gate, rollback, monitoring | Go / No-Go production |

### 3.1 Ma trận module ownership (đề xuất, cần bổ nhiệm người)

| Module | Business DRI đề xuất | Technical DRI | QA | UAT approver đề xuất | Phase theo v1 |
|---|---|---|---|---|---|
| Dashboard | Director | Tech Lead | QA Lead | Director | Bản 3 |
| Login / Auth / RBAC | System Owner **[OPEN]** | Tech Lead | QA Lead | System Owner | Bản 1 |
| Customers | Business Manager | Engineering Lead | QA Lead | Business Manager | Bản 1 |
| Projects | Project Manager | Engineering Lead | QA Lead | Project Manager | Bản 1 |
| Devices | Operations Manager | Engineering Lead | QA Lead | Operations Manager | Bản 1 |
| Alerts / Incidents | Operations Manager | Engineering Lead | QA Lead | Operations Manager | Bản 2 |
| Maintenance | Operations Manager | Engineering Lead | QA Lead | Operations Manager | Bản 2 |
| Site Reports | Project Manager | Engineering Lead | QA Lead | Project Manager | Bản 1 cơ bản / Bản 3 PDF |
| Admin | System Owner **[OPEN]** | Tech Lead | QA Lead | System Owner | Bản 1 |
| Works | Project Manager | Engineering Lead | QA Lead | Project Manager | Bản 2 |
| Notifications | Operations Manager | Engineering Lead | QA Lead | Operations Manager | Bản 2 |

**Lưu ý:** Bảng v1 gán Business Owner của Projects/Devices/Works cho `TL` và gán Auth cho `MGR`. Bảng trên là **đề xuất phân vai**, không tự động thay thế các bổ nhiệm hiện hành. Cần xác nhận với người quản lý sản phẩm.

### 3.2 RACI cho các quyết định trọng yếu [PROPOSED]

| Hoạt động | Business DRI | Technical DRI | QA | Release Owner |
|---|---|---|---|---|
| Chốt scope/AC | A/R | C | C | I |
| Chốt API/DB/security | C | A/R | C | I |
| Xây test plan và chạy test | C | C | A/R | I |
| Business UAT | A/R | C | R | I |
| Go/No-Go | C | C | C | A/R |

*A = accountable; R = responsible; C = consulted; I = informed.*

## 4. Traceability: yêu cầu → AC → Test → Evidence

### 4.1 Mẫu bắt buộc cho mỗi requirement

| Trường | Ví dụ / quy tắc |
|---|---|
| Requirement ID | `PRJ-REQ-001` |
| Module / source | Projects / `product.md` mục tương ứng |
| Requirement | Hành vi có thể quan sát, không mô tả mơ hồ |
| Priority | P0 / P1 / P2 |
| Business DRI | Họ tên, không chỉ role |
| AC IDs | `PRJ-AC-001...` |
| Test Case IDs | `PRJ-TC-001...` |
| API / DB / UI references | Endpoint, migration, screen (nếu có) |
| Evidence | Link CI run, screenshot, logs đã che dữ liệu, test report |
| Status | Documented / Reviewed / Approved / Implemented / Tested / Accepted / Released |
| Decision / open questions | ID quyết định, ngày, người duyệt |

### 4.2 AC format

`Given [điều kiện và quyền] / When [hành động] / Then [kết quả cụ thể]`.

AC phải có positive, negative, boundary, access-control và failure/retry cases khi liên quan. Các con số, HTTP status, cookie name, SQL policy count là **technical test assertions**, không mặc định là business AC.

## 5. Module requirements & minimum acceptance coverage

> Đây là **baseline kiểm thử đề xuất**, không khẳng định tính năng đã được implement. Các quyết định còn mâu thuẫn được liệt kê tại §8.

### 5.1 Dashboard (`DASH`)

**[SOURCE v1]** KPI projects, alerts, SLA, maintenance; lọc và drill-down theo scope vai trò.

- `DASH-AC-01`: Given người dùng có quyền, When mở dashboard, Then KPI được tính từ dữ liệu hợp lệ trong phạm vi được cấp; không hardcode.
- `DASH-AC-02`: Given dữ liệu có ít nhất hai team/phòng, When đăng nhập các vai trò khác nhau, Then chỉ trả KPI thuộc scope hợp lệ.
- `DASH-AC-03`: Given người dùng chọn bộ lọc, When drill-down, Then danh sách chi tiết nhất quán với KPI, bộ lọc và quyền.
- `DASH-AC-04`: Given không có dữ liệu hoặc API lỗi, Then hiển thị empty/error state, không hiển thị số liệu sai.
- **Test data:** ≥2 departments, ≥2 teams, nhiều projects, alerts ở nhiều trạng thái; timezone boundary.
- **Dependency:** chốt công thức KPI, quyền xem và nguồn dữ liệu.

### 5.2 Login / Auth / RBAC (`AUTH`)

**[SOURCE v1]** 4 roles; JWT/refresh; server-side access control; RLS; rate limit; audit.

- `AUTH-AC-01`: Người chưa xác thực không đọc được dữ liệu được bảo vệ.
- `AUTH-AC-02`: Người dùng thiếu quyền bị từ chối **tại server/database**, kể cả khi gọi API trực tiếp hoặc sửa request.
- `AUTH-AC-03`: User chỉ truy cập được project/team/department theo ma trận quyền đã phê duyệt; không rò dữ liệu qua count, export, search, storage URL.
- `AUTH-AC-04`: Logout/revocation/expiry có hành vi xác định; không để session cũ tiếp tục thao tác trái phép.
- `AUTH-AC-05`: Rate-limit áp dụng đúng đối tượng, cửa sổ và hành vi đã chốt; không cố định `100/60s` khi chưa có quyết định.
- **Test data:** tối thiểu 4 roles × nhiều teams/departments, user inactive, user không assignment, user có role vừa thay đổi.
- **Technical verification:** kiểm tra `proxy.ts`, server handlers, Supabase RLS và service-role usage; tên cookie, redirect status, số policy cần xác minh với code thực tế.

### 5.3 Customers (`CUS`)

- `CUS-AC-01`: Người có quyền tạo/sửa khách hàng; dữ liệu bắt buộc được validate và lỗi trả rõ.
- `CUS-AC-02`: Người chỉ có quyền xem không thể sửa qua UI, API hoặc DB policy.
- `CUS-AC-03`: Giá trị hợp đồng và thông tin nhạy cảm chỉ hiển thị cho vai trò được phê duyệt.
- `CUS-AC-04`: Thay đổi dữ liệu có audit trail đầy đủ, không ghi trùng một hành động nghiệp vụ do cả trigger và helper.
- **Test:** duplicate handling, invalid email, cross-scope access, audit actor/diff, archived customer.
- **[OPEN]:** định nghĩa khách hàng trùng và quyền xem hợp đồng.

### 5.4 Projects (`PRJ`)

- `PRJ-AC-01`: Project thuộc customer hợp lệ, trạng thái đúng enum đã chốt.
- `PRJ-AC-02`: Progress nhận giá trị từ 0 đến 100; giá trị ngoài miền bị từ chối tại server.
- `PRJ-AC-03`: Chuyển `deployed` chỉ khi checklist bắt buộc được hoàn thành và người dùng có quyền.
- `PRJ-AC-04`: User ngoài project/team/department không đọc/sửa project ngoài phạm vi.
- `PRJ-AC-05`: Nhiều site trong một project được xử lý theo quan hệ đã chốt, không mất lịch sử khi cập nhật.
- **Test:** transition hợp lệ/bất hợp lệ, concurrency, missing checklist, upload failure.
- **[OPEN]:** quan hệ Project–Site và quy trình nghiệm thu cuối.

### 5.5 Devices (`DEV`)

- `DEV-AC-01`: Serial và MAC tuân thủ quy tắc unique được phê duyệt, có chuẩn hóa định dạng.
- `DEV-AC-02`: Device có site/customer hiện hành hợp lệ và lịch sử thay đổi vị trí khi cần.
- `DEV-AC-03`: Alert, maintenance, warranty truy ngược được đúng device.
- `DEV-AC-04`: Người không có quyền không sửa/xóa device; các thay đổi nhạy cảm được audit.
- **Test:** duplicate serial khác project/site, device move, warranty boundary, soft-delete/history.
- **[OPEN]:** `serial unique within project` từ v1 có phù hợp khi chuyển thiết bị hay không; `expired` là warranty hay operational status?

### 5.6 Alerts / Incidents (`ALT`)

- `ALT-AC-01`: Alert có severity/status hợp lệ và nguồn/timestamp được ghi nhận.
- `ALT-AC-02`: Gộp trùng không làm mất lịch sử alert gốc; quy tắc dedupe có thể kiểm chứng.
- `ALT-AC-03`: Acknowledge/assign/escalate ghi actor và thời điểm; không thể chuyển trạng thái trái quy tắc.
- `ALT-AC-04`: SLA tính theo timestamp, lịch làm việc, hợp đồng và maintenance window đã được phê duyệt.
- `ALT-AC-05`: Không xóa (`purge`) cảnh báo do maintenance window; nếu suppress, phải giữ dấu vết và lý do.
- **Test:** duplicate arrival, out-of-order events, SLA boundary, escalation, unauthorized closure.
- **[OPEN]:** tách `Alert` và `Incident` hay sử dụng một entity; `SLA response` đo tới acknowledgement hay tới first response; mục tiêu 15 phút/1 giờ trong v1 cần xác nhận theo hợp đồng.

### 5.7 Maintenance (`MNT`)

- `MNT-AC-01`: Lịch bảo trì có due date/window, phạm vi site/device, người phụ trách và checklist hợp lệ.
- `MNT-AC-02`: Người thực hiện chỉ cập nhật được hạng mục được giao; người duyệt tuân theo matrix.
- `MNT-AC-03`: Completed/skipped có lý do, bằng chứng và lịch sử thay đổi.
- `MNT-AC-04`: Maintenance window tác động SLA theo policy, không xóa alert.
- **Test:** recurrence boundary, timezone, overlap, missed maintenance, rejected checklist.
- **[OPEN]:** cách lưu recurrence và định nghĩa maintenance window.

### 5.8 Reports / Site Report (`RPT`)

- `RPT-AC-01`: Engineer có quyền tạo và lưu draft báo cáo đúng project/site.
- `RPT-AC-02`: Submit chỉ thành công khi các trường/ảnh bắt buộc hợp lệ; lỗi phải chỉ rõ trường.
- `RPT-AC-03`: Review/approve/reject chỉ do vai trò được phân quyền thực hiện; lưu actor/time/comment.
- `RPT-AC-04`: Báo cáo đã duyệt không thể bị sửa âm thầm; revision có lịch sử.
- `RPT-AC-05`: Upload kiểm tra MIME/type/size/access; file lỗi không tạo bản ghi giả thành công.
- `RPT-AC-06`: PDF khi thuộc phase được duyệt phải khớp nội dung và phiên bản báo cáo.
- **Test:** 0/1/20/21 ảnh, 5MB boundary, offline/retry (nếu được duyệt), permission, PDF content.
- **[OPEN]:** có bắt buộc ≥1 ảnh cho mọi loại report không; workflow approval và PDF thuộc bản nào.

### 5.9 Admin (`ADM`)

- `ADM-AC-01`: Chỉ người được phân quyền quản trị có thể đọc/sửa role và cấu hình.
- `ADM-AC-02`: Import/export role config có schema validation, dry-run, preview diff, audit và cơ chế chống privilege escalation **[PROPOSED]**.
- `ADM-AC-03`: Không thể tự nâng quyền, hạ quyền người khác trái chính sách hoặc vô hiệu hóa tài khoản quản trị cuối cùng **[PROPOSED]**.
- `ADM-AC-04`: API và UI thực thi cùng một policy; không dựa vào ẩn menu.
- **Test:** invalid JSON, duplicate email, privilege escalation, rollback, audit.
- **[OPEN]:** Manager được phép truy cập phần nào của Admin; role import có thực sự nằm trong MVP; `password_hash` thuộc Supabase Auth hay bảng ứng dụng.

### 5.10 Works (`WRK`)

- `WRK-AC-01`: Work có title, assignee, due date/status theo quy tắc được chốt.
- `WRK-AC-02`: Leader/Manager chỉ giao việc trong phạm vi quyền.
- `WRK-AC-03`: Work liên kết đúng project hoặc incident/alert đã quyết định, không tạo orphan reference.
- `WRK-AC-04`: Chuyển completed ghi thời gian và người thực hiện; lỗi cập nhật không làm mất dữ liệu.
- **Test:** cross-team assignment, overdue boundary, deleted assignee, invalid transition.
- **[OPEN]:** `incident_id` trong schema nhưng flow v1 tạo work từ alert.

### 5.11 Notifications (`NTF`)

**[SOURCE v1]** Chỉ soạn nội dung để copy; **không tự gửi** email/Zalo/group. V1 ghi chưa có bảng `notifications`.

- `NTF-AC-01`: Người có quyền tạo nội dung thông báo từ alert/maintenance, xem trước và copy.
- `NTF-AC-02`: Không có request tự động gửi đến hệ thống bên ngoài khi người dùng chỉ soạn/copy.
- `NTF-AC-03`: Thông tin khách hàng nhạy cảm không xuất hiện với người không có quyền.
- `NTF-AC-04`: Nếu lưu template/kênh, schema và quyền truy cập phải được duyệt trước khi migration.
- **Test:** copy content, malformed address, role restriction, no outbound network call.
- **[OPEN]:** cần lưu notification history hay chỉ template; không tự thêm DB table nếu chưa có yêu cầu.

## 6. Test strategy và dữ liệu kiểm thử

### 6.1 Các lớp test

| Loại | Mục đích | Evidence tối thiểu |
|---|---|---|
| Unit | Business rule, validation, state transition | CI test report |
| Integration | DB constraints, RLS, API, storage | Test run + schema version |
| E2E | User journey, negative/empty/error states | Browser run/video/screenshots |
| Security | Auth bypass, IDOR, privilege escalation, file access | Security checklist + kết quả |
| UAT | Nghiệp vụ theo role và workflow | Biên bản sign-off |
| Recovery | Backup/restore, upload retry, rollback | Restore/rollback evidence |

### 6.2 Dataset tối thiểu [PROPOSED]

- 2 departments; mỗi department ≥2 teams; ≥4 role types; người dùng được/không được gán project; một tài khoản inactive.
- ≥2 customers; mỗi customer ≥2 sites; ≥3 projects có trạng thái khác nhau; một project nhiều site.
- Devices có serial trùng ở các phạm vi khác nhau để kiểm tra unique rule; thiết bị đã di chuyển; thiết bị sắp/hết bảo hành.
- Alerts có duplicate, maintenance window, SLA boundary, escalation và reopened; works có quá hạn và không assignee.
- Reports có draft/submitted/approved/rejected, file hợp lệ/không hợp lệ và các boundary sizes.
- Dữ liệu test giả lập, không sử dụng thông tin khách hàng thật trong môi trường không được phép.

### 6.3 Test case record template

| Field | Yêu cầu |
|---|---|
| Test ID | `AUTH-TC-001` |
| Linked AC | `AUTH-AC-02` |
| Preconditions | Role, project assignment, schema revision |
| Steps | Các bước tái lập rõ ràng |
| Expected | HTTP/DB/UI result theo contract đã phê duyệt |
| Actual | Kết quả quan sát |
| Status | Not Run / Pass / Fail / Blocked |
| Evidence | URL CI/report/screenshot/log |
| Defect | Ticket ID, severity, owner |
| Tester / timestamp | Cá nhân và thời gian |

## 7. Delivery plan, dependencies, estimation

### 7.1 Roadmap baseline từ v1 — chưa được xác nhận lại

| Phase | Phạm vi theo v1 | Duration tham chiếu | Trạng thái |
|---|---|---|---|
| Bản 1 | Auth/RBAC, Customers, Projects, Devices, Admin, Site Report cơ bản | 10 tuần | **Estimate inherited / unvalidated** |
| Bản 2 | Alerts, Maintenance, Works, Notifications | 4 tuần | **Estimate inherited / unvalidated** |
| Bản 3 | Dashboard, Site Report PDF | 2 tuần | **Estimate inherited / unvalidated** |

**Mâu thuẫn cần xử lý:** Dashboard được nhắc là tính năng cốt lõi trong tài liệu sản phẩm nhưng bảng ownership xếp Bản 3; Site Report xuất hiện Bản 1 và Bản 3. Không tự đổi lịch khi chưa được phê duyệt.

### 7.2 Estimation template

| Module | Complexity | Dev person-days | QA person-days | Design person-days | Dependency | Confidence |
|---|---|---|---|---|---|---|
| Mỗi module | S/M/L/XL | TBD | TBD | TBD | Ticket/ADR | Low/Med/High |

**Budget = TBD**, chỉ tính sau khi xác nhận headcount, availability, đơn giá, hạ tầng, license và contingency. Không dùng tổng tuần làm bằng chứng đã đủ nguồn lực.

## 8. Decision log / unresolved issues (bắt buộc chốt trước khi ký AC)

| ID | Vấn đề | Tác động | Owner quyết định đề xuất | Trạng thái |
|---|---|---|---|---|
| DEC-01 | Ai là System Owner và các DRI cá nhân? | Governance | Sponsor | OPEN |
| DEC-02 | Quyền Manager đối với `/admin` và export/import role | Security | System Owner | OPEN |
| DEC-03 | Quy tắc Project–Site nhiều-nhiều | Data integrity | Business + Tech DRI | OPEN |
| DEC-04 | Serial unique toàn tổ chức, theo site hay project? | Asset lifecycle | Operations + Tech DRI | OPEN |
| DEC-05 | Tách Alert và Incident; work FK nào? | Workflow, SLA | Operations + Tech DRI | OPEN |
| DEC-06 | SLA start/stop, maintenance window, escalation | Contract compliance | Operations Manager | OPEN |
| DEC-07 | Site Report workflow, required photo, PDF phase | Delivery UAT | Project Manager | OPEN |
| DEC-08 | Auth/session/RLS contract thực tế và Supabase Auth schema | Security | Tech Lead | OPEN |
| DEC-09 | Notification chỉ copy hay lưu lịch sử/template? | Scope/DB | Operations Manager | OPEN |
| DEC-10 | Dashboard bản nào; KPI formula và scope | Roadmap | Product Owner | OPEN |
| DEC-11 | Audit trigger + helper có ghi trùng? | Compliance | Tech Lead | OPEN |
| DEC-12 | Bản 1/2/3 duration, capacity và budget | Planning | Product Owner + Delivery Lead | OPEN |

## 9. Risk register

| ID | Risk | Impact | Likelihood | Mitigation | Owner đề xuất |
|---|---|---|---|---|---|
| R-01 | RBAC UI-only hoặc RLS bypass | Critical | TBD | Server/DB negative tests, service-role review | Tech Lead |
| R-02 | Test seed chỉ một project không phát hiện scope leak | High | High | Cross-department dataset | QA Lead |
| R-03 | Alert bị xóa khi bảo trì | High | TBD | Suppress with audit, không purge | Operations Lead |
| R-04 | Audit log trùng hoặc thiếu actor | High | TBD | One canonical audit mechanism + integration test | Tech Lead |
| R-05 | Report upload mất ảnh/dữ liệu | High | TBD | Atomic metadata flow, retry, orphan cleanup | Engineering Lead |
| R-06 | Scope creep và roadmap không nhất quán | High | High | Change control, one approved roadmap | Product Owner |
| R-07 | Nhầm role nghiệp vụ với role delivery | Medium | High | DRI matrix và RACI | Product Owner |

*Likelihood/Impact chưa có bằng chứng phải để TBD; các mức nêu trên là đánh giá rủi ro sơ bộ, không phải sự cố đã xảy ra.*

## 10. Release gates & Definition of Done [PROPOSED]

Một module **chỉ được đánh dấu Accepted** khi:

1. Requirement và AC đã được Business DRI phê duyệt; không còn blocker P0.
2. Implementation được review; migration có rollback/forward-fix plan nếu có thay đổi schema.
3. Unit/integration/E2E tests áp dụng đã chạy, có evidence; negative RBAC tests pass.
4. Không có defect Critical/High chưa được chấp nhận rủi ro bằng văn bản; các ngoại lệ được ghi decision log.
5. QA xác nhận test result, Business DRI ký UAT; Release Owner chấp thuận production.
6. Monitoring, backup/restore và runbook được kiểm tra theo mức độ thay đổi.

### Release sign-off record

| Field | Value |
|---|---|
| Release version / commit | TBD |
| Included requirement IDs | TBD |
| CI / test evidence | TBD |
| Security / RLS verification | TBD |
| UAT signer / date | TBD |
| Known defects / accepted risks | TBD |
| Rollback plan / owner | TBD |
| Go / No-Go / date | TBD |

## 11. Checklist §9 — trạng thái trung thực

| # | Nhóm nội dung | Có trong tài liệu? | Đủ điều kiện Approved/Accepted? |
|---|---|---|---|
| 1 | Module ownership | Có role đề xuất | **Chưa** — thiếu cá nhân DRI |
| 2 | Requirements | Có baseline | **Chưa** — cần chốt open decisions |
| 3 | Acceptance criteria | Có AC đề xuất | **Chưa** — cần business sign-off |
| 4 | Test plan & test data | Có strategy/cases | **Chưa** — chưa có test run evidence |
| 5 | Dev/QA/PM/Design owners | Có phân vai | **Chưa** — thiếu bổ nhiệm cá nhân |
| 6 | Scope/team/timeline/budget | Có baseline, TBD | **Chưa** — thiếu effort/capacity/budget |
| 7 | Risk/dependency/constraint | Có register | **Chưa** — thiếu xác nhận owner/mitigation |

**Kết luận:** 7/7 nhóm nội dung **đã được mô tả**, **0/7 được xác nhận hoàn tất ở mức phê duyệt và bằng chứng** trong phạm vi tài liệu này. Đây không phải kết luận hệ thống chưa triển khai; cần đối chiếu repo, CI và biên bản UAT để cập nhật trạng thái.

## 12. Hành động tiếp theo

1. **P0:** Bổ nhiệm DRI cá nhân; chốt DEC-02, 05, 06, 08 về quyền, Alert/Incident, SLA và Auth.
2. **P0:** Tạo dataset cross-role/cross-project; chạy kiểm thử server/API/RLS và lưu evidence.
3. **P1:** Chốt data model Project–Site–Device; đồng bộ `product.md`, `api_spec.md`, `rbac_matrix.md`.
4. **P1:** Duyệt workflow Site Report và tiêu chí PDF; xác nhận roadmap/effort.
5. **P1:** Thiết lập requirement-to-test traceability và UAT sign-off cho từng module.

---

**Change log**

| Version | Date | Summary |
|---|---|---|
| 1.0 | 2026-11-17 | Source ownership/test plan |
| 2.0 | 2026-11-17 | Tách role và DRI, bổ sung AC testable, test data cross-scope, decision/risk registers, release gates; bỏ giả định 7/7 đã đạt |
