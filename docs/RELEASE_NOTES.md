# 📝 FDI_Project — Release Notes & Release Procedure

> 📁 **Vị trí tài liệu:** `docs/RELEASE_NOTES.md`  
> Phiên bản tài liệu 1.0 · Ngày lập 2026-11-17 · Ngôn ngữ: Tiếng Việt  
> Bám sát `checklist.md` §8 #9 (release: pre-release, release note, hotfix), §10 (lưu trữ & conference), `roadmap.md`.

---

## 1. Thông tin bản phát hành

| Trường | Giá trị |
|---|---|
| Phiên bản | **v1.0.0** |
| Ngày phát hành | Dự kiến 2026-11-17 (chưa tag — xem §6) |
| Tên bản | Bản 1 (MVP) + tính năng Bản 2/3 đã code |
| Môi trường | Internal (website nội bộ) |
| Base URL API | `/api/v1` (quyết định Dev Director 2026-11-17) |
| Trạng thái | Pre-release (xem §3 — còn hạng mục ⏳) |

---

## 2. Tính năng phát hành

### 2.1 Bản 1 — MVP (theo `roadmap.md` §2.1)

| Module | Trạng thái code | Ghi chú |
|---|---|---|
| Login & RBAC (4 role, scope, audit) | ✅ | JWT + cookie HttpOnly; RLS 47 policy; audit migration 004 |
| Customer (hồ sơ, site, liên hệ) | ✅ | `/customers` — CrudPage + useProfile |
| Project (milestone, progress, status) | ✅ | `/projects` |
| Device (serial, rack, bảo hành) | ✅ | `/devices` |
| Quản trị (gán role, cấu hình) | ✅ | `/admin` + `/admin/roles` (export/import §4 #11) |
| Site Report (cơ bản) | ✅ | `/reports` |

**Target Bản 1:** chạy thử với 1 dự án + 1 khách thật.

### 2.2 Bản 2/3 — tính năng đã code (theo `roadmap.md` §2.2–2.3)

| Module | Trạng thái code | Ghi chú |
|---|---|---|
| Alerts / Sự cố (severity, SLA, escalation) | ✅ | `/alerts`; enum `open` ghost đã sửa → `new/acknowledged/in_progress` |
| Maintenance (lịch, checklist, kết quả) | ✅ | `/maintenance` |
| Works (giao việc, ưu tiên, link alert) | ✅ | qua CrudPage; chưa route riêng |
| Notifications (soạn email/Zalo/group) | ⏳ | Mới ở dạng spec — **chưa có bảng DB** |
| Dashboard (KPI, lọc, drill-down) | ✅ | `/dashboard`; số liệu query thật, GMT+7, scope 4 role |
| Site Report PDF | ✅ | Dùng `pdf-lib` |

### 2.3 Hạ tầng & chất lượng

- ✅ Supabase Auth + RLS (13 bảng, 47 policy, 8 helper `SECURITY DEFINER`).
- ✅ Audit log (DB trigger + client helper; verify DB thật 0→3).
- ✅ Rate-limit Upstash Redis Lua atomic — verify E2E `100×401 + 5×429`, `Retry-After: 48`.
- ✅ Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS).
- ✅ `proxy.ts` (Next.js 16) — hết warning deprecated `middleware`.
- ✅ CI GitHub Actions; `npm test` 17/17 pass; lint 0 error; `tsc --noEmit` exit 0; build ✓.
- ✅ Export/import role config §4 #11: `GET/POST /api/admin/roles` + `/admin/roles`.
- ✅ Tài liệu §9: `docs/PRD_OWNERSHIP.md`; §10: `docs/RELEASE_NOTES.md`, `docs/USER_GUIDE.md`.

---

## 3. Pre-release checklist (§8 #9)

| # | Hạng mục | Trạng thái | Ghi chú / lệnh verify |
|---|---|---|---|
| 1 | Code review (peer/senior) | ⏳ | Chưa có bằng chứng review chính thức |
| 2 | Unit + integration + E2E test | ✅ | `npm test` → 17/17 pass |
| 3 | Performance test (load/stress) | ⏳ | Chưa có bằng chứng |
| 4 | Security test (penetration/static) | ⏳ | Một phần: headers + rate-limit verified; chưa pen-test |
| 5 | Accessibility (WCAG AA) | ⏳ | Chưa có bằng chứng |
| 6 | Document: README/API docs/user guide | ✅/⏳ | `docs/README.md`, `docs/api_spec.md`, `docs/USER_GUIDE.md` có; API export/import chưa trong `api_spec.md` |
| 7 | DB migration: schema/seed/backup | ✅/⏳ | 001–004 executed thật; **backup/restore chưa test** |
| 8 | Environment: staging/production config | ⏳ | Chưa set env production (xem `.env.example`) |
| 9 | **Pre-release + release note + hotfix** | ✅ | File này (release note + hotfix procedure §4) |
| 10 | Monitoring (alert/log/crash) | ⏳ | Chưa cấu hình Sentry |
| 11 | Post-release (bug/feedback/next iteration) | ⏳ | Chưa release nên chưa có |
| 12 | Final commit, merge main, tag version | ⏳ | Theo yêu cầu task: **KHÔNG commit/push** |

