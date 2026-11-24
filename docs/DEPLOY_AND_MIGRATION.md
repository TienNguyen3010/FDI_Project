# Apply Migration & Deploy — FDI_Project v1.0

> Trạng thái 2026-11-23: **Migration 006–014 ĐÃ APPLY ĐỦ** (verify trực tiếp trên DB pooler: `schema_migrations` có 010/011/012/013/014; hàm `log_customer_activity` + `create_customer_with_activity` tồn tại) · Deploy ✅ production `https://fdi-project.vercel.app` @ `3ca30f9`.

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

## 16d. UI/UX form KH + khớp RLS 2 đầu cho project_manager (2026-11-23)

| Hạng mục | Kết quả | Evidence |
|---|---|---|
| Yêu cầu user | Thêm KH full màn hình; sửa KH phải hiện Mã; footer không che chữ khi cuộn; modal "Xác nhận thoát" căn giữa màn hình | chat + ảnh browser |
| Nguyên nhân footer | Footer `sticky bottom-0` dùng `bg-card/95 backdrop-blur` → nền mờ, chữ card lọt qua khi cuộn | `CreateCustomerForm.tsx:610` |
| Fix footer | Nền đục `bg-card`, padding ngang `-mx-5 px-4`, `paddingBottom = calc(0.75rem + env(safe-area-inset-bottom))` | `CreateCustomerForm.tsx:610-616` |
| Nguyên nhân modal lệch | Modal `fixed inset-0 flex items-center` nhưng nằm trong vùng cuộn `main` → bị lệch khi scroll; thiếu `!important` nên utility bị ghi đè | `ui.tsx:271` vs `ClientBody.tsx:454` |
| Fix modal | Thêm `!items-center` (important) để căn giữa viewport thật, độc lập với trạng thái cuộn | `CreateCustomerForm.tsx:640-645` |
| Full màn hình | Container `max-w-[1180px]` → `max-w-[1600px]` (grid vẫn 2 cột, giãn theo màn hình) | `CreateCustomerForm.tsx:322` |
| **Lỗi DB: mã không hiện khi sửa** | RBAC client cấp `customer.update` cho director+PM+super_admin, nhưng RLS `fdi_can_read()` chỉ director/manager được TRUE toàn công ty → PM SELECT rỗng → ô Mã không có dữ liệu; `fdi_is_leader_plus()` thiếu PM → PATCH bị DB từ chối | `migrations/002:176,147-150` vs `policy.core.mjs` |
| Fix DB | Migration **011_customer_edit_scope.sql**: nới `fdi_can_read` nhánh toàn công ty sang `director/manager/project_manager`; `fdi_is_leader_plus` += `project_manager`; tái tạo `fdi_customers_update`. Đã ghi `schema_migrations`. | `migrations/011_customer_edit_scope.sql` |
| Verify | test `customer-code-edit.test.mjs` **11/11** · tsc 0 · build 0 · docs-check OK | tool output |

> **Migration 011 cần apply** trên Supabase SQL Editor (như 008/009/010). Chưa apply thì role PM vẫn không sửa/hiện mã được; super_admin/director vẫn chạy đúng như cũ.

> **⚠️ BỔ SUNG 2026-11-23 (v2): migration 011 CHƯA sửa hết.** Verify lại trên prod (`d79ae7d`) thấy ô Mã KH vẫn trống khi sửa với role `project_manager`. Nguyên nhân gốc nằm ở `public.fdi_current_role()`: nhánh lọc JWT chỉ nhận `('employee','leader','manager','director','super_admin')` — **thiếu `project_manager`** → role bị đánh thành `NULL`; fallback đọc `public.users.role` cũng không có `project_manager` (CHECK constraint cũ chỉ 4 role legacy, `migrations/001:25-26`) → hàm trả `'anon'` → `fdi_can_read` FALSE → `GET /api/v1/customers/[id]` trả 404 → form không có `code`. Xem §16e + `migrations/012_customer_edit_scope_v2.sql`.

## 16e. Sửa GỐC mã KH không hiện khi sửa + chặn chẽ footer/modal (2026-11-23)

