# EVIDENCE REGISTER — Đối chiếu tài liệu v2 với code/DB thực tế

> Artifact bổ sung, **KHÔNG** thay thế hay viết lại 11 file v2. Mục đích: anchor các nhãn `UNKNOWN` / `Unverified` trong các file v2 vào một **commit SHA thật** và bằng chứng thật có thể lặp lại.
> Mọi output dưới đây đều lấy từ lệnh chạy thật hoặc `file:line` trong repo tại SHA này. Không ghi credential (đã xoay vòng theo `checklist.md:279`).

## Header

| Trường | Giá trị |
|---|---|
| Commit SHA (đầy đủ) | `29dc349236320d296b734bed458320b7d812edeb` |
| Commit SHA (ngắn) | `29dc349` |
| Commit message | `docs: mark CI/CD as pending until workflow file is enabled on GitHub` |
| Commit time | `2026-11-17T13:14:08Z` |
| Ngày đối chiếu | `2026-11-17T13:45:34Z` (UTC) |
| Trạng thái 11 file v2 | **Uncommitted working-tree modifications** (`git status --short` → ` M` trên cả 11 file); phiên bản v1 của chúng đã được track tại HEAD |
| Môi trường local | Linux 6.1.0-amd64, Node + npm, RAM ~1.4 Gi; `next@16.4.6`, `react@19.3.0`, `typescript@^5`, `eslint@^9` |
| Môi trường DB | Supabase/PostgreSQL **17.12**, pooler `aws-0-ap-northeast-1` (Tokyo) — theo `docs/checklist.md:261`; phiên này **không có credential DB trong shell** nên không re-query DB thật |
| Git remote | **Không có** (`git remote -v` → rỗng) |
| Phạm vi | Đối chiếu `RELEASE_NOTES.md`, `SPEC_REALITY_CHECK.md`, `tech_spec.md`, `product.md`, `rbac_matrix.md`, `project_structure.md`, `README.md` (+ 4 file v2 còn lại) với `app/`, `lib/`, `migrations/`, `package.json`, `tests/`, `docs/checklist.md` mục "Nhật ký xác minh" |

### Phân loại nhãn
- **VERIFIED** — có output thật từ lệnh chạy trong phiên này tại SHA `29dc349`.
- **IMPLEMENTED_UNVERIFIED** — có code/source rõ ràng nhưng chưa test E2E/live trong phiên này (bằng chứng là nhật ký xác minh ở commit trước cùng dòng phát triển).
- **GAP** — chưa có trong repo.
- **CONFLICT** — v2 (hoặc context) nói khác với thực tế code/output hiện tại.

---

## Bảng bằng chứng

