> **FILE CHECKLIST DUY NHẤT CỦA DỰ ÁN (canonical, v1.0).**
> Mọi danh sách kiểm tra của Project OPS nằm ở đây. File khác muốn checklist phải **link tới file này**, không copy.
> **Quy tắc (bắt buộc):** mỗi lần viết/sửa code hoặc tài liệu phải cập nhật mốc tương ứng trong "Nhật ký đồng bộ" ở cuối file, **trong cùng commit**. Guard CI (`node scripts/docs-check.mjs`) enforce rule này — xem `../README.md` §5.
> Nguồn gốc: `../06-reference/archive/checklist_legacy.md` (bản NOC/PMO 17/11) — đã hợp nhất vào đây.

### Dashboard alignment (approved baseline)
P0 dashboard checklist: approved reference parity; sidebar green and grouped; KPI semantics; ticket donut reconciliation; SLA risk/breach disjoint; project baseline; scope filtering; timestamp; click-through; loading/error/empty; 390px responsive; 200% zoom.

---

# Operational Checklists
## Site survey
- [ ] Customer/site identity and authorized contacts verified
- [ ] Floor plan, room/rack, power/UPS and environmental constraints documented
- [ ] WAN/LAN, IP plan, VLAN, DHCP, DNS, QoS, firewall and SIP dependencies recorded
- [ ] Device quantities, models, mounting and cable routes confirmed
- [ ] Site risks, access window and evidence/photos captured
- [ ] Survey approved by PM/customer representative as applicable
## Installation
- [ ] Approved design and change window available
- [ ] Asset ID/serial/model matched to shipment
- [ ] Rack/U/room/coordinates or floor anchor recorded
- [ ] Cabling, labels, power, grounding and network ports verified
- [ ] Configuration baseline stored securely; no passwords in notes
- [ ] Test results, photos and engineer sign-off submitted
## VoIP acceptance
- [ ] Registration of phones/gateways verified
- [ ] Inbound/outbound/local/international routing per scope tested
- [ ] Audio both ways, DTMF, transfer, hold and voicemail tested
- [ ] SIP trunk failover and network recovery tested where contracted
- [ ] Recording/retention/access policy tested where contracted
- [ ] As-built topology, IP plan, serial list and handover accepted
## Preventive maintenance
- [ ] Contract coverage and maintenance window verified
- [ ] Health checks, logs, backup state and storage reviewed
- [ ] Firmware/software updates assessed via change process
- [ ] Issues/tickets and recommendations recorded
- [ ] Evidence and customer acknowledgement captured
## Release readiness
- [ ] PRD acceptance tests pass
- [ ] Cross-customer RBAC negative tests pass
- [ ] Restore drill passes; rollback tested
- [ ] Monitoring, alerting and on-call documented
- [ ] API compatibility and migration verified
- [ ] UAT sign-off and support handover complete

## Baseline assumptions and boundaries
- One operating company, multiple customers and sites; **not SaaS multi-tenant**.
- Customer portal is optional and isolated by customer scope; no direct device administration from portal.
- On-premises or private-cloud deployment; English identifiers, Vietnamese UI labels supported.
- P0 includes project delivery, assets, site, tickets, basic maintenance, reports, email and RBAC; advanced topology editor, telemetry and bidirectional Zalo are later phases.
- All dates persisted UTC with timezone-aware presentation; all important mutations audited.
- Architecture decisions require stakeholder sign-off before production.

---

# Structured checklist model
Each template item: `item_id`, `revision`, `required`, `answer_type`, `validation`, `evidence_required`, `role_required`, `condition`, `help_text`. Each execution answer: actor/time/value/evidence/review decision; preserve historical template revision.

**Survey:** customer/site contact; floor plan revision; network uplink; power/UPS; rack capacity; cable routes; IP/VLAN plan; VoIP call path; photos; risks. **Installation:** asset code+serial; MAC; site/location/rack U; firmware; config backup reference (no secret); labeling; cable/port; photos; tester; timestamp. **VoIP SAT:** inbound/outbound/local/international where allowed; extension registration; SIP trunk failover; call recording and retrieval; emergency routing where applicable; QoS/jitter/packet loss; CDR; user signoff. **Maintenance:** service window approval; pre-check backup; hardware inspection; logs/alarms; call test; change record; rollback readiness; before/after evidence; customer signoff.

