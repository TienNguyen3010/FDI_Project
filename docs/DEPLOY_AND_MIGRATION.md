# Apply Migration & Deploy — FDI_Project v1.0

> Trạng thái 2026-11-23: **Migration 006–010 đã apply (010 = `customers.code` + trigger sinh mã); Deploy ✅ production `https://fdi-project.vercel.app`**.

## 1. Phát hiện quan trọng (audit thực, 2026-11-18)

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| DB thật đã có schema CŨ | `users, customers, sites, projects, devices, alerts, maintenances, works, reports, documents, audit_logs, config, schema_migrations` | `migrations/001_initial_schema.sql:20-...` (đã apply 001-004 theo session history) |
| `03-contracts/database/001_core.sql` | **KHÔNG apply trực tiếp** — dùng `CREATE TABLE` (không `IF NOT EXISTS`) → conflict `customers/sites/projects` đã tồn tại, cột khác (`projects.progress`, status `deployed/paused/ended`) | subagent migration audit + grep cột |
| Conflict `users` | Cũ: `password_hash, role, team, active` · Docs `002_extended.sql`: `display_name, active` (**thiếu role**) | subagent migration summary §2 |
| `006` FK | FK tới `public.users/customers/projects` (cột `id`) → **thiết kế cho schema CŨ**; không trộn với schema docs | subagent migration summary §2 |
| `../migrations/006_ops_core.sql` | **An toàn** — `CREATE TABLE IF NOT EXISTS`, 96 statements parse hợp lệ (pglast), RLS đầy đủ | parse output: `OK ... 96 statements parsed` |
| DB password | **ABSENT** — đã rotate 2026-11-17, không lưu lại (chỉ placeholder) | session history msg 1076; `git-credentials` chỉ có host github.com |
| psycopg / psql | ABSENT | `python3 -c import psycopg` fail; `command -v psql` fail |
| `VERCEL_TOKEN` | **ABSENT** (env, config, shell rc đều không có) | deploy audit subagent |
| `vercel` CLI | ABSENT; file cấu hình Vercel tại repo root PRESENT | `command -v vercel` |
| Git | sạch, `HEAD == origin/main == 74da920` | verify tool |

## 2. Quyết định Dev Director (không đổi DB đã apply)

- **Không chạy** `03-contracts/database/001_core.sql` / `03-contracts/database/002_extended.sql` lên DB hiện tại (sẽ lỗi/sai schema).
- **Không force push**, không chỉnh migration đã apply.
- **Không trộn 2 họ schema**: runtime đang chạy họ `001_initial → 006`; họ docs (`001_core/002_extended`) chỉ dùng khi rewrite DB hoàn toàn (DB trống + viết lại FK/RBAC cho 006).
- Chỉ apply **`../migrations/006_ops_core.sql`** (bổ sung, idempotent) SAU KHI có credential và verify bảng cũ tồn tại.
- Deploy Vercel **chỉ sau** khi code đã push (đã xong `74da920`) + có token.

## 3. Việc cần từ bạn (2 credential)

1. **Database password mới** (đã rotate) hoặc connection string pooler:
   `postgresql://postgres.<project-ref>:<DB_PASSWORD>@<pooler-host>:6543/postgres`
   → Tôi sẽ set biến tạm trong phiên, **KHÔNG ghi vào repo/config/chat**.
2. **VERCEL_TOKEN** hợp lệ (đăng nhập `vercel login` hoặc tạo token mới).

## 4. Trình tự sẽ thực hiện sau khi có credential

### DB (apply)
```bash
# verify trước
SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1;   # kỳ vọng có customers/projects/users
SELECT count(*) FROM public.schema_migrations;                          # ≥ 4
# apply
\i migrations/006_ops_core.sql        # hoặc execute qua psycopg
# verify sau
SELECT count(*) FROM public.user_grants;          # 0
SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r';
```

### Deploy
```bash
git status --short                    # sạch
npx vercel deploy --prod --yes --token "$VERCEL_TOKEN"
curl -s -o /dev/null -w "%{http_code}" https://<domain>/dashboard
```
> Sau deploy: **nhắc bạn revoke VERCEL_TOKEN** nếu token từng xuất hiện trong chat/log.