| Hạng mục | Kết quả | Evidence |
|---|---|---|
| Triệu chứng 1 | Footer vẫn bị chữ lọt qua khi cuộn xuống cuối (dù `d79ae7d` đã đổi `bg-card` đục) | ảnh browser `/customers/new` |
| Nguyên nhân 1 | Footer `sticky` nằm **trong cột trái** `div.space-y-4.lg:col-span-2` — flex item `align-self: stretch` nên cao bằng **nội dung**, không phải grid track; sticky chỉ phủ trong phạm vi đó, không phủ vùng viewport còn lại khi cuộn | `CreateCustomerForm.tsx` (bản `d79ae7d`) |
| Fix 1 | Đưa `<footer>` **ra ngoài cột**, cùng cấp với grid; nền **đục tuyệt đối** `bg-[#ffffff]` + `shadow-[0_-4px_12px_rgba(16,32,62,0.06)]`; bỏ `bg-card`/`bg-card/95`/`backdrop-blur`; kéo hết padding 2 breakpoint `-mx-4 md:-mx-[30px]`; thêm **spacer** `h-20 md:h-[76px]` để card cuối không bị footer che khi cuộn tới cùng | `CreateCustomerForm.tsx` |
| Triệu chứng 2 | Modal "Xác nhận thoát" không center màn hình | ảnh browser |
| Nguyên nhân 2 | Modal lồng trong **cùng cột bị co hẹp** → overlay `fixed inset-0` không phủ full viewport, không căn giữa được | `CreateCustomerForm.tsx` (bản `d79ae7d`) |
| Fix 2 | Modal đặt **trực tiếp trong `<form>`**, không lồng cột; `fixed inset-0 z-50 flex !items-center justify-center`; primitive `Modal` (`ui.tsx`) cũng chốt `!items-center` + `p-4` + `overflow-y-auto`, `ModalContent` thêm `mx-4` | `CreateCustomerForm.tsx`, `components/ui/ui.tsx` |
| Nguyên nhân 3 | `fdi_current_role()` whitelist JWT **thiếu `project_manager`** → RLS coi PM là `anon` → `customers_select` chặn → GET detail 404 → ô Mã trống. Migration 011 chỉ sửa `fdi_can_read`/`fdi_is_leader_plus` nên **không đủ** | `migrations/002:113` + `migrations/009:38` + `migrations/001:25-26` |
| Fix 3 | Migration **012_customer_edit_scope_v2.sql**: (a) mở rộng `fdi_current_role()` whitelist JWT thêm `project_manager`; (b) **`fdi_is_manager_plus()` += `project_manager`** để policy `fdi_customers_insert` cho PM tạo khách hàng (trước bị chặn `new row violates row-level security policy`); (c) copy nguyên thân `fdi_can_read`/`fdi_is_leader_plus`/policy từ 011; (d) RPC dự phòng `fdi_get_customer_code(UUID)` (kiểm đúng `fdi_can_read`, **không lách RLS**). UI thêm `useEffect` đồng bộ `customerCode` khi `initial.code` đến muộn | `migrations/012_customer_edit_scope_v2.sql`, `CreateCustomerForm.tsx` |
| Phụ | Guard `scripts/docs-check.mjs` chỉ resolve path trong `docs/` → báo `migrations/011_customer_edit_scope.sql` là dangling (false positive). Thêm nhánh resolve theo repo root | `scripts/docs-check.mjs:123` |
| Verify | `tsc` EXIT 0 · `npm test` **66/66** · `check:docs` OK 56 files · build EXIT 0 | tool output |

> **Migration 012 ĐÃ APPLY** (verify trực tiếp trên DB: `schema_migrations` có `012_customer_edit_scope_v2`; `fdi_can_read` branch toàn công ty = `('director','manager','project_manager','super_admin')`).

## 16i. Thiết kế lại form theo gốc Add Lead + bảng Activities (2026-11-23)