**Reject completion** when mandatory item unanswered, evidence missing, reviewer is same actor where separation-of-duties required, or linked site/asset not authorized.

---
## Visual baseline alignment (2026-11-18)
UI release checklist: verify sidebar section order, active route, collapsed mode, overflow, 44px targets, WCAG contrast, scoped search, no stale values disguised as live, chart accessibility, responsive and error states.

---

# Checklist triển khai (NOC/PMO — hợp nhất từ bản cũ)

> Ký hiệu trạng thái: ✅ done (có tool output) · ❌ fail · ⏳ chưa làm.
> Tick **ngay sau khi verify bằng tool** — không tick dự đoán.

> Ký hiệu: ✅ done (có evidence code/tool) · ⚠️ có một phần, cần live verify/thiếu chi tiết · ❌ fail/vi phạm · ⏳ chưa có code.
> Audit ngày 2026-11-19 tại HEAD `effad33` (production READY). Tick theo evidence, không tick dự đoán.

## 1. UI / UX
| # | Nội dung | Trạng thái | Evidence |
|---|---|---|---|
| 1 | Dashboard KPI | ⚠️ | `dashboard/page.tsx:136-141` có 4 KPI (Dự án/Tiến độ/Ticket mở/SLA); **thiếu KPI bảo trì**, số live cần login |
| 2 | Sự cố Critical/Major/Minor | ⚠️ | `ui.tsx:184-186` có 3 badge variant nhưng `dashboard/page.tsx:182` gán cứng `critical`; trang sự cố ComingSoon |
| 3 | Ẩn mục admin sai role | ✅ | `ClientBody.tsx:107,199-206` + `policy.ts:17` (`admin.user_manage`, deny-by-default) |
| 4 | Menu theo vai trò | ✅ | `ClientBody.tsx:158-169,193-206` JWT app_metadata → fallback bảng users |
| 5 | Không dead button | ⚠️ | `ComingSoon.tsx:5-7` thay bằng "bản sau"; CRUD wired `CrudPage.tsx:234-241`; vẫn cần scan runtime |
| 6 | Nhóm chức năng | ✅ | `ClientBody.tsx:70-110` ≡ `navigation.json:7-111` — **5 nhóm canonical** (checklist cũ ghi 7 là stale) |
| 7 | Dense layout | ⚠️ | `ClientBody.tsx:392-439`; cần screenshot QA |
| 8 | Responsive 4 breakpoint | ✅ | `ClientBody.tsx:395,437,443-499` drawer + bottom nav + overscroll + nút cuộn |
| 9 | Form label/placeholder/help | ✅ | `CrudPage.tsx:347-380`; `ui.tsx:68-100` |
| 10 | Tiếng Việt đầy đủ | ⚠️ | nav label vẫn tiếng Anh (`navigation.json:12-108`) |
| 11 | Mobile-first | ✅ | CSS breakpoint + drawer/bottom nav (`globals.css:149-152`) |
| 12 | Design token | ✅ | `globals.css:13-123` ≡ `tokens.json:4-49`, Lucide + Inter |
| 13 | Error rõ, không tràn | ✅ | `dashboard/page.tsx:134` `role=alert`, `ui.tsx:466-479` |
| 14 | Silent fail có thông báo | ✅ | `CrudPage.tsx:174-176,198-200` toast.error; `ToastProvider aria-live` |
| 15 | Toast nội dung/thời gian | ✅ | `ui.tsx:405-493` 4 kinds, default 4000ms |
| 16 | Xác nhận xóa/khóa/đăng xuất | ⚠️ | `CrudPage.tsx:193` có `window.confirm`; `ClientBody.tsx:249-251` **đăng xuất chưa có confirm** |

