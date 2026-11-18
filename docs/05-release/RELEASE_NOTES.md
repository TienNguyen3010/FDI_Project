# FDI Project Management — Release Candidate & Release Governance v2.0

> Document revision 2.0 (2026-11-17; evidence cập nhật 2026-11-18). Proposed version: `1.0.0-rc.1` **unverified**. Production release: **NOT CONFIRMED**. Audit baseline SHA: `29dc349` (2026-11-17); `/api/v1` alias: `167a674`; current HEAD: `5b32909` (W0 auth refactor). Deploy evidence: **NOT PROVIDED** (không có UAT sign-off, không deploy).

## 1. Release status
**NO-GO pending evidence.** Audit baseline SHA `29dc349` / alias `167a674` / current HEAD `5b32909` are identified, but there is **no CI run, staging verification or UAT sign-off, and no deploy**. Do not promote `v1.0.0` or advertise completed features until verified.

**Progress note:** W0 server-auth refactor + /api/v1 alias merged; 22/22 tests at 167a674 (recorded at checklist §12); P2 alerts extraction in-flight. This is recorded evidence, not a fresh run this session.

## 2. Candidate scope and proof needed
| Module | Claim in original notes | Current document status | Evidence required |
|---|---|---|---|
| Auth/RBAC | Implemented, RLS and audit | Unverified | auth E2E, RLS negative tests, migration logs |
| Customers, Projects, Devices | Implemented | Unverified | CRUD + scope E2E |
| Admin/role import | Implemented | Unverified / high risk | escalation tests, dry-run, audit |
| Site Reports and PDF | Implemented | Unverified | upload/download/export tests |
| Alerts, Maintenance, Works | Implemented/partial | Unverified | workflow tests and DB records |
| Dashboard | Scoped live KPI | Unverified | role-scope reconciliation |
| Rate limit/CI | Tests reported passing | Unverified at release SHA | test output, CI run link |
| Notifications | Not implemented | Out of release scope | none unless added to candidate |

## 3. Hard release gates
- [ ] Named Release Owner and Product Owner sign-off
- [ ] Candidate commit SHA + immutable artifact recorded
- [ ] Secrets rotated after reported insecure sharing; environment access reviewed
- [ ] No critical/high unresolved auth/RBAC/RLS issues
- [ ] Unit, integration and E2E tests green on candidate SHA
- [ ] Migration tested on staging snapshot; backup AND restore verified
- [ ] Staging smoke test: login, cross-scope access, CRUD, report, upload, PDF
- [ ] Production environment variables, monitoring, alerts, logs configured
- [ ] Accessibility and basic performance assessed against agreed thresholds
- [ ] User guide/screenshots reflect verified release behavior
- [ ] Rollback and incident owner confirmed

## 4. Release approval record
| Field | Value |
|---|---|
| Version | `1.0.0-rc.1` (candidate, unverified) |
| Git SHA / CI run | HEAD `5b32909` (audit baseline `29dc349`; alias `167a674`); CI run: **none** |
| Staging URL | TBD (chưa deploy) |
| Database migration version | TBD |
| QA evidence | 22/22 recorded @ `167a674` (`checklist.md §12`); ⏳ chưa re-run live |
| Product Owner UAT | TBD (chưa có sign-off) |
| Security review | TBD |
| Release Owner decision | **NO-GO pending verification** |
| Production deployment time | Not established |

## 5. Hotfix and rollback
1. Triage severity and customer impact; declare incident owner.
2. Branch from deployed production tag/commit, not an arbitrary main branch.
3. Reproduce, add regression test, implement smallest safe fix.
4. Run typecheck/lint/tests/build and security regression; obtain review.
5. Deploy staging, smoke test, approve production, monitor and document.
6. Roll back application artifact when safe. **Do not automatically roll back a destructive database migration**; use tested forward-fix/restore procedures with explicit data-loss review.
7. Post-incident review and corrective actions.

## 6. Release note template (publish only after GO)
Version; release date; commit; deployment environment; verified features; known limitations; migrations; user-visible changes; security changes (without secrets); rollback plan; support contact; sign-offs.

## 7. Historical context
Original `RELEASE_NOTES.md` listed 13 DB tables, 47 RLS policies, 17 passing tests, Upstash limit, PDF and role import/export as complete. These are **historical claims** that require verification against the actual release candidate. Its own pre-release list marks review, performance, security, accessibility, backup, production configuration and monitoring incomplete.