| Hạng mục | Kết quả | Evidence |
|---|---|---|
| Yêu cầu user | "dựa vào hình tôi đính kèm làm gốc, hãy thiết kế lại UI phần thêm khách hàng, đồng thời bổ sung thêm phần Next Action" + "làm thêm phần Hoạt Động/Activities giống SoftNET CRM để lưu mọi hoạt động liên quan đến khách hàng/dự án" | chat + ảnh Add Lead |
| Gốc tham chiếu | `tien_crm/src/components/add-lead/AddLeadForm.tsx` (v4.0) + `DataChecklist.tsx` + migration activities 0012 của repo SoftNET CRM (ngoài FDI_Project) | đọc trực tiếp |
| Form mới | Section đánh số + icon (1 Thông tin doanh nghiệp · 2 Người liên hệ chính · 3 Next Action đầu tiên · 4 Thông tin bổ sung); grid `lg:grid-cols-[minmax(0,1fr)_272px]`; panel 3 card (Kiểm tra trùng lặp · Hoàn thiện dữ liệu · Tóm tắt) | `components/customers/CreateCustomerForm.tsx` |
| Next Action | checkbox `Tạo Next Action đầu tiên` + Loại hoạt động* + Ngày và giờ* (`datetime-local`) + Nội dung cần thực hiện; ẩn khi sửa | form §3 |
| DB | `migrations/013_customer_activities.sql`: bảng `activities` ĐA HÌNH (`entity_type` customer/project/site, `entity_id` không FK vật lý), lookup `activity_types`/`channels`, RLS theo `fdi_can_read`, RPC `log_activity` + `create_customer_with_activity` (nguyên tử, idempotent qua `metadata.idem_key`, kiểm `fdi_is_manager_plus`) | 013 (517 dòng) |
| Test | `npm test` **77/77** · `tsc` 0 · `build` EXIT 0 · docs-check OK | tool output |

> **Migration 013 ĐÃ APPLY** (verify trên DB: bảng `activities` + lookup `activity_types`/`channels` có seed đủ; RPC `create_customer_with_activity` tồn tại).

### 16j. Lịch sử hoạt động + vá lỗ hổng RLS ghi activities (2026-11-23)

| Hạng mục | Kết quả | Evidence |
|---|---|---|
| Yêu cầu user | "tiếp tục làm" — hoàn thiện phần Hoạt động/Activities (đã có bảng ở 013) | chat |
| **Lỗ hổng 013** | `log_activity` GRANT `anon, authenticated` nhưng **không kiểm `fdi_can_read`** → bất kỳ user authenticated nào (kể cả employee/leader) đều ghi được hoạt động vào khách hàng của người khác. Comment 013 tự nhận "người không đọc được KH cũng không nên ghi" nhưng chưa vá | `migrations/013` mục 5 |
| Fix DB | Migration **014**: thêm RPC `log_customer_activity(...)` **có kiểm `fdi_can_read(NULL, p_entity_id, ...)`**; copy lại nguyên `create_customer_with_activity`. `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO anon, authenticated, service_role` | `migrations/014_customer_activity_scope.sql` |
| API | `GET /api/v1/customers/[id]/activities` (lịch sử, nhãn loại lấy từ lookup `activity_types`, RLS chặn phạm vi) · `POST` (thêm hoạt động, gọi RPC 014; phân loại lỗi 401/403/22023/42883→501 "cần chạy 014") | `app/api/v1/customers/[id]/activities/route.ts` |
| UI | Drawer chi tiết khách hàng thêm section **"Lịch sử hoạt động"**: dòng thời gian (label loại + thời gian + subject/body + badge status), empty state "Chưa có hoạt động nào.", nút **Thêm hoạt động** (form inline: Loại/Ngày giờ/Nội dung/Trạng thái), refetch sau khi thêm | `app/(workspace)/customers/page.tsx` |
| Verify | `npm test` **77/77** · `tsc` 0 · `build` EXIT 0 | tool output |

> **Migration 014 ĐÃ APPLY** (verify trực tiếp trên DB + test RLS bằng JWT giả lập: hàm `log_customer_activity` tồn tại, có `fdi_can_read`; admin `super_admin` ghi được hoạt động, `demo.employee@fdi.local` bị chặn "khong co quyen ghi hoat dong cho doi tuong nay").

### 16h. Admin lưu KH thành công nhưng danh sách rỗng (2026-11-23)