## 2. Figma / Design
| # | Nội dung | Trạng thái | Evidence |
|---|---|---|---|
| 1 | User flow theo role | ⏳ | chỉ spec `WORKFLOW_SPECIFICATION.md`; `FIGMA_HANDOFF.md:4` pending |
| 2 | Wireframe màn chính | ⏳ | ASCII `UI_UX_WIREFRAMES.md:8-41`, chưa Figma frame |
| 3 | Flow Login→...→báo cáo | ⚠️ | Login + Dashboard có code; chi tiết/xử lý/báo cáo = ComingSoon |
| 4 | Style guide | ✅ | `tokens.json:4-49` + `globals.css:13-123` |
| 5 | Component system | ✅ | `ui.tsx:30-495` (Button/Input/Card/Modal/Badge/Toast…) |
| 6 | Form tạo các entity | ⚠️ | CRUD cho customers/projects/devices/works; sự cố & báo cáo ⏳ |
| 7 | Header/Sidebar/Main/Footer | ⚠️ | `ClientBody.tsx:394-439` có 3/4, **không có footer** |
| 8 | Upload/preview | ⏳ | chỉ spec `FIGMA_DESIGN_SPEC.md:18` |
| 9 | Bảng tài liệu/ảnh onsite | ⏳ | `documents/page.tsx:4` ComingSoon P1 |
| 10 | Bottom nav/sticky | ✅ | `ClientBody.tsx:465-499` + safe-area |
| 11 | Prototype click-through | ⏳ | `FIGMA_HANDOFF.md:14,18` chưa pixel-perfect |
| 12 | Design → code | ✅ | tokens/navigation/baseline → `globals.css`, `ClientBody.tsx`, `dashboard/page.tsx:136-204` |

## 3. Database
| # | Nội dung | Trạng thái | Evidence |
|---|---|---|---|
| 1 | Supabase configured | ⚠️ | `DEPLOY_AND_MIGRATION.md:3,68` apply thật; thiếu credential re-verify |
| 2 | Bảng tạo | ✅ | `migrations/001_initial_schema.sql:20-356` (12 bảng) + `../../migrations/006_ops_core.sql` (+5) |
| 3 | Tên chuẩn | ✅ | `001:20-32` snake_case; `006:63-81` tiếp tục |
| 4 | FK đúng | ✅ | `001:58-60,74-105,191-199` + `006:65-66,103-108` |
| 5 | ENUM/danh mục | ✅ | CHECK `001:26,83,118,143`; lookup `sla_state` `006:187-206` |
| 6 | Cascade/action | ✅ | `001:60,78,89,105,193-199`; `006:65-66` |
| 7 | Backup + restore test | ⚠️ | chỉ quy trình `PLAYBOOK.md:27,46`; chưa drill |
| 8 | Logic ↔ data model | ✅ | `001:191-193`, view `006:155-173`, `lib/metrics/contract.ts:30-39` |
| 9 | Thiết bị ↔ nhiều sự cố | ⚠️ | schema ủng hộ `001:132,164`; chưa test data thật |
| 10 | Schema ổn định | ✅ | `006:3-7` idempotent; không ALTER migration đã apply |
| 11 | Index | ✅ | `001:316-346` (~30) + `005:59-62` + `006:83-86` |
| 12 | Not-null/unique | ✅ | `001:22,31,122-123`; `006:74-75,105-106` |
| 13 | timestamp/UUID | ✅ | `001:21,29` UUID + TIMESTAMPTZ; GMT+7 `contract.ts:18` |