## 5. Verification local ĐÃ xanh (trước khi deploy)

- `npm test` → 27/27 pass
- `npm run check:docs` → OK (51 files, 0 secret/link hỏng)
- `next build --webpack` → exit 0 (20 routes, 5 dashboard API)
- CI `Docs guard (v1.0)` trên `74da920` → success

## 6. Kết quả apply migration thật (2026-11-18)

| Hạng mục | Kết quả | Evidence |
|---|---|---|
| Kết nối pooler | ✅ OK | 13 bảng public trước khi apply |
| `schema_migrations` trước | `001_initial_schema, 002_rls_policies, 003_seed, 004_audit_trigger` | query thật |
| Lỗi runtime phát hiện | `006` dòng 295 `END IF;` sai (phải `END;` cho EXCEPTION block) — pglast parse không bắt | psycopg SyntaxError |
| Fix + apply lại | ✅ `006 executed OK` | 5 bảng mới: `user_grants, project_baselines, acceptance_fractions, sla_state, sla_instances` |
| RLS | 57 policies; **0 bảng mới thiếu RLS** | query `relrowsecurity` |
| Sau apply | `schema_migrations` có `006_ops_core` | query thật |

> ⚠️ DB password dùng trong phiên đã xuất hiện trong chat → **phải xoay vòng** (xem cảnh báo cuối).

## 7. Deploy production thật (2026-11-18)

| Hạng mục | Kết quả | Evidence |
|---|---|---|
| `vercel deploy --prod --yes` | ✅ DEPLOY_EXIT=0, `Ready in 22s`, alias `https://fdi-project.vercel.app` | deploy log |
| Bug production phát hiện | `/api/v1/dashboard/health` → 404 do proxy rewrite mọi `/api/v1/*` sang `/api/*` (trong khi API nằm tại `app/api/v1/dashboard/**`) | curl thật |
| Fix | `proxy.ts` chỉ rewrite `/api/v1/auth*` (legacy); commit `b226e06` | diff + redeploy |
| HTTP sau fix | `/login` 200 · `/dashboard` 307 · `/api/v1/dashboard/health` 401 (auth guard) · `/api/v1/auth/session` 401 | curl thật |
| Root `/` | 404 → thêm `app/page.tsx` redirect `/dashboard` (`0d47b48`) | curl thật |

> ⚠️ `VERCEL_TOKEN` và DB password đã xuất hiện trong chat → **phải revoke/xoay vòng cả 2 ngay**.

## 8. Seed runtime grant + bridge (2026-11-18, sau login QA)

| Hạng mục | Kết quả | Evidence |
|---|---|---|
| Đầu tiên login QA | dashboard hiện đỏ "Không có customer grant" | ảnh browser user gửi |
| Nguyên nhân | `user_grants` rỗng (migration 006 chỉ tạo bảng) + runtime DB dùng bảng `alerts`, không có `tickets` | query DB thật |
| Fix | `../migrations/007_ops_bridge.sql` (từ `docs/`): grant customer cho `admin@fdi.local` + view `tickets` từ `alerts` (security_invoker) | 5 statements parse OK; apply tay xong, version `007_ops_bridge` đã đăng ký |
| Verify logic API | 1 grant · projects `in_progress`=1 · tickets new=1/in_progress=1/resolved=1 → kỳ vọng `open_tickets=2`, `active_projects=0` (đúng MET-01) | query DB thật |
| Commit | `942adac` (không đổi code → không cần redeploy) | push OK |

> Dashboard metrics vẫn là **reference** (baseline/SLA chưa đủ) — không claim production-ready.

## 9. Debug 403 sau grant (2026-11-18)

| Hạng mục | Kết quả |
|---|---|
| Triệu chứng | Network tab: 4 API dashboard đều **403**, body 96 bytes, message "Không có customer grant... truy cập dashboard" (OCR ảnh browser) |
| Loại trừ | RLS DB OK: simulate role `authenticated` + JWT claims → `user_grants=1, projects=1, tickets=3` |
| Root cause | Route handler tạo client MỚI mỗi request; `setSession()` với `refresh_token: ''` fail → query không gắn JWT → `auth_user_id()` NULL → 0 grants → 403 |
| Fix | `lib/auth/authorize.ts`: tạo client với `global.headers.Authorization: Bearer <token>` cho mọi query (commit `b4311a9`) |
| Verify | test 27/27; deploy `EXIT=0`, Ready 28s; HTTP `/` 307 · `/login` 200 · `/dashboard` 307 · `/api/v1/dashboard/health` 401 (unauth đúng) |