**Quyết định release:** chỉ tag v1.0.0 sau khi các mục ⏳ #1, #3, #4, #5, #7(backup), #8, #10 hoàn tất.

### Blockers thật cần xử lý trước release
- 🔴 **Xoay vòng secret**: Supabase → Rotate secret key & JWT key; Database → Reset password (đã gửi qua kênh không an toàn ngày 2026-11-17).
- 🔴 **Seed dùng `@fdi.local` / `example.invalid`** — không phải data khách thật. Phải thay trước demo khách.
- 🟡 Backup/restore chưa test (xem `docs/BACKUP_RESTORE.md`).
- 🟡 `UPSTASH_REDIS_REST_URL/TOKEN` phải set trong production, nếu thiếu → fallback soft-limit (per-instance).

---

## 4. Hotfix procedure (§8 #9)

Quy trình xử lý lỗi sau release (không tự đẩy — cần phê duyệt):

1. **Phát hiện & phân loại**
   - Nguồn: monitoring/Sentry, báo cáo người dùng, QA.
   - Phân mức: `P0` (production down / mất data / lộ bảo mật), `P1` (lỗi chức năng chính), `P2` (lỗi nhẹ).
2. **Tạo hotfix branch**
   - `git checkout -b hotfix/v1.0.1 <tag v1.0.0>` (từ tag đang chạy, KHÔNG từ main nếu main đã có commit mới).
3. **Reproduce & fix tối thiểu**
   - Viết failing test trước (`npm test`), sửa ít dòng nhất, KHÔNG refactor trong hotfix.
4. **Verify (bắt buộc)**
   - `npx tsc --noEmit` → exit 0
   - `npm run lint` → 0 error
   - `npm test` → pass
   - `npm run build` → exit 0
5. **Review & approve** — tối thiểu 1 senior (§8 #1).
6. **Deploy lên staging trước**, smoke test các flow bị ảnh hưởng.
7. **Deploy production** → tag `v1.0.1` → cập nhật mục §5 "Lịch sử phiên bản".
8. **Post-mortem** (§8 #11): ghi nguyên nhân, cách phòng tránh, thêm regression test.
9. **Rollback** nếu hotfix gây lỗi mới: redeploy tag trước đó `v1.0.0`; DB rollback theo `docs/BACKUP_RESTORE.md` (chỉ khi có migration phá dữ liệu).

> ⚠️ Với dự án này: KHÔNG commit/push khi chưa có phê duyệt. Mọi deploy production cần xác nhận Dev Director.

---

## 5. Lịch sử phiên bản & Semantic Versioning

### 5.1 Quy ước version (SemVer 2.0.0)

Định dạng `MAJOR.MINOR.PATCH`:

| Thay đổi | Tăng | Ví dụ |
|---|---|---|
| Không tương thích ngược (đổi schema/API contract) | **MAJOR** | `1.0.0 → 2.0.0` |
| Thêm tính năng, tương thích ngược | **MINOR** | `1.0.0 → 1.1.0` (Bản 2 thêm Notifications) |
| Sửa lỗi, tương thích ngược | **PATCH** | `1.0.0 → 1.0.1` (hotfix) |
| Pre-release | hậu tố | `1.1.0-rc.1`, `1.1.0-beta.1` |
| Build metadata | `+` | `1.0.0+20261117` |

### 5.2 Lịch sử

| Phiên bản | Ngày | Thay đổi chính |
|---|---|---|
| `0.1.0` | 2026-11-16 | Khung Next.js 16 + TS + Supabase, login + RBAC cơ bản |
| `1.0.0-rc.1` | 2026-11-17 | Bản 1 + Dashboard + audit + rate-limit + export/import role config (pre-release) |
| `1.0.0` | Dự kiến 2026-11-17 | Release chính thức sau khi pre-release checklist xong |
| `1.1.0` | TBD | Bản 2 đầy đủ: Notifications (cần migration bảng) |
| `2.0.0` | TBD | Bản 3 mở rộng / thay đổi contract (nếu có) |

### 5.3 Tag & git

- Tag theo `v` prefix: `v1.0.0`, `v1.0.1`.
- Tag chỉ tạo sau khi merge vào `main` và CI xanh.
- **Task hiện tại: KHÔNG commit/push** — chỉ tạo file, chờ parent agent quyết định.

---

## 6. Ghi chú trung thực

- Build/timestamp trong file này lấy từ bằng chứng `docs/checklist.md` §12 (Verification Log) — KHÔNG suy diễn.
- "Dự kiến 2026-11-17" là ngày lập tài liệu, không phải ngày deploy thật (chưa deploy).
- Các mục ⏳ ở §3 là hạng mục **chưa có bằng chứng**, không đánh dấu ✅.
- Budget/ngày phát hành chính thức để TBD thay vì bịa số.

---

*Người lập: [Tên] – [Vai trò] – 2026-11-17 – v1.0*  
*Nguồn: `checklist.md` §8 #9 / §10, `roadmap.md`, `SPEC_REALITY_CHECK.md`.*
