# Apply Migration & Deploy — FDI_Project v1.0

> Trạng thái: ⏳ **BLOCKED** — cần 2 credential từ Dev Director. Không tự ý chạy DB/prod.

## 1. Phát hiện quan trọng (audit thực, 2026-11-18)

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| DB thật đã có schema CŨ | `users, customers, sites, projects, devices, alerts, maintenances, works, reports, documents, audit_logs, config, schema_migrations` | `migrations/001_initial_schema.sql:20-...` (đã apply 001-004 theo session history) |
| `03-contracts/database/001_core.sql` | **KHÔNG apply trực tiếp** — dùng `CREATE TABLE` (không `IF NOT EXISTS`) → conflict `customers/sites/projects` đã tồn tại, cột khác (`projects.progress`, status `deployed/paused/ended`) | subagent migration audit + grep cột |
| `../migrations/006_ops_core.sql` | **An toàn** — `CREATE TABLE IF NOT EXISTS`, 96 statements parse hợp lệ (pglast), RLS đầy đủ | parse output: `OK ... 96 statements parsed` |
| DB password | **ABSENT** — đã rotate 2026-11-17, không lưu lại (chỉ placeholder) | session history msg 1076; `git-credentials` chỉ có host github.com |
| psycopg / psql | ABSENT | `python3 -c import psycopg` fail; `command -v psql` fail |
| `VERCEL_TOKEN` | **ABSENT** (env, config, shell rc đều không có) | deploy audit subagent |
| `vercel` CLI | ABSENT; file cấu hình Vercel tại repo root PRESENT | `command -v vercel` |
| Git | sạch, `HEAD == origin/main == 74da920` | verify tool |

## 2. Quyết định Dev Director (không đổi DB đã apply)

- **Không chạy** `03-contracts/database/001_core.sql` / `03-contracts/database/002_extended.sql` lên DB hiện tại (sẽ lỗi/sai schema).
- **Không force push**, không chỉnh migration đã apply.
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