| Hạng mục | Kết quả | Evidence |
|---|---|---|
| Triệu chứng | `admin@fdi.local` (Quản trị hệ thống) bấm Lưu → **thành công**, nhưng trang `/customers` hiện "Chưa có khách hàng nào" (Tổng KH = 0) | ảnh user `/customers` |
| Nguyên nhân | Policy `fdi_customers_select` dùng `fdi_can_read(NULL, id, ...)`. Nhánh toàn công ty của `fdi_can_read` (002 gốc) chỉ `('director','manager')`; 011 thêm `project_manager` nhưng **thiếu `super_admin`**. RBAC client cấp `customer.read` cho super_admin (ALL) → UI hiện dữ liệu đúng quyền nhưng **RLS chặn SELECT** → list rỗng. Lỗi này có từ 002, chỉ lộ ra khi admin insert thành công (trước đó không có row nào để thấy) | `migrations/002:176` + `011:37` vs `policy.core.mjs:27` |
| Fix | Migration **012** `fdi_can_read` nhánh toàn công ty → `('director','manager','project_manager','super_admin')`. Chỉ sửa 1 dòng, giữ nguyên phần còn lại | `migrations/012_customer_edit_scope_v2.sql` mục 2 |
| Verify | `npm test` **68/68** · `node --test tests/customer-code-edit.test.mjs` 16/16 | tool output |

> **Cần apply lại 012** (bản đã thêm `super_admin` vào `fdi_can_read`). Idempotent.

### 16g. Footer che nội dung khi cuộn tới cùng (2026-11-23)

| Hạng mục | Kết quả | Evidence |
|---|---|---|
| Triệu chứng | Kéo trang lên xuống, card cuối bị footer che mất phần đáy | ảnh user `/customers/new` |
| Nguyên nhân | `<main>` (`ClientBody.tsx:454`) chỉ có `md:pb-[30px]`, trong khi footer sticky cao ~64px → nội dung cuối không cuộn được lên trên footer. Ngoài ra footer `-mx-5` chỉ kéo hết padding mobile `p-4` (16px), **không kéo hết** `md:p-[30px]` → lệch viền trên desktop | `ClientBody.tsx:454` + `CreateCustomerForm.tsx` footer |
| Fix | Thêm spacer `h-20 md:h-[76px]` ngay sau `</footer>`; footer `-mx-4 md:-mx-[30px]` + `md:px-[30px]` để full-bleed đúng ở cả 2 breakpoint | `CreateCustomerForm.tsx` |
| Verify | `node --test tests/customer-form-footer.test.mjs` 4/4 · `npm test` **67/67** · tsc 0 | tool output |

### 16f. Lỗi `new row violates row-level security policy for table "customers"` (2026-11-23)

| Hạng mục | Kết quả | Evidence |
|---|---|---|
| Triệu chứng | Bấm **Lưu khách hàng** báo đỏ "Lưu không thành công — new row violates row-level security policy for table \"customers\"" | ảnh user `/customers/new` |
| Nguyên nhân | Policy `fdi_customers_insert` dùng `WITH CHECK (public.fdi_is_manager_plus())`; hàm này (009) = `('manager','director','super_admin')` — **thiếu `project_manager`**. RBAC client (`lib/rbac/policy.core.mjs`) **cấp `customer.create` cho director + project_manager + super_admin** → nút Lưu hiện nhưng DB chặn → 2 đầu lệch | `migrations/002:308` + `migrations/009:62-65` vs `policy.core.mjs:29,35` |
| Đính chính | Migration 012 bản đầu **bỏ sót** hàm này (chỉ sửa `fdi_current_role`/`fdi_can_read`/`fdi_is_leader_plus`) → đã bổ sung `fdi_is_manager_plus` += `project_manager` trong **012** (đừng tạo 013) | `migrations/012_customer_edit_scope_v2.sql` mục 3b |
| Fix | `CREATE OR REPLACE fdi_is_manager_plus()` = `('manager','director','super_admin','project_manager')` + `REVOKE/GRANT`. Policy INSERT tham chiếu hàm theo **tên** nên thay hàm là có hiệu lực ngay, không cần tái tạo policy | 012 mục 3b |
| Verify | `node --test tests/customer-code-edit.test.mjs` 15/15 · `npm test` **67/67** | tool output |

> **Cần apply lại 012** (bản đã bổ sung mục 3b). Nếu anh đã apply bản cũ rồi, chạy lại đúng file 012 này — nó idempotent (`CREATE OR REPLACE`), chỉ cần chạy lần nữa.

## 16c. Sửa lỗi mã nhân đôi `CUS-CUS-...` trên form sửa (2026-11-23)