> Cần browser refresh để API gọi lại với code mới. Nếu vẫn 403, gửi lại ảnh Network tab (đã fix RLS + auth, khả năng cao hết).

## 10. Fix nav 404 (2026-11-18)

| Hạng mục | Kết quả |
|---|---|
| Triệu chứng (vision xác nhận) | 7 nav route trả 404 khi prefetch: `/infrastructure /my-work /tickets /maintenance /monitoring /documents /reports` |
| Nguyên nhân | Nav href tới route không tồn tại sau khi tách legacy alerts/reports |
| Fix | Component `ComingSoon` (Empty State + badge "Bản sau") + 9 route shell P1/P2; commit `35b85b5` |
| Verify production | `/sites /assets /infrastructure /my-work /tickets /monitoring /documents` → 200; `/maintenance /reports` → 307 (auth redirect); `/api/v1/dashboard/health` → 401 (đúng) |
| Deploy | `EXIT=0`, alias `fdi-project.vercel.app`; test 27/27; docs-check OK |

> Refresh browser lần cuối để thấy dashboard với API đã fix + nav không còn 404.

## 11. Full admin cho admin@fdi.local (2026-11-18)

| Hạng mục | Kết quả |
|---|---|
| Yêu cầu | user muốn `admin@fdi.local` thành full admin (sidebar hiện nhóm HỆ THỐNG/Admin) |
| Constraint | `public.users.role` có CHECK chỉ nhận 4 role legacy → KHÔNG gán `super_admin` được (đúng nguyên tắc không đổi migration đã apply) |
| Fix | Gán `super_admin` trong `auth.users.raw_app_meta_data.role` (JWT) + `user_grants.role_code`; code `authorize()` và `useProfile()` ưu tiên JWT role, fallback DB |
| Verify DB | auth role=super_admin · public role vẫn director (legacy) · grant role_code=super_admin |
| Verify code | test 27/27 · docs-check OK · commit `894d15e` · deploy `EXIT=0` · `/admin` 307 (có auth) |
| Bắt buộc | **Logout → login lại** để cookie nhận JWT role mới; nếu không, sidebar vẫn hiện "Giám đốc" |

> ⚠️ Vẫn phải revoke Vercel token + reset DB password + đổi password login (đã lộ trong chat).

## 12. Sidebar vẫn thiếu nhóm sau khi đổi role (2026-11-18)

| Hạng mục | Kết quả |
|---|---|
| Triệu chứng (vision ảnh 12:02) | Profile hiện "Quản trị hệ thống" nhưng vẫn thiếu nhóm HỆ THỐNG/Admin; TÀI LIỆU & BÁO CÁO rỗng |
| Loại trừ | DB `app_metadata.role = super_admin`; unit logic `hasPermission(super_admin, *)` = true cho cả 5 nhóm; code `NAV_GROUPS` có HỆ THỐNG |
| Nguyên nhân | `supabase.auth.getUser()` trả JWT claims CŨ từ cache localStorage → role vẫn `director` dù DB đã đổi |
| Fix | `ClientBody` + `useProfile` gọi `supabase.auth.refreshSession()` trước `getUser()` để lấy claims mới (commit `47da331`) |
| Verify | test 27/27 · docs-check OK · deploy `EXIT=0` · `/admin` 307 |
| Hành động user | **Hard refresh (Ctrl+Shift+R)** hoặc logout/login lại 1 lần để dọn cache JWT cũ |

> Nếu sau hard refresh vẫn thiếu, gửi ảnh mới + báo thời điểm chụp để đối chiếu deployment SHA.

## 13. Sidebar inactive items mờ — chỉ rõ khi hover (2026-11-18)