## 4. RBAC
| # | Nội dung | Trạng thái | Evidence |
|---|---|---|---|
| 1 | Vai trò định nghĩa | ✅ | `policy.core.mjs:4-6` 6 role v1.0; 4 legacy ở CHECK `001:25-26` |
| 2 | Target/scope | ✅ | `policy.core.mjs:26-57` + `rbac_policy.json:53-152` |
| 3 | Quyền từng feature | ✅ | `lib/role-matrix.ts:2-12` (9 feature) |
| 4 | API auth/authz | ✅ | `authorize.ts:42-93` (401/500/403) + `api/v1/dashboard/summary/route.ts:6-8` |
| 5 | RLS lọc scope | ✅ | `002:265-277,282-545` (47 policy) + `006:330-421`; caveat live fix `DEPLOY:101-109` |
| 6 | Viewer/Editor/Owner 4 cấp | ⏳ | v1.0 dùng 6 role tên riêng, không có grant 4 cấp |
| 7 | Scope team/dept | ⏳ | `policy.core.mjs:79-89` chỉ customer/site/project; team mặc định deny |
| 8 | UI ẩn menu/khóa nút | ✅ | `proxy.ts:142-153` chặn `/admin`; `works/page.tsx:16` editableBy |
| 9 | Audit log | ✅ | `004_audit_trigger.sql:36-125`; `lib/audit.ts:44-46` redact secret |
| 10 | Mọi thiết lập RBAC | ✅ | `policy.core.mjs` deny-default + matrix đồng bộ (`smoke.test.mjs:26-29`) |
| 11 | Export/import role config | ⏳ | chỉ file tĩnh, chưa API/UI |
| 12 | Test đủ role | ✅ | `tests/rbac.test.mjs:7-37` (24/24 pass) |
| 13 | Test negative menu/action | ✅ | `rbac.test.mjs:10-12,28-36` + `smoke.test.mjs:38-43` |
| 14 | Test negative data | ✅ | `rbac.test.mjs:25-27` + `lib/metrics/queries.ts:9-12` fail-closed |
| 15 | Least privilege | ✅ | `policy.core.mjs:2,65-68,76-88` |
| 16 | Không nhiễu khi đổi role | ✅ | `useProfile.ts:51-58` refreshSession → getUser |

## 5. Vận hành
| # | Nội dung | Trạng thái | Evidence |
|---|---|---|---|
| 1 | Dashboard xem trước fix | ✅ | `dashboard/page.tsx:103-207` (cần login để xem live) |
| 2 | Task giao/nhận/hạn/ưu tiên/link | ✅ | `works/page.tsx:19-68` |
| 3 | Incident → task 1-click | ⏳ | chỉ có field `incident_id`, chưa action tạo |
| 4 | Mức cảnh báo/thời gian | ⚠️ | `005_works_sla.sql:27-32` ngưỡng **ILLUSTRATIVE**, chưa PO sign-off |
| 5 | Gộp cảnh báo trùng | ⏳ | không có code |
| 6 | Escalation tự động | ⏳ | grep escalat = 0 |
| 7 | Maintenance window loại trừ sự cố | ⏳ | chưa có logic |
| 8 | Timeline/RCA/status lifecycle | ⏳ | `tickets/page.tsx` ComingSoon; chưa field `root_cause` |
| 9 | Lịch bảo trì/checklist | ⏳ | schema có `001:162-181`; `maintenance/page.tsx` ComingSoon |
| 10 | Site report + PDF | ⏳ | `reports/page.tsx` ComingSoon P2; chỉ còn font test |
| 11 | Soạn thông báo KHÔNG tự gửi | ✅ | `notifications/page.tsx:20-21,112-170,186-189` localStorage + copy |
| 12 | Offline-first field/photo/queue | ⏳ | không service worker/IndexedDB/queue |
| 13 | Mobile-friendly | ✅ | `dashboard/page.tsx:136,143,173` + bottom nav |
| 14 | Backup/restore test | ⚠️ | chỉ docs, chưa drill |
| 15 | SLA/MTTR/% vi phạm | ⚠️ | view `005:17-48` nhưng ngưỡng illustrative; dashboard trả `insufficient_baseline` |

