# PROJECT OPS — Admin RBAC UI/UX Design (Figma v1) — Canonical Spec
> **Trạng thái:** canonical-v1 · 2026-11-25
---
## 1. Scope và 4 module Admin

| Module | Route | Permission chính | Mô tả |
|---|---|---|---|
| ADM-01 Users | `/admin/users` | `admin.user_manage` | Người dùng, hồ sơ, role assignment, phiên, lịch sử |
| ADM-02 Roles | `/admin/roles` | `admin.role_manage` | Vai trò, permission matrix, scope, draft/publish |
| ADM-03 Templates | `/admin/permission-templates` | `admin.role_manage` | Bộ quyền mẫu, cây quyền, lịch sử phiên bản |
| ADM-04 Audit | `/admin/permission-audit` | `admin.audit_read` | Nhật ký quyền, before/after, export async |

---

## 2. Sidebar — complete hierarchy (Quản trị)

```text
PROJECT OPS / Management Platform
TỔNG QUAN
  Dashboard
KHÁCH HÀNG & DỰ ÁN
  Customers
  Projects
  Sites
  Infrastructure
  Assets
VẬN HÀNH & DỊCH VỤ
  Works
  Service Desk [count]
  Maintenance
  Monitoring
TÀI LIỆU & BÁO CÁO
  Documents
  Reports
QUẢN TRỊ [gear, expandable]
  • Người dùng             /admin/users
  • Vai trò truy cập       /admin/roles
  • Bộ Quyền Mẫu           /admin/permission-templates
  • Nhật ký quyền          /admin/permission-audit
[sticky] avatar / name / role / profile menu
```

- Parent `Quản trị`: pale green background khi open; icon bánh răng green. Child active: green-tinted background, bullet green.
- Hiển thị menu chỉ khi có **effective grant** + **scope**. Bỏ parent trống khi không có child access.
- Route permission: `admin.users.read`, `admin.roles.read`, `admin.templates.read`, `admin.audit.read`.

---

## 3. Visual tokens (bắt buộc dùng, không tự sinh hex)

| Token | Value | Use |
|---|---|---|
| `brand.700` | `#087C32` | primary CTA, active icon |
| `brand.100` | `#DFF5E2` | active child menu |
| `brand.50` | `#F1FBF2` | soft KPI surfaces |
| `ink.900` | `#10233F` | page titles |
| `ink.600` | `#49617C` | secondary labels |
| `border` | `#DDE7F1` | table and cards |
| `canvas` | `#F7FAFD` | workspace |
| `surface` | `#FFFFFF` | cards, sidebar |
| `danger` | `#E13F4B` | destructive actions |
| `warning` | `#F28B19` | suspended, privileged action |
| `info` | `#1666DB` | informational state |

Font Inter/system sans; 8px spacing; radius 12px; inputs 40–44px; rows 48–56px; icons 18–20px; focus 2px; base text 14px; headings 26–30px.

---

## 4. Shared UI states and components

States: `loading`, `ready`, `empty`, `filtered_empty`, `error`, `forbidden`, `stale`, `saving`, `conflict_409`, `validation_422`, `rate_limited_429`.

Components: `AppShell`, `AdminNavGroup`, `AdminNavChild`, `AdminTopbar`, `KpiCard`, `FilterBar`, `DataTable`, `StatusBadge`, `ActionMenu`, `DrawerShell`, `DrawerTabs`, `PermissionMatrix`, `ScopeSelector`, `GrantDiff`, `AuditTimeline`, `ConfirmDialog`, `ApprovalDialog`, `Toast`, `FieldError`, `AccessDenied`, `EmptyState`, `LoadingSkeleton`, `Pagination`.

Accessibility: WCAG 2.2 AA, keyboard focus, dialog trap, aria-expanded, aria-current=page, 44px targets, 200% zoom, Vietnamese strings, no secrets in client logs.

---

## 5. Role set mới (so với FDI_Project hiện tại)

| Role | admin.user_manage | admin.role_manage | admin.audit_read | admin.templates.read | admin.templates.create | admin.templates.update | admin.templates.publish | admin.roles.create | admin.roles.publich |
|---|---|---|---|---|---|---|---|---|---|
| SYS_ADMIN | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DIRECTOR | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — |
| PM | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — |
| ENGINEER | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| SUPPORT | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| ASSET_MANAGER | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| CUSTOMER_VIEWER | ✓ | ✓ | ✓ | — | — | — | — | — | — |

> Giá trị `✓` = có permission trong `admin.*` row của `rbac_matrix.csv` / `rbac_policy.json`.

---

## 6. UAT matrix (capture từ TRACEABILITY.csv + UAT_AND_SECURITY.md)

| ID | Scenario | Expected |
|---|---|---|
| ADM-001 | SYS_ADMIN authorized lists users | 200, scoped only |
| ADM-002 | ENGINEER `/admin/users` | 403 |
| ADM-003 | AUDITOR reads audit | 200, redacted |
| ADM-004 | AUDITOR attempts change role | 403 |
| ADM-005 | duplicate email ignore-case | 409 |
| ADM-006 | assign role outside allowlist | 403 + audit |
| ADM-007 | self-escalation to SYS_ADMIN | 403 or approval |
| ADM-008 | suspend last SYS_ADMIN | 409 |
| ADM-009 | stale If-Match role edit | 409 |
| ADM-010 | publish template edit directly | 409 |
| ADM-011 | publish template => existing roles unchanged |
| ADM-012 | revoke role mid-session | next protected call denied |
| ADM-013 | guessed UUID outside scope | 403 or 404 |
| ADM-014 | audit export without permission | 403 |
| ADM-015 | audit log mutation | 403 / DB |
| ADM-016 | cross-customer export | no leak |
| ADM-017 | malformed grant scope | 422 |
| ADM-018 | sensitive change without step-up | 403/challenge |
| ADM-019 | collapsed sidebar keyboard | accessible |
| ADM-020 | mobile 390 | full-screen, no x-overflow |
| ADM-021 | grant/revoke race | atomic + audit |
| ADM-022 | audit before/after = secrets | redacted |

---

## 7. Data invariants

- Users, roles, grants, templates, audit are immutable-id, versioned, timestamped.
- Published templates immutable; new revision requires new `revision`.
- Permission/audit events append in same transaction or outbox.
- No plaintext credentials; encrypted/masked sensitive fields.
- Scope references validated server-side; never trust client.
- Concurrency: If-Match/version; stale rejected, not silently overwrite.
- Audit append-only, retention/legal hold; export audited.
- Default deny unknown permission, invalid scope, missing membership.

# Nhật ký đồng bộ

| Ngày | Commit | Mô tả | Tool verify |
|---|---|---|---|
| 2026-11-25 | `60a911a` | benchmark customer + UI design + migrate | docs-check/tsc/test/build ✅ |
