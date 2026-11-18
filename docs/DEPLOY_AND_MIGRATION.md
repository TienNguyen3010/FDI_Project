# Apply Migration & Deploy — FDI_Project v1.0

> Trạng thái 2026-11-18: **Migration 006 ✅ applied; Deploy ✅ production `https://fdi-project.vercel.app`**.

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