| Hạng mục | Kết quả |
|---|---|
| Triệu chứng | Mọi module inactive (Dashboard, Projects, Sites, Works...) chữ gần như vô hình; chỉ sáng lên khi trỏ chuột vào |
| Loại trừ | Không phải opacity/filter/CSS layer — active item vẫn đúng mint-green; icon vẫn xanh; chỉ chữ nhãn mờ |
| Nguyên nhân | `globals.css:86` map `--color-muted: var(--sidebar-group)` = `#f8fcf9` (màu NỀN nhóm) nhưng nav inactive dùng `text-muted` làm màu CHỮ trên nền sidebar trắng → contrast **1.04:1**. Design token `tokens.json:15` quy định màu chữ muted = `#445A7B` (7.01:1) qua `text-muted-foreground` |
| Fix | `components/ClientBody.tsx`: đổi 9 chỗ `text-muted` → `text-muted-foreground` (nav inactive, logout, header buttons, email, bottom nav); giữ `--color-muted` làm nền `bg-muted` cho shadcn |
| Verify | contrast 1.04:1 → 7.01:1 (tính bằng tool) · `tsc` 0 · docs-check OK · test 27/27 |
| Hành động user | Hard refresh sau deploy để dọn CSS cũ |

## 14. Dọn dẹp code/artifact cũ (2026-11-19)

| Hạng mục | Kết quả |
|---|---|
| `legacy/` (14 file, 112K) | Xóa — 0 consumer active, đã bị rewrite v1.0 thay thế; 3 test `pdf.test.mjs` chỉ assert nội dung legacy cũng bỏ (giữ test font) |
| Re-export thừa | `useProfile.ts`: bỏ `export { ROLES, hasPermission }` + `can()` (comment tự nhận "tương thích ngược"); `authorize.ts`: bỏ re-export + import unused; `policy.ts`: bỏ `PERMISSIONS`/`isPermission`/`SCOPE_RULES` value export (test import thẳng `policy.core.mjs`) |
| `../tsconfig.json` | Sửa include `middleware.ts` → `proxy.ts` (Next 16 đổi tên) |
| Docs convention | `REWRITE_PLAN_v1_0.md` + `validation_report_legacy.json` → `06-reference/archive/`; update `docs/README.md:81-82` |
| Guard gap | `scripts/docs-check.mjs:26` regex `v1[_.][1-9]` bỏ sót `_v1_0` → đổi `[0-9]` (archive vẫn exempt) |
| Artifact local (~14MB) | Xóa log deploy cũ, screenshot QA, `/tmp` crop/chunk, scaffold `fdip_test/`, `tsconfig.tsbuildinfo` |
| Giữ lại | `node_modules/`, `.next/`, cache Hermes, delegation live logs, docs archive provenance |

## 16. Migration 010 — mã khách hàng do DB sinh (2026-11-23)

| Hạng mục | Kết quả | Evidence |
|---|---|---|
| Triệu chứng gốc | Form tạo KH hiển thị "Tự động tạo" nhưng DB **không có cột `code`** → mã biến mất, không có định danh khách hàng | `DATA_DICTIONARY.md` drift note 2026-11-19; `app/api/v1/customers/route.ts:32,155` trả `code: null` |
| Nguyên nhân | Mã là danh tính công khai — client ghi đè/bịa được; chưa có trigger | migration audit |
| Fix | `../migrations/010_customer_code.sql`: `customers.code TEXT` + unique partial index; hàm `fdi_next_customer_code(p_year)` SECURITY DEFINER + advisory xact lock `7401000+year` (chống trùng khi 2 request song song); trigger `BEFORE INSERT` chỉ sinh khi client bỏ trống; backfill bản ghi cũ **gọi đúng hàm**; đăng ký `schema_migrations` | file migration 113 dòng |
| Apply | User chạy trong Supabase SQL Editor (máy agent không có DB password hợp lệ; env `sensitive` trên Vercel API trả rỗng) | user xác nhận "sql 010 success" |
| Verify DB | `SELECT fdi_next_customer_code()` → **`CUS-2026-006`** (backfill 5 bản ghi cũ 001–005; hàm còn số 006) | output user dán vào chat |
| Verify code | `tsc` exit 0 · `npm test` 51/51 · `next build --webpack` EXIT=0 (`/customers/new` ◐) · `check:docs` OK | tool output |

