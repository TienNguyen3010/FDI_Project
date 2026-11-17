# 💾 FDI_Project — Backup & Restore (Supabase)

> Checklist §3 #7, §5 #14. **Chưa tự động hoá được từ sandbox** (sau khi credential được xoay vòng).
> Hướng dẫn này để bạn chạy trên Supabase Dashboard / máy có quyền.

---

## 1. Backup qua Supabase Dashboard (khuyến nghị)

1. Mở https://supabase.com/dashboard/project/<project-ref>/database/backups
2. Supabase **tự động backup daily** (PITR tuỳ plan). Với free tier: check "Daily backups" còn bật.
3. Để backup thủ công trước migration:
   - Settings → Database → **Database password** (đã xoay vòng — lưu vào password manager).
   - Dùng lệnh ở §2 với password mới.

## 2. Backup bằng CLI (có `pg_dump`)

```bash
export PGPASSWORD='<database-password-moi>'
REF=<project-ref>
pg_dump -h db.$REF.supabase.co -p 5432 -U postgres -d postgres \
  --no-owner --no-privileges -Fc -f fdi_backup_$(date +%Y%m%d).dump
```

> Nếu mạng chỉ route IPv6 (như sandbox trước đó), dùng pooler:
> `-h aws-0-ap-northeast-1.pooler.supabase.com -p 6543 -U postgres.$REF`
> (region tuỳ project — kiểm tra Dashboard → Project Settings).

## 3. Restore thử (testing — KHÔNG làm trên production)

```bash
# Tạo DB local hoặc project staging
createdb fdi_restore_test
pg_restore -d fdi_restore_test --no-owner --no-privileges fdi_backup_YYYYMMDD.dump

# Verify số bảng & row
psql -d fdi_restore_test -c "SELECT count(*) FROM pg_tables WHERE schemaname='public';"
psql -d fdi_restore_test -c "SELECT count(*) FROM public.audit_logs;"
```

Kỳ vọng: **13 bảng** (12 + schema_migrations), audit_logs ≥ 0, migrations ghi `001..005`.

## 4. Kiểm tra sau restore

| Hạng mục | Query |
|---|---|
| Bảng | `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1;` |
| RLS | `SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r';` |
| Policy | `SELECT count(*) FROM pg_policies WHERE schemaname='public';` (≥ 47) |
| Migration | `SELECT version FROM public.schema_migrations ORDER BY version;` |
| Trigger audit | `SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_%_audit';` (11) |

## 5. Lịch trình đề xuất

| Việc | Tần suất | Người làm |
|---|---|---|
| Backup tự động Supabase | Daily | Supabase |
| Verify backup restore | Weekly | Devops |
| Tải backup về machine khác | Monthly | Devops |
| Rotation credential | Khi có nghi ngờ lộ (đã làm 2026-11-17) | Dev Director |

## 6. Trạng thái checklist

- **§3 #7 Backup thường xuyên / restore test**: ⏳ — đã có tài liệu + lệnh, **chưa chạy restore thật** (cần credential mới + `pg_dump` trên máy bạn).
- **§5 #14 Backup thường xuyên, restore test**: ⏳ — như trên.

> Không tick ✅ cho đến khi có output thật của `pg_dump` + `pg_restore` + verify queries.