| # | Tuyên bố v2 | Trạng thái thực tế | Bằng chứng (lệnh/output thật hoặc file:line) | Ghi chú |
|---|---|---|---|---|
| E-01 | `RELEASE_NOTES.md:3,6,43` — "NO-GO pending evidence", "Commit SHA / CI run: TBD", "Production release NOT CONFIRMED" | **VERIFIED** (đã có SHA, vẫn NO-GO) | `git rev-parse HEAD` → `29dc349236320d296b734bed458320b7d812edeb`; `git remote -v` → rỗng; `.github/workflows/` → không tồn tại | SHA đã xác định được (v2 ghi UNKNOWN/TBD). Quyết định NO-GO vẫn đúng: không có CI run, không có staging/UAT. |
| E-02 | `SPEC_REALITY_CHECK.md:3` — "Current repository commit: **UNKNOWN**; Runtime environment: **UNKNOWN**" | **VERIFIED** (đã bổ sung được) | `git log -1 --format='%H %ad'` → `29dc349… 2026-11-17T13:14:08Z`; local env xem Header | Artifact này chính là lớp anchor cho nhãn UNKNOWN đó. |
| E-03 | Context/claim: `npm test` **21/21 pass** | **VERIFIED (sau fix)** — lúc audit 20/21, parent đã sửa self-match → **21/21** | `npm test` → `# tests 21 / # pass 20 / # fail 1`; `not ok 21 - git KHÔNG track .env…` tại `tests/smoke.test.mjs:55`; chạy riêng `node --test tests/pdf.test.mjs` → 4/4 pass | Lỗi là **self-match**: regex phát hiện secret trong `tests/smoke.test.mjs` chính nó. **Parent đã fix** bằng cách skip file test khỏi self-scan; `npm test` sau fix → `# tests 21 / # pass 21 / # fail 0`. `RELEASE_NOTES.md:59` ghi "17 passing tests" là historical claim — cả 17 và 21 đều đã lỗi thời; con số thật hôm nay là 20/21. |
| E-04 | Claim: `npm run lint` 0 error; `npx tsc --noEmit` exit 0 | **VERIFIED** | `npm run lint` → `LINT_EXIT=0` (không có output error); `npx tsc --noEmit` → `TSC_EXIT=0` | Chạy lại trực tiếp trong phiên này, exit code thật. |
| E-05 | Claim: build dùng `NEXT_PRIVATE_BUILD_WORKER=1 npx next build --webpack` (RAM 1.4 Gi) | **IMPLEMENTED_UNVERIFIED** | `package.json:7` `"build": "next build"` (Turbopack); `checklist.md:271,285` ghi Turbopack OOM → dùng `--webpack`; **không re-run build trong phiên này** (nặng, dễ OOM trên 1.4 Gi) | Lệnh build thay thế được ghi trong nhật ký xác minh tại cùng dòng commit. Không tự bịa output build mới. |
| E-06 | `RELEASE_NOTES.md:11` — Auth/RBAC, RLS, audit "Unverified"; `checklist.md:261-262` — migration executed, RLS verify | **IMPLEMENTED_UNVERIFIED** (source verified; live DB không re-query) | Source: `migrations/001-004` tồn tại; `grep -hi 'CREATE POLICY' migrations/*.sql \| wc -l` → **47**; 12 bảng nghiệp vụ + `schema_migrations` = 13 (`grep CREATE TABLE … | sort -u`). Live DB evidence: `checklist.md:261` (001→13 bảng/48 index, 002→13 RLS/47 policy/8 helper, 003 seed; PG 17.12) và `:262` (employee/leader thấy 0 dòng; manager/director thấy all; RPC `fdi_current_role` trả `"director"`) | Shell hiện tại chỉ có `SUPABASE_TELEMETRY_DISABLED`, **không có DB credential** → không re-chạy query. Các con số 13 bảng/47 policy khớp giữa source SQL và nhật ký. |
| E-07 | `checklist.md:264` — audit-log 0→1→2→3, UPDATE diff JSONB | **IMPLEMENTED_UNVERIFIED** | `migrations/004_audit_trigger.sql:22` ALTER ADD `changes JSONB`; `:36` hàm `fdi_audit_write_log()`; `:143-144` `CREATE TRIGGER trg_%I_audit` cho 11 bảng; `:152` ghi `004_audit_trigger` vào `schema_migrations`; `:158` kỳ vọng 11 trigger | Trigger/function có trong source. Kết quả insert/read thật 0→3 chỉ có trong `checklist.md:264`, không re-test live DB phiên này. |
| E-08 | `RELEASE_NOTES.md:14` — "Site Reports and PDF … Unverified"; `SPEC_REALITY_CHECK.md:15` (C-05) PDF conflict | **VERIFIED** (cài đặt & test cấu trúc) / **IMPLEMENTED_UNVERIFIED** (render live) | `lib/pdf.ts:14,15` import `pdf-lib` + `@pdf-lib/fontkit`; `:218` `PDFDocument.create()`, `:220` `registerFontkit`, `:223-224` `embedFont(..., subset:true)`; `assets/fonts/Inter-{Regular,Bold}.ttf` tồn tại; `node --test tests/pdf.test.mjs` → **4/4 pass** (font magic bytes `00010000`, routes PDF trả `application/pdf`); `app/api/reports/[id]/pdf/route.ts`, `app/api/reports/summary/pdf/route.ts` tồn tại | Render thật `%PDF-` 349 KB + dấu tiếng Việt đúng (`checklist.md:271`) là evidence phiên trước; phiên này chỉ re-verify code + structural test. |
| E-09 | `RELEASE_NOTES.md:17` — Rate limit/CI "Unverified"; `SPEC_REALITY_CHECK.md:18` (C-08) | **VERIFIED** (code Lua) / **IMPLEMENTED_UNVERIFIED** (E2E 100×401+5×429) | `lib/rate-limit-redis.ts:3` comment Lua sliding-window; `:28-38` `ZREMRANGEBYSCORE`/`ZCARD`/`ZADD`/`PEXPIRE`; `:56` `client.eval(LUA_SLIDING_WINDOW,…)`; `@upstash/redis@^1.41.0` trong `package.json:22`; test logic `tests/rate-limit.test.mjs` pass (6 case, limit 100/60s, chặn req 101) | E2E với Redis thật (`checklist.md:265`: 100×401 + 5×429, `Retry-After: 48`) không re-chạy (cần app chạy + Upstash env). Cấu trúc Lua atomic được xác nhận trực tiếp. |
| E-10 | `SPEC_REALITY_CHECK.md:20` (C-10) — upload UI "not yet real"; `tech_spec.md:22,112` private object storage | **GAP** | `grep -rli 'storage.from\|upload(' app lib` → **(none)**; không có bucket/storage helper trong `lib/` | Khớp hướng v2: upload ảnh/site report là proposed. Không có storage upload thật. |
| E-11 | `tech_spec.md:3-5,116` / `rbac_matrix` — base path `/api/v1`, OpenAPI 3.1 source of truth | **CONFLICT** | `grep -rl 'api/v1' app lib` → **(none)**; route handlers thực tế: `app/api/auth/route.ts`, `/auth/me/route.ts`, `/auth/session/route.ts`, `/admin/roles/route.ts`, `/reports/[id]/pdf/route.ts`, `/reports/summary/pdf/route.ts` — **không có prefix `/api/v1`**; cũng không có file OpenAPI trong repo | `checklist.md:258,280` ghi "đã chốt base URL `/api/v1`" nhưng **không được áp vào code**. Đây là decision-on-paper, chưa hiện thực. `SPEC_REALITY_CHECK.md:16,47` (C-06, D-01) vẫn đúng khi ghi "documented but not verified". |
| E-12 | `SPEC_REALITY_CHECK.md:16` (C-06) — "three duplicate GET session routes" | **VERIFIED** | `find app/api/auth -type f` → `route.ts`, `me/route.ts`, `session/route.ts` (3 route auth/session) | Phát hiện historical v1 vẫn còn nguyên trong code. |
| E-13 | `product.md:90-95` / `rbac_matrix.md:53` — module Incidents riêng biệt | **GAP** | `grep -rli 'incidents' migrations app lib` → chỉ `app/dashboard/page.tsx` (đề cập/KPI) và `lib/role-matrix.ts:7` (dòng mô tả quyền); **không có bảng `incidents`** trong `CREATE TABLE` list; **không có thư mục `app/incidents/`** | Khớp `RELEASE_NOTES`/D-03: Alert/Incident lifecycle chưa tách module. SLA được tính/view từ bảng alerts (xem E-14). |
| E-14 | `checklist.md:129,271` — SLA/MTTR/% vi phạm | **IMPLEMENTED_UNVERIFIED** (migration 005 chưa execute) | `migrations/005_works_sla.sql:18` `CREATE VIEW v_alert_sla WITH (security_invoker=true)`, `:32` ngưỡng critical 4h/major 8h/minor 24h, `:38` `mttr_hours`, `:47` `sla_breached`, `:53` GRANT SELECT authenticated; `:3` comment "KHÔNG tự động execute — chỉ là source SQL"; `schema_migrations` theo `checklist.md` chỉ có 001-004 | Bản 2 có source SLA nhưng **chưa apply lên DB thật**. Không nên ghi SLA là "live". |
| E-15 | `RELEASE_NOTES.md:15` — Works "Implemented/partial"; `README.md` inventory | **VERIFIED** (tồn tại route) | `app/works/page.tsx` tồn tại; `find app -type f -name page.tsx` liệt kê: dashboard, login, customers, projects, devices, alerts, maintenance, reports, works, notifications, admin, admin/roles, alerts/[id], reports/[id], reports/summary | Có app/works, app/notifications, app/alerts/[id], app/reports/[id], app/reports/summary, app/admin/roles — đúng context. |
| E-16 | `product.md:119` / `checklist.md:125` — thông báo "soạn nội dung, copy, KHÔNG tự gửi" | **VERIFIED** | `app/notifications/page.tsx:20-21` comment "soạn … copy, KHÔNG tự gửi; lưu localStorage, không gọi API gửi thật"; `:133-140` hàm `copy()` + toast; `:146` chỉ mở `mailto:`/`zalo.me`; `grep -rliE 'sendMail|resend|sendNotification'` → chỉ trùng tên file notification page, không có integration gửi thật | Khớp v2: copy-ready, không auto-send. |
| E-17 | `project_structure.md:13-14` — `useProfile.ts` "soft RBAC", service-role unspecified | **VERIFIED** (soft RBAC + không có service-role) | `lib/hooks/useProfile.ts` tồn tại; `grep -rni 'service_role\|SERVICE_ROLE' app lib` → `app/api/admin/roles/route.ts:9` comment "Không có SUPABASE_SERVICE_ROLE_KEY … audit ghi bằng client anon" | Rủi ro P0 của v2 vẫn còn: UI RBAC là soft; không có service-role key. |
| E-18 | `SPEC_REALITY_CHECK.md:23` / `tech_spec.md:112` — session HttpOnly/Secure/SameSite, security headers | **VERIFIED** (source/config) | `app/api/auth/session/route.ts:39-41` `httpOnly:true, sameSite:'lax', secure: NODE_ENV==='production'`; `lib/cookies.ts:16-17`; `proxy.ts:133-142` guard `/admin` chỉ manager+director; `next.config.ts` headers `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` | HTTP curl test thật (`checklist.md:260`) là evidence phiên trước; phiên này verify config/source. `proxy.ts` thay cho `middleware.ts` (đã migrate, `checklist.md:259`). |
| E-19 | `RELEASE_NOTES.md:26` — "Migration tested on staging snapshot; backup AND restore verified" | **GAP** | `find . -iname '*e2e*' -o -iname 'playwright*' -o -iname 'cypress*'` (ngoài node_modules) → **(none)**; không có thư mục staging; `docs/checklist.md:76,128,150,286` vẫn đánh ⏳ backup/restore; `docs/BACKUP_RESTORE.md` là tài liệu, không phải drill result | Không có E2E test, không có staging deploy, chưa backup/restore test. Các mục "test E2E/backup" trong release gate v2 vẫn chưa đạt. |
| E-20 | `RELEASE_NOTES.md:22,37` / `SPEC_REALITY_CHECK.md:19` — CI/CD, CI run link | **GAP** | `find .github -type f` → rỗng (không có `.github/workflows/`); `git remote -v` → rỗng; chỉ có `docs/CI_WORKFLOW.yml.example`; `checklist.md:284` ghi file example chưa push do PAT thiếu scope `workflow` | Không có CI workflow trên GitHub, không có remote. Khẳng định "CI green" không có bằng chứng. |
| E-21 | `README.md:3,36` — status Proposed/Unverified, evidence hierarchy | **VERIFIED** (tự nhất quán) | `README.md:17` "Runtime verification … > test log > code inspection > spec > assertion in release notes"; `:22` vocabulary `Proposed→Approved→Implemented→Verified→UAT Accepted→Released`; `:27-32` source-of-truth map | Artifact này tuân thủ hierarchy đó: dùng lệnh thật + SHA, không nâng cấp trạng thái suy diễn. |
| E-22 | `product.md:13-15` (D-01) — "runs in Claude" vs standalone Next.js | **VERIFIED** (là open question, đã resolve theo code) | `product.md:150` ghi D-01 là decision blocking; code thực tế là standalone Next.js 16 App Router (`package.json:27`, `app/layout.tsx`, `next.config.ts`) — không có runtime "in Claude" | Tài liệu v2 đúng khi giữ D-01; thực tế code đã là standalone app. |
| E-23 | Secret hygiene / "đã xoay vòng" (`checklist.md:279`) | **VERIFIED** (không lộ credential trong repo) | `git ls-files \| grep '^\.env$'` → **(none)**; `.gitignore:10-12` ignore `.env*`; `tests/smoke.test.mjs:47-55` quét secret trên tracked files (chính nó tự match → E-03). Artifact này **không chép lại giá trị secret** | Không khẳng định việc rotate trên Supabase đã xong — chỉ xác nhận repo không chứa credential. Rotate là hành động ngoài repo, v2/checklist vẫn yêu cầu. |