| Hạng mục | Kết quả | Evidence |
|---|---|---|
| Triệu chứng (ảnh user) | Form sửa hiện ô mã `CUS-CUS-2026-006`; cột "Mã" trong summary trống | ảnh browser `/customers/<id>` |
| Nguyên nhân #1 | UI ghép cứng span prefix `CUS-` bên trái input, nhưng value đã là mã **đủ** từ DB (`CUS-YYYY-NNN`) → nhân đôi prefix | `CreateCustomerForm.tsx:356-365` |
| Nguyên nhân #2 | Summary dùng `customerCode ?? 'Tự động tạo'` nhưng render qua `<dd>{value}</dd>` khi `key==='code'` lại để trống khi rỗng (ẩn điền kiện) | `CreateCustomerForm.tsx:519-533` |
| Fix | Bỏ span prefix; dùng `codeDisplay = customerCode \|\| (isEdit ? '—' : 'Tự động tạo')`; cả input và summary dùng chung biến → không nhân đôi, không trống | `components/customers/CreateCustomerForm.tsx` |
| Phụ | Chế độ sửa ẩn nút "Lưu và tạo mới" (không có nghĩa khi đang sửa 1 bản ghi) | `CreateCustomerForm.tsx` footer |
| Verify | test `customer-code-edit.test.mjs` 9/9 (thêm 2 case chặn regression) · tsc 0 · build 0 | tool output |

## 16g. Định vị lại PSM: lifecycle_stage thật, block Dự án, font/hit-area (2026-11-24)

User chốt: **A — làm migration cột thật**, và **giữ nguyên nav Infrastructure + Assets** (2 module phát triển sau).

| Hạng mục | Kết quả | Evidence |
|---|---|---|
| Bối cảnh đổi | User làm rõ dự án là **PSM** (theo dõi dự án đang/đã triển khai + ticket + monitoring), không phải CRM bán hàng ⇒ phản biện lại, bỏ các đề xuất kiểu Zoho Account owner/dedup engine | tin nhắn user |
| **P0-3/P0-4** | Thêm `customers.lifecycle_stage` THẬT (migration **015**) thay `status='active'` hardcode. 5 giá trị: Tiềm năng / Đang triển khai / Đang vận hành / Bảo trì / Ngừng, có CHECK constraint. Backfill theo dữ liệu `projects` thật (không suy đoán). Form + list filter đều thật | `migrations/015_customer_lifecycle_stage.sql` · distribution trên DB: `implementing=1, prospect=6` |
| Verify RLS | JWT giả lập: đọc đúng phạm vi (`fdi_can_read`), UPDATE stage = 1 row; RPC tạo KH nhận `lifecycle_stage` và trả stage; test rác đã **rollback sạch** | tool output psycopg |
| **P0-5** | Giữ nguyên nav Infrastructure/Assets theo chốt; KHÔNG xoá | `components/ClientBody.tsx` |
| **P0-1** | Nhãn KPI "Ticket đang mở" → **"Ticket mở (toàn hệ thống)"** để không hiểu sai thành ticket của KH đó | `page.tsx` |
| **P1-5** | Panel KH thêm block **"Dự án của khách hàng"**: tên dự án + badge trạng thái + progress bar (role=progressbar). Endpoint mới `GET /api/v1/customers/[id]/projects` (scoped theo RLS). `progress=null` → hiện **"—"**, KHÔNG bịa 0% | `CustomerDetailPanel.tsx` + `app/api/v1/customers/[id]/projects/route.ts` |
| **P1-2/3** | Chuẩn hoá font: h1 **24px semibold** ở CẢ list và form (trước lệch 30 vs 21); label field **12 → 14 medium**; section heading 12 → 14 | 2 file |
| **P1-4** | Panel phải `lg:sticky lg:top-4 self-start` — form dài cuộn xuống vẫn thấy summary | `CreateCustomerForm.tsx` |
| **P1-7/8/9** | Bảng **9 cột** mới: `# · Tên KH · Người liên hệ · Email · Điện thoại · Dự án · Vòng đời · Ngày tạo · Thao tác`. Bỏ cột **Ngành** (PSM không cần), tách Liên hệ/Email/SĐT thành 3 cột để copy & sort được, thêm **Ngày tạo** (audit) | `page.tsx` |
| Type/schema | `lib/types.ts` + `components/customers/types.ts`: thêm `lifecycle_stage`/`created_by`/`updated_by` + `CustomerProject`; `projects.Row` bổ sung `site_id`/`progress`/`start_date`/`end_date` (cột thật đã có) | 3 file |
| Verify | `npm test` **105/105** (thêm `customer-psm-lifecycle.test.mjs` 9 test) · `tsc` **0** · docs-check OK | tool output |

