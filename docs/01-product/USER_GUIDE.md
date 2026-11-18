# FDI Project Management — User Guide v2.0 (Controlled Draft)

> Audience: Employee, Leader, Manager, Director. Single-organization internal website. **This guide is a proposed operating guide, not proof that every screen exists in the current build.** Version-specific screenshots and verified URLs must be added before publication.

## 1. Before using
Obtain an account and the official internal URL from your administrator. Do not enter passwords, private keys, device management credentials, banking information or confidential NDA content into free-text fields. Report access issues to the system owner. Never share an account.

## 2. Sign-in and sign-out (verify on candidate build)
Open the official URL; authenticate using the method configured by IT. Confirm your name/role; use Sign out when finished. If sign-in fails, check account status and contact support. **Do not assume a specific cookie name, token lifetime or password recovery flow** without testing the deployed version.

> **Cập nhật 2026-11-18 (đã verify runtime):** `/login` là **màn hình đăng nhập riêng**, không hiển thị sidebar/menu nội bộ (tách route group `(auth)` / `(workspace)`). Form xác thực email + mật khẩu, lưu cookie `sb-access-token` HttpOnly qua `POST /api/auth/session` (1 giờ), chuyển `/dashboard` hoặc `callbackUrl`. Nút "Quay về Dashboard" (gây vòng lặp) đã bỏ; "Quên mật khẩu?" không có route reset nên thay bằng hướng dẫn **liên hệ admin để đặt lại**. Tài khoản thử do Dev Director tạo: `admin@fdi.local` (role `director`); mật khẩu giao riêng qua kênh bảo mật, **đổi ngay sau lần login đầu**. Xem `00-governance/REVIEW_LOGIN_AUDIT_2026-11-18.md`.

## 3. Navigation
Expected sections: Dashboard, Customers, Projects, Devices, Alerts/Incidents, Maintenance, Works, Site Reports and Admin. Menus and available actions vary by role AND assigned data scope. Hidden buttons are not the security boundary; server and database enforce access.

## 4. Role-based tasks (proposed; verify each workflow)
| Role | Typical work | Approval or data boundary |
|---|---|---|
| Employee | View assigned projects/tasks; update assigned devices; submit site reports | Assigned records only |
| Leader | Assign team work, review site reports, track team delivery | Team/project scope |
| Manager | Review department projects and maintenance, manage approved team administration | Department scope; no automatic right to elevate roles |
| Director | View organization KPIs, approve designated project milestones, review risk | Organization read scope; write permissions remain action-specific |

## 5. Core workflows
### Project delivery
1. Open an authorized project and verify customer/site.
2. Review milestones, tasks and required checklist.
3. Update progress and attach supporting evidence if the UI supports it.
4. Submit for review; reviewer approves/rejects based on approved business rules.

### Site Report
1. Open authorized project → Reports → Create (if available).
2. Enter report type, date, site, findings and photos.
3. Save draft, submit and await review if supported by the current release.
4. After approval, use Export PDF only if enabled and verified.

### Alert and incident handling
1. Open an alert within your scope.
2. Acknowledge and link/assign work as allowed.
3. Record remediation and resolution evidence.
4. Close only with appropriate permission. Whether Alert and Incident are separate entities remains a product decision.

> DD decision 2026-11-17: Incident là **trạng thái xử lý của Alert**, không phải entity riêng trong v1; hệ thống giữ MỘT bảng `alerts`, tách entity `incidents` deferred. (xem DD_DECISIONS_P0.md)

### Maintenance
Review assigned schedule and checklist; record execution evidence; submit for supervisor approval. Never delete monitoring history merely because a maintenance window exists.

## 6. Role administration — sensitive operation
**Import/export of role assignments must not be treated as ordinary file editing.** Only authorized administrators may use it. Required controls before enablement: scoped export, schema validation, dry-run preview, per-row authorization, rejection of self-escalation and Manager→Director elevation, audit trail, and recovery/rollback policy. If these controls are not verified, disable import and use an approved administrative process.

## 7. Troubleshooting
| Symptom | Safe action |
|---|---|
| No access to a project | Ask project owner to verify assignment; do not bypass scope |
| Login fails | Contact system admin; do not share password |
| File upload fails | Verify allowed type/size against the current UI; retry once; contact support |
| Permission denied | Request access through owner; do not change JSON or API payloads |
| KPI seems wrong | Record filter, time range, role and screenshot; submit a defect |
| Unexpected error | Record timestamp, page, steps and request ID if displayed; never send secrets |

## 8. Screenshot inventory
Login; Dashboard for each role; project list/detail; device list/detail; alert handling; maintenance; site report create/review/PDF; admin user/role changes; mobile navigation. **All screenshots pending actual release build.**

## 9. Publication gate
Product Owner and QA must verify all instructions on the release candidate SHA; mark unsupported workflows as Planned or remove them. Link to release notes and support contact before distributing to users.