## 6. Công nghệ
| # | Nội dung | Trạng thái | Evidence |
|---|---|---|---|
| 1 | Next.js | ✅ | `package.json:27-28` next 16.4.6 |
| 2 | API server | ✅ | `app/api/v1/dashboard/**` + `openapi.yaml` |
| 3 | Supabase/PostgreSQL | ✅ | migrations 001-007; `DEPLOY:66-73` apply 006 |
| 4 | Storage upload | ⏳ | chưa code upload/bucket |
| 5 | Auth JWT/refresh | ✅ | `proxy.ts:35-83` verify GoTrue + cache |
| 6 | CI/CD | ⚠️ | `.github/workflows/docs-check.yml:30-50` + guard local PASS; **không verify được trạng thái chạy GitHub từ sandbox** |
| 7 | Monitoring | ⏳ | chỉ requirement `TECH_SPEC.md:20` |
| 8 | Mobile native | ⏳ | không React Native/Flutter, chỉ responsive web |
| 9 | Unit/integration/e2e | ⚠️ | unit 24/24 ✅; **`INTEGRATION_STATUS.md:10,30` không có PG integration/E2E** |
| 10 | Lint/format | ⚠️ | có eslint; chưa prettier/husky |
| 11 | Staging/prod | ⚠️ | prod ✅ deploy READY; staging ⏳ |
| 12 | HTTPS/XSS/CSRF/rate limit | ⚠️ | HTTPS+HSTS `next.config.ts:21-24`; rate limit ✅; **CSP chưa emit**, XSS sanitize/CSRF chưa evidence |
| 13 | Rate limit/user/giờ | ⚠️ | `proxy.ts:12-15,105-121` = **100 req/60s per IP**, chưa per-user |
| 14 | Backup drill | ⏳ | chỉ docs |

## 7. Design & Component
| # | Nội dung | Trạng thái | Evidence |
|---|---|---|---|
| 1-6 | Design system/component/layout/interactive/responsive/offline | ⚠️ | 5/6 đạt (`globals.css:13-152`, `ui.tsx:30-262`, `ClientBody.tsx`); **offline indicator ⏳** |
| 7-12 | Loading/error/empty/validation/navigation/visibility | ✅ | `ui.tsx:314-368`, `CrudPage.tsx:145-148,245-249`, `dashboard/page.tsx:134`, `ClientBody.tsx:199-206` |

## 8. Dọn dẹp sau phase
| # | Nội dung | Trạng thái | Evidence |
|---|---|---|---|
| 1 | Code review | ⏳ | không có PR review evidence trong sandbox |
| 2 | Unit/int/e2e | ⚠️ | unit ✅; int/e2e ⏳ |
| 3 | Perf test | ⏳ | không load/stress output |
| 4 | Security test | ⏳ | chỉ requirement |
| 5 | WCAG AA | ⚠️ | contrast 1.04→7.01 (`3ccd604`); full audit chưa có |
| 6 | Docs | ✅ | 53 files v1.0, guard OK |
| 7 | Migration/seed/backup | ⚠️ | 006/007 apply thật; backup ⏳ |
| 8 | Staging/prod | ⚠️ | prod ✅, staging ⏳ |
| 9 | Release note/hotfix | ⚠️ | sync log có, file release note ⏳ |
| 10 | Monitoring | ⏳ | nhóm 6/7 |
| 11 | Post-release | ⚠️ | bug fix có record, formalize ⏳ |
| 12 | Commit/tag | ⚠️ | commit ✅ `effad33` synced; **tag ❌ `git tag -l` rỗng** |

## 9. PRD
| # | Nội dung | Trạng thái | Evidence |
|---|---|---|---|
| 1 | Owner module | ⚠️ | personas chung, owner per-module chưa rõ |
| 2 | Requirement rõ | ✅ | `PRD.md:4` REQ-UI-014…021, `PRD.md:58-69` |
| 3 | Acceptance criteria | ✅ | `PRD.md:13-23` testable acceptance |
| 4 | Test plan | ⚠️ | có uat_scenarios, chưa plan/test-data per feature |
| 5 | Owner dev/QA/PM/design | ⚠️ | chưa gán cụ thể |
| 6 | Scope/team/timeline/budget | ⚠️ | P0/P1/P2 + plan; timeline/budget ⏳ |
| 7 | Risk/dependency | ✅ | `PRD.md:37-39,83`, `RELEASE_GATE.md:18-26` |

