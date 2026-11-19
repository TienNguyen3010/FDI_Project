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

## 1. UI / UX
| # | Nội dung | Trạng thái |
|---|---|---|
| 1 | Dashboard KPI: dự án, sự cố mở, SLA, bảo trì | ⏳ |
| 2 | Sự cố theo mức Critical/Major/Minor | ⏳ |
| 3 | Ẩn mục admin với role không đúng | ⏳ |
| 4 | Menu theo vai trò sau đăng nhập | ⏳ |
| 5 | Không dead button | ⏳ |
| 6 | 7 nhóm chức năng đúng navigation.json | ⏳ |
| 7 | Dense layout, không chồng chéo | ⏳ |
| 8 | Responsive tablet/laptop/desktop/mobile | ⏳ |
| 9 | Form có label/placeholder/help text | ⏳ |
| 10 | Tiếng Việt đầy đủ, không sót key | ⏳ |
| 11 | Mobile-first, phát hiện điện thoại | ⏳ |
| 12 | Màu/icon/font đúng design token | ⏳ |
| 13 | Error hiển thị rõ, không tràn | ⏳ |
| 14 | Silent fail có thông báo | ⏳ |
| 15 | Toast đúng nội dung/thời gian | ⏳ |
| 16 | Xác nhận với nút xóa/khóa/đăng xuất | ⏳ |

## 2. Figma / Design
| # | Nội dung | Trạng thái |
|---|---|---|
| 1 | User flow theo vai trò | ⏳ |
| 2 | Wireframe các màn chính | ⏳ |
| 3 | Flow Login→Dashboard→chi tiết→xử lý→báo cáo | ⏳ |
| 4 | Style guide màu/font/spacing/icon | ⏳ |
| 5 | Component system | ⏳ |
| 6 | Form tạo dự án/thiết bị/sự cố/công việc/báo cáo | ⏳ |
| 7 | Header/Sidebar/Main/Footer rõ ràng | ⏳ |
| 8 | Upload/preview/thumbnail/full view | ⏳ |
| 9 | Bảng tài liệu/ảnh onsite | ⏳ |
| 10 | Mobile bottom nav/sticky bar | ⏳ |
| 11 | Prototype click-through | ⏳ |
| 12 | Chuyển thiết kế sang code | ⏳ |

## 3. Database
| # | Nội dung | Trạng thái |
|---|---|---|
| 1 | PostgreSQL/Supabase cấu hình xong | ⏳ |
| 2 | Bảng cần thiết đã tạo | ⏳ |
| 3 | Tên bảng/cột chuẩn | ⏳ |
| 4 | FK đúng, không thừa/thiếu | ⏳ |
| 5 | Status/level dùng ENUM/danhmục | ⏳ |
| 6 | Cascade/action rõ ràng | ⏳ |
| 7 | Backup tự động + restore test | ⏳ |
| 8 | Logic map đúng mô hình dữ liệu | ⏳ |
| 9 | Thiết bị liên kết nhiều sự cố/bảo trì | ⏳ |
| 10 | Schema ổn định trước release 1.0 | ⏳ |
| 11 | Index cột hay query | ⏳ |
| 12 | Not-null/unique/phanloại | ⏳ |
| 13 | timestamp/UUID chuẩn | ⏳ |

## 4. RBAC
| # | Nội dung | Trạng thái |
|---|---|---|
| 1-6 | Role/target/quyền/API auth/RLS/scope | ⏳ |
| 7-12 | Scope team/project, ẩn menu, audit log, export config, test đủ role | ⏳ |
| 13-16 | Test negative/không nhiễu khi đổi role/least privilege | ⏳ |

## 5. Vận hành
| # | Nội dung | Trạng thái |
|---|---|---|
| 1-5 | Dashboard alert, task, incident→task, mức cảnh báo, gộp trùng | ⏳ |
| 6-10 | Escalation, maintenance window, timeline/RCA, lịch bảo trì, site report PDF | ⏳ |
| 11-15 | Soạn thông báo (không tự gửi), offline-first, mobile, backup, SLA/MTTR | ⏳ |

## 6. Công nghệ
| # | Nội dung | Trạng thái |
|---|---|---|
| 1-4 | Next.js/API/Supabase/Storage | ⏳ |
| 5-8 | Auth JWT/refresh, CI/CD, monitoring, mobile nếu cần | ⏳ |
| 9-14 | Unit/integration/e2e, lint/format, staging/prod, HTTPS/XSS/CSRF/rate limit, backup | ⏳ |

## 7. Design & Component
| # | Nội dung | Trạng thái |
|---|---|---|
| 1-6 | Design system, components, layout, hover/focus/active/disabled, responsive, offline indicator | ⏳ |
| 7-12 | Loading/error/empty state, validation, navigation, visibility | ⏳ |

## 8. Dọn dẹp sau mỗi phase
| # | Nội dung | Trạng thái |
|---|---|---|
| 1-4 | Code review, unit/integration/e2e, perf, security | ⏳ |
| 5-8 | WCAG AA, docs, migration/seed/backup, staging/prod | ⏳ |
| 9-12 | Release note/hotfix, monitoring, post-release, commit/tag | ⏳ |

## 9. Nguyên tắc phát triển (PRD)
| # | Nội dung | Trạng thái |
|---|---|---|
| 1-7 | Owner, requirement, acceptance criteria, test plan, plan scope/timeline, risk/dependency | ⏳ |

## 10. Lưu trữ & bàn giao
| # | Nội dung | Trạng thái |
|---|---|---|
| 1-6 | Push code, migrate DB, document API, upload file, chạy test, debug user | ⏳ |
| 7-12 | Close issue, tag release, lưu log, fix bug, deliver feature, update docs | ⏳ |

## 11. Security
| # | Nội dung | Trạng thái |
|---|---|---|
| 1-6 | Password 1 lần, không lưu secret, khách hàng bảo mật, HTTPS, 2FA/SSO, audit định kỳ | ⏳ |

---

# Nhật ký đồng bộ (bắt buộc cập nhật cùng commit code/docs)

> Format mỗi dòng: `YYYY-MM-DD | commit <sha> | <phạm vi> | ✅ verify: <tool output ngắn>`.
> Khi guard bật (`CHECKLIST_BASE` được set), commit đổi `app/|components/|lib/|migrations/|docs/` mà KHÔNG chạm file này → CI fail.

| Ngày | Commit | Phạm vi | Verify |
|---|---|---|---|
| 2026-11-18 | `47da331` | Shell refresh session sau đổi role | test 27/27 · deploy EXIT=0 |
| 2026-11-18 | `f3a9ef1` | Mobile drawer overflow + nút "Cuộn xem thêm" | tsc 0 · docs OK · test 27/27 · build 0 · E2E 390×844 scrollTop 1→143 |
| 2026-11-18 | `3ccd604` | Sidebar inactive contrast (`text-muted-foreground`) | contrast 1.04→7.01:1 · test 27/27 · deploy READY |
| 2026-11-19 | `b0a7521` | Dọn legacy/re-export/tsconfig/docs guard | tsc 0 · docs OK · test 24/24 · build 0 · deploy READY |
| 2026-11-19 | `HEAD` (commit này) | Checklist canonical + rule đồng bộ + CI guard | tsc 0 · test 24/24 · docs OK 53 files · guard A PASS(base=b0a7521) + FAIL(negative test) |
