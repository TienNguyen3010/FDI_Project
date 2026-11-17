# FDI_Project — Database migrations (Supabase)

Bộ migration SQL chạy **trực tiếp trong Supabase SQL Editor** (không cần psc, không dùng `\i`).
Thứ tự bắt buộc: **001 → 002 → 003 → 004**. Mỗi file idempotent, có thể chạy lại.

| File | Nội dung |
|---|---|
| `001_initial_schema.sql` | `CREATE EXTENSION pgcrypto`; 12 bảng (UUID PK `gen_random_uuid()`, FK cascade/set null/restrict, CHECK enum, UNIQUE, `TIMESTAMPTZ DEFAULT now()`, `DATE`, trigger `updated_at`, ~30 index theo checklist §3#11) + bảng `schema_migrations`. |
| `002_rls_policies.sql` | Bật RLS 13 bảng; 6 helper `SECURITY DEFINER` lấy role/team/uid an toàn từ JWT `app_metadata` hoặc `public.users`; policies SELECT/INSERT/UPDATE/DELETE cho 4 role theo `rbac_matrix.md`. |
| `003_seed.sql` | Dữ liệu demo tối thiểu, `ON CONFLICT DO NOTHING`, UUID cố định; không password hash thật / thông tin nhạy cảm. |
| `004_audit_trigger.sql` | Trigger audit `AFTER INSERT/UPDATE/DELETE` trên 11 bảng nghiệp vụ (ghi `user_id=auth.uid()`, diff OLD/NEW vào cột `changes JSONB`); chạy **sau 003**. |

## Cách chạy

1. Vào Supabase Dashboard → project FDI_Project → **SQL Editor → New query**.
2. Paste nội dung `001_initial_schema.sql` → **Run**. Đợi `Success`.
3. Tạo query mới → paste `002_rls_policies.sql` → **Run**.
4. Tạo query mới → paste `003_seed.sql` → **Run**.
5. Tạo query mới → paste `004_audit_trigger.sql` → **Run** (sau 003).
6. (Tuỳ) Chạy các câu verify bên dưới trong query mới.

> Nếu chạy lại cả bộ, không lỗi: bảng/index dùng `IF NOT EXISTS`, policy dùng
> `DROP POLICY IF EXISTS`, function dùng `CREATE OR REPLACE`, seed dùng
> `ON CONFLICT DO NOTHING`.

## Verify

```sql
-- 1) 13 bảng (12 + schema_migrations)
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' ORDER BY tablename;

-- 2) RLS bật (relrowsecurity = true cho mọi bảng)
SELECT relname, relrowsecurity FROM pg_class
WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
ORDER BY relname;

-- 3) Số policy (= 47), số index (>= 30)
SELECT count(*) AS policies FROM pg_policies WHERE schemaname = 'public';
SELECT count(*) AS indexes FROM pg_indexes WHERE schemaname = 'public';

-- 4) 3 version migration đã đăng ký
SELECT version, applied_at FROM public.schema_migrations ORDER BY version;

-- 5) Row count sau seed (xem kỳ vọng ở cuối file 003_seed.sql)
SELECT 'users' t, count(*) FROM public.users UNION ALL
SELECT 'customers', count(*) FROM public.customers UNION ALL
SELECT 'sites', count(*) FROM public.sites UNION ALL
SELECT 'projects', count(*) FROM public.projects UNION ALL
SELECT 'devices', count(*) FROM public.devices UNION ALL
SELECT 'alerts', count(*) FROM public.alerts UNION ALL
SELECT 'maintenances', count(*) FROM public.maintenances UNION ALL
SELECT 'works', count(*) FROM public.works UNION ALL
SELECT 'reports', count(*) FROM public.reports UNION ALL
SELECT 'documents', count(*) FROM public.documents UNION ALL
SELECT 'config', count(*) FROM public.config;

-- 6) Giờ GMT+7 (checklist §3#14)
SELECT created_at, created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' AS gmt7
FROM public.projects LIMIT 1;

-- 7) Role helper (chạy bằng user thường qua app → không trả 'authenticated')
SELECT public.fdi_current_role(), public.fdi_current_team(), public.fdi_current_user_id();
```

## Rollback

Không có file rollback tự động. Nếu cần gỡ bộ này trên DB **demo/sạch**, chạy
(trong SQL Editor) — **CẨN THẬN: DROP xóa dữ liệu, chỉ làm khi chắc chắn**:

```sql
DROP TABLE IF EXISTS public.schema_migrations, public.config, public.audit_logs,
  public.documents, public.reports, public.works, public.maintenances,
  public.alerts, public.devices, public.projects, public.sites,
  public.customers, public.users CASCADE;
DROP FUNCTION IF EXISTS public.fdi_can_read(UUID,UUID,UUID,UUID,UUID,UUID);
DROP FUNCTION IF EXISTS public.fdi_is_leader_plus();
DROP FUNCTION IF EXISTS public.fdi_is_manager_plus();
DROP FUNCTION IF EXISTS public.fdi_is_director();
DROP FUNCTION IF EXISTS public.fdi_current_role();
DROP FUNCTION IF EXISTS public.fdi_current_team();
DROP FUNCTION IF EXISTS public.fdi_current_user_id();
DROP FUNCTION IF EXISTS public.fdi_set_updated_at();
```

Trên production: **không DROP** — dùng backup/PITR của Supabase để restore,
hoặc viết migration `004_...` đảo ngược có kiểm soát.

## Lưu ý / rủi ro

- File mới ở dạng **source SQL**, chưa được execute trên DB thật (không có credential
  Supabase trong môi trường này). Hãy chạy verify ở trên sau khi apply để xác nhận.
- Role app được lấy từ `app_metadata.role`/`app_role` rồi fallback `public.users`.
  Nếu app lưu role ở JWT claim tên khác, cập nhật `fdi_current_role()` cho khớp.
  Không dùng `auth.jwt()->>'role'` vì claim đó là `authenticated`, không phải role app.
- Bảng `users` ở đây là bảng app tách biệt `auth.users` của Supabase Auth. Production
  nên dùng `auth.users` + profile table; cột `password_hash` chỉ để khớp contract.
- `audit_logs.ip`/`user_agent` theo contract nhưng RBAC §5.3 khuyến cáo không lưu IP
  nhạy cảm — cân nhắc để NULL hoặc mask. Trigger audit (diff OLD/NEW) chưa nằm trong
  bộ này; có thể thêm ở migration sau nếu cần ghi tự động mọi thay đổi.
- Một số cột `status`/`priority`/`type` là `TEXT` tự do (đúng `lib/types.ts`, contract
  chỉ định nghĩa ENUM cho severity/priority/project status/device status/maintenance type/report
  type). Nếu muốn chặt hơn, thêm CHECK riêng ở migration sau.
- Seed dùng domain `@fdi.local` và URL `example.invalid` — không phải thông tin thật.