## 10. Lưu trữ & bàn giao
| # | Nội dung | Trạng thái | Evidence |
|---|---|---|---|
| 1 | Push code | ✅ | `effad33` = origin/main, tree sạch |
| 2 | Migrate DB | ✅ | `DEPLOY:64-73,95` 006+007 đăng ký schema_migrations |
| 3 | Document API | ✅ | openapi.yaml + executable JSON |
| 4 | Upload file | ⏳ | chưa implementation |
| 5 | Chạy test | ✅ | `npm test` 24/24 thực chạy |
| 6 | Debug user | ⚠️ | có record `DEPLOY:89-160`, "tất cả user" chưa verify |
| 7 | Close issue | ⏳ | không GitHub issues evidence |
| 8 | Tag release | ❌ | `git tag -l` rỗng |
| 9 | Lưu log | ⚠️ | deploy log có; Sentry/browser log ⏳ |
| 10 | Fix bug | ✅ | `47da331, 3ccd604, b0a7521, effad33`… |
| 11 | Deliver feature | ✅ | production `fdi-project.vercel.app` READY |
| 12 | Update docs | ✅ | sync log + guard enforce cùng commit |

## 11. Security
| # | Nội dung | Trạng thái | Evidence |
|---|---|---|---|
| 1 | Password 1 lần | ⚠️ | `DEPLOY:14` rotate 17/11; đã dùng lại trong phiên |
| 2 | Không lưu secret | ❌ | `DEPLOY:75,87,136`: Vercel token + DB password **đã lộ trong chat**, chưa có xác nhận revoke. Repo sạch (`smoke.test.mjs:53-74` pass) nhưng vi phạm ở mức session |
| 3 | Khách hàng bảo mật | ⚠️ | RBAC deny-default; chưa evidence quản lý credential khách hàng |
| 4 | HTTPS | ✅ | Vercel + HSTS `next.config.ts:21-24` |
| 5 | 2FA/SSO | ⏳ | chỉ requirement `TECH_SPEC.md:20,39` |
| 6 | Audit định kỳ | ⚠️ | 1 đợt audit sâu (`57f334c`) + 6 audit tests; chưa lịch định kỳ |

## Baseline assumptions
✅ Nhất quán `PRD.md:42-50`, `TECH_SPEC.md:39`, `DATA_DICTIONARY.md:29`. ⚠️ **Mâu thuẫn governance**: `RELEASE_GATE.md:9` vẫn "NOT APPROVED FOR PRODUCTION" nhưng đã deploy prod thật → item "stakeholder sign-off" chưa đóng.

## Nhật ký đồng bộ (bắt buộc cập nhật cùng commit code/docs)

> Format: `YYYY-MM-DD | commit | phạm vi | ✅ verify: tool output ngắn`.
> Guard CI (`CHECKLIST_BASE`) chặn commit đổi `app/|components|lib/|migrations/|docs/` mà không chạm file này.

| Ngày | Commit | Phạm vi | Verify |
|---|---|---|---|
| 2026-11-18 | `47da331` | Shell refresh session sau đổi role | test 27/27 · deploy EXIT=0 |
| 2026-11-18 | `f3a9ef1` | Mobile drawer overflow + nút "Cuộn xem thêm" | tsc 0 · docs OK · test 27/27 · build 0 · E2E 390×844 scrollTop 1→143 |
| 2026-11-18 | `3ccd604` | Sidebar inactive contrast | contrast 1.04→7.01:1 · test 27/27 · deploy READY |
| 2026-11-19 | `b0a7521` | Dọn legacy/re-export/tsconfig/docs guard | tsc 0 · docs OK · test 24/24 · build 0 · deploy READY |
| 2026-11-19 | HEAD trước | Checklist canonical + rule + CI guard | tsc 0 · test 24/24 · docs OK 53 files · guard A PASS+FAIL |
| 2026-11-19 | `HEAD` (commit này) | Audit checklist theo code + production ready | 3 subagent audit read-only · 24/24 test · docs-check OK · deploy prod READY |
| 2026-11-19 | docs-bước-1 | Create Customer: standard + plan (review-first) | 3-layer recon spec→mockup→code@355de30 · docs-check sẽ verify sau khi commit |
| 2026-11-19 | bước-2 | Create Customer Phase 1 build | tsc 0 · docs-check OK 55 files · test 24/24 · build 0 (`/customers/new` ◐) |