---

## Điểm sạch

- **Commit danh tính rõ ràng**: HEAD `29dc349`, timestamp `2026-11-17T13:14:08Z`; các nhãn `UNKNOWN`/`TBD` trong v2 giờ có SHA thật để anchor.
- **Toolchain local xanh**: `npm run lint` exit 0; `npx tsc --noEmit` exit 0 — chạy lại trực tiếp trong phiên này.
- **Source DB nhất quán**: 47 policy khớp giữa `migrations/*.sql` và `checklist.md`; 13 bảng (12 nghiệp vụ + `schema_migrations`); migration 001-004 source đầy đủ. 005 tồn tại nhưng được ghi rõ là chưa execute.
- **PDF có thật**: `pdf-lib` + `@pdf-lib/fontkit` + Inter TTF nhúng (`embedFont`); 4 test PDF pass; routes PDF hiện diện.
- **Rate-limit có thật dạng code**: Lua sliding-window atomic trong Upstash Redis; logic test chặn đúng request thứ 101.
- **Cấu trúc route đúng context**: works / notifications / alerts/[id] / reports/[id] / reports/summary / admin/roles đều có; `proxy.ts` đã thay `middleware.ts`; security headers + HttpOnly cookie có trong source.
- **Không có credential trong repo**: `.env` không bị track; artifact này không chép secret.