## 16f. Sửa chữ vô hình trên Badge (Ngành / Trạng thái / tag) — contrast 1.00 (2026-11-24)

| Hạng mục | Kết quả | Evidence |
|---|---|---|
| Triệu chứng (ảnh user) | "column Ngành màu chữ đang xanh lá nhạt nên không thấy rõ" | ảnh `/customers` |
| ĐO THẬT bằng `getComputedStyle` trên prod | Ô Ngành (Badge `default`) có **chữ `rgb(248,252,249)` y hệt nền `rgb(248,252,249)`** ⇒ **contrast ratio = 1.00** (không phải "nhạt khó đọc", mà là VÔ HÌNH). Cùng đo cell thường: `rgb(16,32,62)` trên trắng = 16.92 | tool output JS trong browser |
| Nguyên nhân gốc (lộ ra khi deploy bản vá đầu) | **`.text-muted` KHÔNG có rule CSS trong bản build** — Tailwind chỉ sinh `.text-muted-foreground`. Mọi chỗ dùng `text-muted` (Badge, Button tabs, Spinner, divider, icon) rơi về màu **kế thừa**, tình cờ TRÙNG nền `rgb(248,252,249)` ⇒ contrast 1.00. Bản vá `--muted` đầu tiên không ăn vì class không hề trỏ token đó | `getComputedStyle` trên prod: probe `.text-muted` → `rgb(248,252,249)`, không rule nào khớp |
| Fix #1 | `--muted`: `#b8d0ce` → **`#33415c`** (xanh đậm, giữ vai "phụ"). Contrast trên trắng **10.24** · trên sidebar-group **9.89** | `app/globals.css` |
| Fix #2 | Badge `critical` `risk/10 + risk` → `risk/15 + #b32833` (3.45 → **5.87**) · `major` `kpi-tickets/10 + kpi-tickets` → `…/15 + #a45a05` (2.23 → **4.77**). Cả hai đạt WCAG AA | `components/ui/ui.tsx` |
| Fix #3 (đóng gốc) | Khai báo utility `.text-muted { color: var(--muted) }` trong `globals.css` — một chỗ vá được cả 5 chỗ dùng `text-muted`, đồng bộ về một token | `app/globals.css` |
| Phạm vi ảnh hưởng | Mọi `<Badge>` `default` (Ngành, MST trong summary, tag), Button tab, Spinner, divider, icon muted — **sáng lên cả hệ thống**; đúng hướng vì trước đó những chỗ đó cũng mất chữ | grep repo: 5 file dùng `text-muted` |
| Verify | `tests/contrast-badge.test.mjs` **4/4** (tính WCAG contrast thật + chặn `.text-muted` phải có rule) · `npm test` **96/96** · `tsc` **0** · build EXIT=0 · đo lại prod | tool output |

## 16e. Màn quản lý khách hàng lấy chuẩn UI Lead (SoftNET CRM) + bỏ topbar (2026-11-24)