> Code form gọi `rpc('fdi_next_customer_code')` lúc submit (`components/customers/CreateCustomerForm.tsx:188`) → chỉ chạy được sau khi 010 apply. **Đã xong tiếp (C15):** API `/api/v1/customers` trả `code` thật (list + drawer hiện mã), `PATCH /api/v1/customers/[id]` + `GET .../[id]`, route `/customers/[id]`, nút Sửa ở cột Thao tác + drawer (gate `customer.update`: director/PM/super_admin). Còn **archive/xóa** chưa làm (thiếu `deleted_at` + policy DELETE).

## 16b. Hiển thị mã + sửa khách hàng (2026-11-23)

| Hạng mục | Kết quả | Evidence |
|---|---|---|
| Triệu chứng (ảnh user) | List + drawer hiện `Mã: —`; nút Sửa disabled "sẽ hỗ trợ ở bản sau" | ảnh browser + `page.tsx:652,671` |
| Nguyên nhân #1 | API hardcode `code: null` (`route.ts:34,155`) → UI không có dữ liệu dù DB đã có cột | grep code |
| Nguyên nhân #2 | RBAC chỉ `super_admin` có `customer.update`; RLS lại cho leader/manager/director → hai đầu lệch | `policy.core.mjs` vs `migrations/002:147-150,310-314` |
| Fix API | `select` thêm `code`; map `code: c.code ?? null`; `SEARCH_FIELDS` += `code` | `app/api/v1/customers/route.ts` |
| Fix RBAC | `director` + `project_manager` += `customer.update` | `lib/rbac/policy.core.mjs:29,35` |
| Fix backend | `PATCH /api/v1/customers/[id]`: authorize + whitelist cột + **`code` immutable → 400** + phân loại lỗi RLS/CHECK; `GET .../[id]` authorize `customer.read` | `app/api/v1/customers/[id]/route.ts` |
| Fix UI | Nút Sửa cột Thao tác + drawer (gated); cột mã `font-mono`; fallback `—`; form tái dùng prop `initial` gọi PATCH (không gửi `code`) | `app/(workspace)/customers/page.tsx`, `[id]/page.tsx`, `CreateCustomerForm.tsx` |
| Verify | tsc 0 · test **59/59** (thêm `customer-code-edit.test.mjs` 7 case + rbac 1 case) · build EXIT=0 · docs-check OK | tool output |

> **Chưa làm (P1):** archive/xóa khách hàng — thiếu `deleted_at` + policy DELETE; giữ nút disabled thay vì giả affordance. Không claim xong.

## 15. Logout không redirect — HttpOnly cookie `sb-access-token` sót lại (2026-11-19)

| Hạng mục | Kết quả |
|---|---|
| Triệu chứng | Sau bấm "Đăng xuất" vẫn đứng `/dashboard`: alert đỏ "Phiên đăng nhập không hợp lệ.", KPI = 0, sidebar "Không có mục được phép truy cập." + "Đăng nhập để tiếp tục" |
| Nguyên nhân | `ClientBody.tsx:250` chỉ gọi `supabase.auth.signOut()` → xoá localStorage nhưng KHÔNG xoá cookie HttpOnly `sb-access-token` (do `POST /api/auth/session` set lúc login). `proxy.ts:123-139` đọc cookie này → vẫn thấy user → `/login` redirect ngược `/dashboard`. Dashboard API dùng token đã revoke → `authorize.ts:56` trả 401 đỏ. `tokenCache` 5 phút (`proxy.ts:9-10`) làm vòng lặp dai hơn |
| Loại trừ | Không phải RBAC (`customer_viewer` có 9 quyền read → sidebar không trống nếu role hợp lệ); không phải migration 008 (đã apply thành công); không phải stale build |
| Fix | Thêm `app/api/auth/logout/route.ts`: `getSupabaseClient().auth.signOut()` + `clearAccessTokenCookie(res)` (`lib/cookies.ts:30-37`). `handleLogout` gọi `signOut()` → `POST /api/auth/logout` → `router.replace('/login')` + `router.refresh()` |
| Phòng ngừa | Regression test `tests/logout-cookie.test.mjs` (đỏ 0/2 trước fix, xanh 2/2 sau). Proxy vẫn là safety net nếu cookie stale |
| Verify | `node --test tests/logout-cookie.test.mjs` 2/2 · `tsc` 0 · docs-check OK · build 0 |