## Điểm cần làm rõ

1. **✅ Test đã xanh (E-03)**: lúc audit `npm test` = 20/21 do self-match tại `tests/smoke.test.mjs`; parent đã fix (skip file test khỏi self-scan) → **21/21 pass**. Gate "tests green" trong `RELEASE_NOTES.md:25` đã đạt ở mức unit/smoke.
2. **🔴 `/api/v1` chưa hiện thực (E-11)**: tech_spec/api_spec/checklist chọn làm base path nhưng code không có prefix và không có OpenAPI. Cần quyết định: sửa docs cho khớp code, hoặc đổi route handlers — đừng để CONFLICT này tồn tại.
3. **🟠 Live DB chưa re-verify (E-06/E-07)**: phiên này không có credential DB; các số 13 bảng/47 policy/RLS 0-vs-all/audit 0→3 chỉ có trong nhật ký xác minh. Muốn nâng lên VERIFIED cần chạy lại query trên Supabase thật tại SHA này với secret đã rotate (không lưu vào file).
4. **🟠 E2E / Redis live / build chưa re-run (E-05/E-08/E-09/E-19)**: các bằng chứng 100×401+5×429, render PDF 349 KB, build `--webpack` là từ phiên trước. Không tự nhận đã re-chạy.
5. **🟠 Chưa có Incidents riêng & SLA chưa apply (E-13/E-14)**: incident chỉ là KPI/dòng ma trận; view `v_alert_sla` nằm trong migration 005 chưa execute. Không ghi SLA là "live".
6. **🟠 Release gates vẫn GAP (E-19/E-20)**: không E2E test, không staging deploy, không backup/restore drill, không CI workflow/remote. `RELEASE_NOTES.md` giữ NO-GO là chính xác.
7. **🟡 11 file v2 chưa commit**: artifact này cũng là working-tree modification; Anchor SHA ở trên là của **code/HEAD**, không phải của nội dung v2 (v2 chưa có SHA riêng).

---

*Tạo bởi: read-only evidence pass tại `29dc349`. Không file v2 nào bị sửa. Không commit. Mọi lỗi/chênh lệch đều được ghi ngay cả khi không thuận lợi cho nhãn "done".*