| Hạng mục | Kết quả | Evidence |
|---|---|---|
| Yêu cầu user | "sửa lại UI/UX màn hình quản lý khách hàng và right sidebar lấy UI/UX màn hình quản lý Lead ở dự án SoftNET CRM làm chuẩn, đồng thời bỏ header Customers admin@fdi.local" | tin nhắn user |
| Baseline đọc tận gốc | `/opt/data/tien_crm/src/components/leads/LeadManagementShell.tsx` (§A/§B scope tabs + smart view, KPI clickable), `LeadDetailPanel.tsx` (slide-over 480–560px: avatar + status + quick actions + "Thông tin chính" + "Hoạt động gần đây" + audit), `LeadsPageHeader.tsx`, `LeadKpiCards.tsx` | file source |
| #1 Bỏ topbar | `ClientBody.showTopbar` ẩn thêm ở `/customers` (danh sách) — màn tự có h1 + 4 KPI + toolbar; 24 route khác giữ nguyên; mobile vẫn còn nút drawer | `components/ClientBody.tsx` |
| #2 Right sidebar | Thay `CustomerDetailDrawer` (drawer 440px, section dài vô tổ chức) bằng **`CustomerDetailPanel`** mirror `LeadDetailPanel`: slide-over 480px (xl 560px), header avatar 12×12 + tên + **Mã** (`font-mono`) + status badge + nút X; quick actions Gọi/Email/Thêm hoạt động/Sửa (gate RBAC); nhóm **"Thông tin chính"** heading uppercase có icon; **"Hoạt động gần đây"** khung Card + relative time; dòng audit Tạo lúc/Mã | `components/customers/CustomerDetailPanel.tsx` (mới) |
| #3 Scope / Smart view | Mirror §B Lead: underline tabs **dưới KPI** (`Tất cả khách hàng` / `Có dự án` / `Đang có ticket mở`), 3 KPI card **bấm được** chọn view (aria-pressed, active ring), tiêu đề bảng theo view, state đồng bộ URL `?view=` để back/refresh giữ lại | `app/(workspace)/customers/page.tsx` |
| Quyết định KHÔNG bịa | Tab Lead "Lead của tôi / Tất cả Lead" scope theo **owner**, nhưng bảng `customers` **không có cột owner** → verify trực tiếp trên DB (`information_schema.columns`) chỉ có 18 cột, không có owner/assigned_to/created_by. Làm tab "của tôi" = bịa số → **loại bỏ**, thay bằng view theo project + ticket (dữ liệu thật) | query psycopg trên DB prod |
| CSAT không cho bấm | Schema không có bảng survey/CSAT → KPI CSAT hiển thị "Chưa có dữ liệu", **không gắn onClick** (không lọc được) | `page.tsx` ghi chú |
| Type dùng chung | Tách `components/customers/types.ts` (`Customer`/`Activity`) + `lib/relativeTime.ts` (`relativeTimeLabel`) — page và panel dùng chung, bỏ interface local trùng | 2 file mới |
| Verify | `npm test` **92/92** · `tsc` **0** · build EXIT=0 · docs-check OK | tool output |

## 16d. Form khách hàng: bỏ topbar trùng, mã KH đọc rõ, footer/modal sửa lại (2026-11-24)

| Hạng mục | Kết quả | Evidence |
|---|---|---|
| Triệu chứng #1 (ảnh user) | Màn Sửa KH vẫn có hàng **"Customers · admin@fdi.local"** phía trên → trùng với breadcrumb/h1 của chính form | ảnh `/customers/<id>` |
| Fix #1 | `ClientBody` thêm nhánh `showTopbar`: ẩn topbar ở `/customers/new` và `/customers/[id]` (màn full page tự có header), giữ nguyên topbar ở mọi route khác; mobile vẫn còn nút mở drawer | `components/ClientBody.tsx` (khai báo `showTopbar`, nhánh `) : (`) |
| Triệu chứng #2 (ảnh user) | Dòng **"Mã"** trong panel *Tóm tắt khách hàng* hiện xanh lá nhạt → không thấy mã KH | ảnh `/customers/<id>` |
| Nguyên nhân #2 | Mã bị bọc `<Badge>{codeDisplay}</Badge>`; `badgeVariants.active` = `bg-sidebar-active text-sidebar-heading` → nền `#ddf5dc` + chữ xanh đậm → mờ | `components/ui/ui.tsx:206` (variant `active`) |
| Fix #2 | Bỏ Badge: dòng đổi nhãn **"Mã KH"**, hiển thị thẳng bằng `font-mono font-semibold tabular-nums text-foreground`; ô input mã thêm cùng bộ class + bỏ mọi `placeholder` (tránh nhầm là chưa có mã) | `components/customers/CreateCustomerForm.tsx` |
| Triệu chứng #3 | Footer kéo lên/xuống vẫn **che chữ** nội dung — user báo **3 lần**, fix lần 1 (đổ bóng) + lần 2 (tăng đệm) không dứt | ảnh + mô tả user |
| Nguyên nhân #3 (đã cô lập bằng ĐO THẬT trên prod) | **Không phải footer nổi.** Đăng nhập, mở `/customers/new`, cuộn `main` tới max rồi đo bằng `getBoundingClientRect`: `footerBottom = 595` trong khi đáy viewport = **720** → footer **khựng lên, hở 125px** phía dưới, nên chữ lọt vào khe hở đó. Nguyên nhân: `<main>` chỉ có `md:pb-[30px]` + spacer 88/96px **nằm trong `<form>` (mx-auto)** không góp thêm chiều cuộn dưới đáy footer | `ClientBody.tsx` `<main>` padding-bottom |
| Đo lại theo từng mức pb (đúng prod) | pb 30→hở 125px · pb 70→hở 165px · pb 100→hở 195px · pb 150→hở 245px. Xác nhận footer **luôn khựng**, càng thêm đệm càng lộ rõ khe hở → phải cho footer **chạm đáy** bằng cách đặt `pb` bằng đúng chiều cao footer + safe-area | tool output JS trong browser |
| Fix #3 (CHỐT, sau khi đo 4 lần trên prod) | **Bỏ hẳn `sticky`.** Đăng nhập, mở `/customers/new`, cuộn `main` tới max rồi đo `getBoundingClientRect` bằng JS: footer `bottom=595` / viewport `720` ⇒ **hở 125px**; thử tăng pb main (30→220) thì hở lần lượt 125/165/195/245/315px — **càng đệm càng đẩy footer lên**, vì đệm nằm giữa nội dung và đáy cuộn. Nguyên nhân gốc: `sticky` chỉ neo trong phạm vi **flex container cha là `<main>`**, không phải chiều dài nội dung. **Fix:** form `h-full flex-col` + wrapper `flex min-h-0 flex-1 flex-col` + footer **`mt-auto`** (neo đáy form, luôn chạm đáy màn hình); bỏ `sticky bottom-0 z-30` và spacer cũ. Nền `#ffffff` đục + full-bleed `-mx` + safe-area giữ nguyên | `CreateCustomerForm.tsx` + 3 test |
| Bằng chứng đo | `footerBottom` 595 vs 720 (pb30) · 555 (pb70) · 525 (pb100) · 475 (pb150) · 405 (pb220) — tất cả **hở khe**, không mức nào chạm đáy | tool output JS trong browser trên prod |
| Triệu chứng #4 | Bấm **Hủy** modal xác nhận **không căn giữa** màn hình | mô tả user |
| Fix #4 | Modal thoát đổi `z-50` → `z-[60]` (cao hơn footer sticky `z-30`), giữ `items-center justify-center`; bỏ `!items-center` thừa | `CreateCustomerForm.tsx` modal `data-testid="exit-confirm-modal"` |
| Triệu chứng #5 | Breadcrumb **"Khách hàng"** là `<span>` chết, không quay về được danh sách | mô tả user |
| Fix #5 | Đổi sang `<Link href="/customers">` (client navigation, có focus ring/hover) + import `next/link` | `CreateCustomerForm.tsx` header breadcrumb |
| Verify | `node --test tests/customer-form-shell.test.mjs` **6/6** · `npm test` **82/82** · `tsc` **0** · build 0 · docs-check OK | tool output |

