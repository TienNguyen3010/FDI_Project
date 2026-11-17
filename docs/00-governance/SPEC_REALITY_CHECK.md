# SPEC_REALITY_CHECK v2.0 — Evidence and discrepancy register

> Assessment date: 2026-11-17. Current repository commit: **UNKNOWN**. Runtime environment: **UNKNOWN**. This report reconciles two supplied historical documents; it is NOT a new source-code audit.

## 1. Critical methodology
The uploaded `SPEC_REALITY_CHECK.md` reports an early scaffold, while `RELEASE_NOTES.md` claims later implementations. Both are dated 2026-11-17; neither establishes a common commit SHA. **Do not treat either as authoritative for current implementation.** Code references below are claims from the historical report and have not been independently rechecked.

## 2. Contradiction matrix
| ID | Area | Historical reality check | Later release notes claim | Current verdict | Verification required |
|---|---|---|---|---|---|
| C-01 | Customer/Project/Device | Empty app directories | CRUD routes complete | Conflict / unverified | git SHA, route listing, authenticated CRUD E2E |
| C-02 | Admin/RBAC | Director-only menu; no scope | Role import/export; scoped dashboard, RLS | Conflict / unverified | privilege escalation tests, RLS inspection |
| C-03 | Alerts/Maintenance/Works | Not implemented | Alerts and maintenance complete; works through CRUD | Conflict / unverified | workflow test, persistence and history |
| C-04 | Dashboard | Hardcoded cards and dead buttons | Real queries and 4-role scope | Conflict / unverified | seeded cross-role E2E and KPI reconciliation |
| C-05 | PDF/Reports | Reports route empty, no PDF | pdf-lib export complete | Conflict / unverified | sample PDF, Unicode and access tests |
| C-06 | Auth/API | Three duplicate GET session routes; no /api/v1 | /api/v1 stated as decision | Unverified | enumerate route handlers and OpenAPI |
| C-07 | RLS/audit | DB unavailable; migrations empty at audit | 13 tables/47 policies, audit verified | Conflict / unverified | migration history, pg_policies, audit insert/read tests |
| C-08 | Rate limiting | Absent | Upstash Lua E2E passed | Conflict / unverified | test log, env behavior, bypass tests |
| C-09 | CI/build | Historical build succeeded | 17/17 tests, CI, lint/build pass | Unverified at current SHA | CI run URL, commit SHA, command output |
| C-10 | UX/upload | User guide asserts 1–20 photos | Wireframe says upload UI not yet real | Conflict / unverified | actual UI, storage and file validation test |

## 3. Security findings requiring priority validation
1. Confirm auth/session handling uses supported Supabase SSR patterns; HttpOnly/Secure/SameSite/CSRF settings and session refresh must be tested, not inferred from a cookie name.
2. Confirm no service-role secret reaches client; no privileged endpoint trusts user-supplied role/team.
3. Verify each data-access path (Server Action, route handler, direct Supabase client) enforces role and project/team/department scope.
4. Role import/export: prevent Manager from granting Director or editing outside authorized team; use preview, dry-run, audit and atomic or explicitly partial results.
5. Release notes identify compromised secret-sharing risk. Rotate relevant credentials and verify scope of exposure before production.
6. Backup and restore drill is missing in the supplied release checklist.

## 4. Evidence record template
| Field | Required value |
|---|---|
| Requirement ID | e.g. RBAC-001 |
| Expected behavior | Exact business rule and scope |
| Source | Approved PRD/permission matrix version |
| Commit SHA | Full or unambiguous revision |
| Environment | Local/staging/prod and timestamp |
| Test | command, scenario, result |
| Evidence | CI link, screenshot, log, SQL output (secrets redacted) |
| Reviewer | Named person |
| Status | Implemented / Verified / Failed / Unverified |

## 5. Mandatory verification order
A. Identify current repo SHA and deployment SHA; B. run lint/typecheck/build/tests; C. inspect routes and schema/migrations; D. test RBAC/RLS negative cases; E. test full business workflows; F. validate metrics against DB; G. test backup/restore and production security; H. obtain QA/UAT sign-off.

## 6. Decision log
- D-01: Confirm canonical API prefix (`/api/v1` is documented but not verified).
- D-02: Approve Manager admin scope and Director operational permissions.
- D-03: Decide Alert vs Incident lifecycle and link to Work.
- D-04: Approve upload limits and storage lifecycle.
- D-05: Confirm actual release candidate and production readiness.

**Rule:** no percentage complete or green release label without a defined denominator and linked evidence.
