# FDI Project Management — RBAC & Data Scope Matrix v2.0 (Proposed)

**Status:** REVIEW REQUIRED · **Single-Organization, internal use only** · **No SaaS / Multi-Tenant** · **Date:** 2026-11-17

> This document revises `rbac_matrix.md` v1 in coordination with `api_spec.md` v1. It defines a **proposed authorization contract**; no assertion is made that RLS policies or API guards currently implement it. Validate against actual code, DB policies and business owners.

## 1. Core security principles

1. **Deny by default**; a role label alone does not grant unrestricted access.
2. Every operation requires **permission AND resource scope AND any workflow conditions**.
3. Client UI hiding is usability, **never** a security boundary.
4. Server-side checks and database RLS must protect direct API calls and database reads/writes.
5. No `tenant_id`, tenant provisioning, tenant billing or multi-tenant policy.
6. Director has broad **read** scope and approval authority, but not automatic device edit, delete or privileged admin access.
7. Privilege elevation, exports, confidential contract values and audit logs require explicit permission.
8. Supabase service-role credentials must never be exposed to browser; privileged backend operations require independent authorization checks.

## 2. Separate roles from scopes

### Business roles
- **Employee:** assigned projects, assigned tasks and permitted reports.
- **Leader:** assigned team and its projects; team workflow approvals.
- **Manager:** assigned department and its projects; departmental management and selected approvals.
- **Director:** company-wide visibility and designated final approvals.

### Record scope
- `assigned`: explicit project membership or assigned work, subject to record type.
- `team`: projects mapped to user's team(s).
- `department`: projects mapped to user's department(s).
- `company`: company-wide read scope where granted.
- `own`: records created by or assigned to user; not interchangeable with `assigned`.

**Important:** Scope cannot be inferred from a free-text `team` field. Define normalized `teams`, `departments`, `user_team_memberships`, `project_memberships`, and project-team/department relations **only as required by actual domain and approved migrations**. Avoid role claims that become stale; authorize using current trusted membership state.

## 3. Permission catalog

`dashboard:read`, `customer:read/create/update`, `customer_finance:read`, `site:read/create/update`, `project:read/create/update/deploy/accept/archive`, `device:read/create/update/delete`, `alert:read/create/update/ack/resolve/close`, `incident:read/create/update/assign/resolve/close`, `maintenance:read/create/update/approve/complete`, `work:read/create/update/assign`, `report:read/create/update/submit/approve/reject/export`, `document:read/create/update/download`, `audit:read`, `user:read/create/update`, `role:read/assign`, `config:read/update`, `notification:draft`.

Permissions are **proposed identifiers**; naming should be reconciled with actual policies before adoption.

## 4. Proposed role-permission matrix

Legend: `R` read, `C` create, `U` update, `A` approve/transition, `X` privileged administrative action, `—` denied. All grants require the scope and workflow checks in §5. Rows below summarize capabilities, not exhaustive API authorization rules.

| Resource | Employee | Leader | Manager | Director |
|---|---|---|---|---|
| Dashboard | R assigned/own | R team | R department | R company |
| Customers | R related | R related, U contacts (if delegated) | R/C/U department | R company; finance R company |
| Projects | R/U assigned fields | R/C/U team; A checklist | R/C/U department; A deploy | R company; A acceptance |
| Sites | R related | R/U team (delegated) | R/C/U department | R company |
| Devices | R/C assigned | R/U team; A review | R/U department; delete only by exception | R company (no implicit edit) |
| Alerts | R/C assigned | R/U/A team | R/U/A department | R company; escalation visibility |
| Incidents* | R/U assigned | R/U/A team | R/U/A department, RCA approval | R company |
| Maintenance | R/U assigned execution | R/C/U team scheduling | R/C/U/A department | R company |
| Works | R/U own | R/C/U/A team | R/C/U/A department | R company |
| Site Reports | R/C/U own draft; submit | R/U/A team | R/U/A department; export | R company |
| Documents | R related | R/C/U team | R/C/U department | R company |
| Admin users | — | — | limited department user management** | R company, privileged changes only if assigned |
| Audit logs | — | — | R department (redacted) | R company (redacted) |
| Global config | — | — | R and limited U if delegated | R; privileged U if assigned |
| Contract values | — | — | explicitly delegated only | R company |

`*` Incident module is proposed and needs data-model approval. `**` Department-scoped user management must not allow self-escalation, cross-department role grants or changing Director privileges.

**Decision needed:** The original matrix allowed Director full Admin control but read-only devices. This proposal retains read-only devices and separates `system_admin` **technical privilege** from Director **business role**. If the business insists Director has system admin rights, grant them explicitly and audit the assignment; never infer them from hierarchy.

## 5. Scope evaluation contract

`allow(user, action, resource)` only when all conditions hold:

1. Authenticated active user; valid session.
2. User has explicit permission for the requested action.
3. Resource belongs to permitted project/team/department/company scope, as applicable.
4. Sensitive field access separately authorized (`customer_finance:read`, privileged docs).
5. Current workflow state allows action; separation of duties respected when required.
6. No policy-deny overrides (suspended user, archived record, legal hold, revoked access).