## 15. Logout không redirect — HttpOnly cookie `sb-access-token` sót lại (2026-11-19)

| Hạng mục | Kết quả |
|---|---|
| Triệu chứng | Sau bấm "Đăng xuất" vẫn đứng `/dashboard`: alert đỏ "Phiên đăng nhập không hợp lệ.", KPI = 0, sidebar "Không có mục được phép truy cập." + "Đăng nhập để tiếp tục" |
| Nguyên nhân | `ClientBody.tsx:250` chỉ gọi `supabase.auth.signOut()` → xoá localStorage nhưng KHÔNG xoá cookie HttpOnly `sb-access-token` (do `POST /api/auth/session` set lúc login). `proxy.ts:123-139` đọc cookie này → vẫn thấy user → `/login` redirect ngược `/dashboard`. Dashboard API dùng token đã revoke → `authorize.ts:56` trả 401 đỏ. `tokenCache` 5 phút (`proxy.ts:9-10`) làm vòng lặp dai hơn |
| Loại trừ | Không phải RBAC (`customer_viewer` có 9 quyền read → sidebar không trống nếu role hợp lệ); không phải migration 008 (đã apply thành công); không phải stale build |
| Fix | Thêm `app/api/auth/logout/route.ts`: `getSupabaseClient().auth.signOut()` + `clearAccessTokenCookie(res)` (`lib/cookies.ts:30-37`). `handleLogout` gọi `signOut()` → `POST /api/auth/logout` → `router.replace('/login')` + `router.refresh()` |
| Phòng ngừa | Regression test `tests/logout-cookie.test.mjs` (đỏ 0/2 trước fix, xanh 2/2 sau). Proxy vẫn là safety net nếu cookie stale |
| Verify | `node --test tests/logout-cookie.test.mjs` 2/2 · `tsc` 0 · docs-check OK · build 0 |