Examples:
- Employee assigned Project A: may view A, cannot query Project B by guessing UUID.
- Leader Team X: cannot edit Team Y device, even if they can see its customer name through an allowed directory view.
- Manager Department X: cannot create a Director user or expand their own role.
- Director: may view all projects and approve acceptance, but cannot delete a device without explicit `device:delete` privilege.
- A user who authored a Site Report cannot approve it if two-person approval is required (proposed policy).

## 6. Data access and RLS enforcement

- For each protected table, define `SELECT`, `INSERT`, `UPDATE`, `DELETE` policy tests; a route guard alone is insufficient.
- Check foreign-key references and cross-record relations to avoid attaching Project A reports to Project B sites.
- Do not rely solely on `app_metadata.role` JWT if role/membership changes need immediate revocation; use trusted current state or explicit short-lived/revalidation strategy.
- Service-role or `SECURITY DEFINER` paths are high risk; minimize, constrain search_path, audit and test privilege boundaries.
- Store files in private buckets with authorization checks on metadata and short-lived download URLs.
- Mask confidential values in list, export, logs and search, not only in detail views.
- `audit_logs` must be append-only to normal application users; reading restricted and redacted.
- Never store plaintext credentials or device secrets. Management IPs may be sensitive operational data and require controlled handling rather than an absolute blanket ban without business review.

## 7. Endpoint permission mapping (representative)

| Endpoint/action | Required permission | Scope and guard |
|---|---|---|
| GET `/projects/{id}` | `project:read` | assigned/team/department/company |
| PATCH `/projects/{id}` | `project:update` | assigned permitted fields, team or department |
| POST `/projects/{id}/accept` | `project:accept` | authorized final approver, checklist complete |
| POST `/devices` | `device:create` | permitted site/project; validated relationship |
| PATCH `/devices/{id}` | `device:update` | team/department or delegated |
| POST `/alerts/{id}/acknowledge` | `alert:ack` | assigned/on-call/team |
| POST `/incidents/{id}/close` | `incident:close` | permitted incident, RCA/checklist guard |
| POST `/reports/{id}/approve` | `report:approve` | same team/department; not self-approve if policy requires |
| GET `/documents/{id}/file` | `document:download` | allowed record + classification |
| GET `/audit-logs` | `audit:read` | filtered scope, sensitive fields redacted |
| PATCH `/admin/users/{id}` | `user:update` | cannot self-escalate or exceed admin delegation |

All other routes must receive equivalent explicit mapping; deny access until mapped and tested.

## 8. Test matrix (minimum)

| ID | Scenario | Expected |
|---|---|---|
| RBAC-01 | Anonymous GET protected project | 401 or approved safe redirect |
| RBAC-02 | Employee A GET Project B | 403/404 with no leaked fields |
| RBAC-03 | Employee A PATCH Project B directly | Denied; unchanged DB |
| RBAC-04 | Leader Team A lists Team B records | Team B records absent |
| RBAC-05 | Manager Department A edits Department B site | Denied |
| RBAC-06 | Director edits device without explicit permission | Denied |
| RBAC-07 | Manager attempts own role elevation | Denied, audited |
| RBAC-08 | Role revoked mid-session | Next protected operation reflects revocation per approved strategy |
| RBAC-09 | Report author attempts self-approval | Denied if two-person approval enabled |
| RBAC-10 | Download URL for inaccessible document | No file access or leaked signed URL |
| RBAC-11 | Client manipulates role/team in JSON | Server ignores/rejects untrusted claims |
| RBAC-12 | Audit log update/delete by normal role | Denied |
| RBAC-13 | Service-role API path called by unauthorized user | Denied despite privileged DB credential |
| RBAC-14 | Cross-project FK assignment | Denied, DB unchanged |
| RBAC-15 | Confidential contract value via export/search | Redacted or denied |

**Fixture:** at least two departments, two teams per department, multiple projects/sites/customers, users in each role, one unassigned employee, one revoked user, and cross-project records. One project and four users are insufficient to verify scope.

## 9. Governance and change control

- Every permission change needs business owner approval, security/tech review, migration impact assessment and regression tests.
- Log role assignment changes with actor, target, old/new role, reason, timestamp; redact sensitive values.
- Keep separate business-role ownership and technical `system_admin` privilege.
- Review permissions quarterly and after organization/assignment changes (proposed cadence).
- Document emergency access with expiry and post-use review if needed.

## 10. Blockers before approval

1. Confirm source-of-truth tables for user/role/team/department/project assignment.
2. Inspect current RLS policies, privileged RPCs, route handlers and Supabase session flow.
3. Decide whether Director receives `system_admin` by explicit grant or only business approvals.
4. Define which customer records are globally discoverable versus project-related only.
5. Confirm device ownership and Project–Site cardinality.
6. Agree whether Incident is separate from Alert and whether report approvals require separation of duties.
7. Agree deletion/archive and audit retention policy.

**Status model:** Draft → Reviewed → Approved → Implemented → Security-tested → UAT-accepted. Do not mark as deployed or verified without test evidence.
