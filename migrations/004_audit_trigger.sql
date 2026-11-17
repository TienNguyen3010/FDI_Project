-- FDI_Project — 004_audit_trigger.sql
-- Tự động ghi audit_logs khi INSERT/UPDATE/DELETE trên các bảng nghiệp vụ.
-- Chạy trực tiếp trong Supabase SQL Editor (không dùng psql meta-command).
-- Idempotent: CREATE OR REPLACE / DROP TRIGGER IF EXISTS / ADD COLUMN IF NOT EXISTS
-- (dùng DO $$ ... IF NOT EXISTS $$ vì ALTER TABLE ... ADD COLUMN IF NOT EXISTS
--  không đáng tin trên mọi phiên bản Postgres).

BEGIN;

-- ---------------------------------------------------------------------
-- 0. Cột lưu diff OLD/NEW (bảng audit_logs đã có từ 001, chưa có cột này)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
      AND column_name = 'changes'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN changes JSONB;
  END IF;
END $$;

COMMENT ON COLUMN public.audit_logs.changes IS
  'Diff OLD/NEW dạng JSONB. INSERT/DELETE: toàn bộ bản ghi; UPDATE: {cot: {old, new}} cho các cột đổi (bỏ qua updated_at).';

-- ---------------------------------------------------------------------
-- 1. Hàm trigger dùng chung (SECURITY DEFINER, search_path cố định)
--    - user_id lấy từ auth.uid(); fallback NULL.
--    - KHÔNG lưu IP/user_agent thật nếu không có trong JWT claims -> NULL.
--    - Nếu user_id NULL (service role / seed / cron) thì BỎ QUA log để
--      không vi phạm constraint NOT NULL và không làm hỏng thao tác nghiệp vụ.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fdi_audit_write_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id    UUID;
  v_action     TEXT;
  v_resource_id UUID;
  v_changes    JSONB := '{}'::JSONB;
  v_claims     JSONB;
  v_ip         TEXT;
  v_user_agent TEXT;
  v_old        JSONB;
  v_new        JSONB;
  r            RECORD;
BEGIN
  -- user từ JWT (auth.uid()). Bọc để không bao giờ làm DML business fail.
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  v_action := TG_OP;

  -- resource_id: OLD cho DELETE, NEW cho INSERT/UPDATE
  IF TG_OP = 'DELETE' THEN
    v_resource_id := (to_jsonb(OLD) ->> 'id')::UUID;
  ELSE
    v_resource_id := (to_jsonb(NEW) ->> 'id')::UUID;
  END IF;

  -- ip/user_agent: chỉ lấy từ request.jwt.claims nếu có; else NULL.
  BEGIN
    v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::JSONB;
  EXCEPTION WHEN OTHERS THEN
    v_claims := NULL;
  END;
  IF v_claims IS NOT NULL THEN
    v_ip         := NULLIF(v_claims ->> 'ip', '');
    v_user_agent := NULLIF(v_claims ->> 'user_agent', '');
  END IF;

  -- Diff OLD/NEW
  IF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    FOR r IN SELECT k AS key FROM jsonb_object_keys(v_new) AS t(k) LOOP
      IF r.key <> 'updated_at'
         AND (v_old -> r.key) IS DISTINCT FROM (v_new -> r.key) THEN
        v_changes := v_changes || jsonb_build_object(
          r.key,
          jsonb_build_object('old', v_old -> r.key, 'new', v_new -> r.key)
        );
      END IF;
    END LOOP;
  ELSIF TG_OP = 'INSERT' THEN
    v_changes := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := to_jsonb(OLD);
  END IF;

  -- Không có actor -> bỏ qua (audit_logs.user_id là NOT NULL + FK).
  IF v_user_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  -- Audit là best-effort: lỗi (VD user_id không có row trong public.users -> vi phạm FK)
  -- KHÔNG ĐƯỢC làm rollback thao tác nghiệp vụ.
  BEGIN
    INSERT INTO public.audit_logs
      (user_id, action, resource_type, resource_id, ip, user_agent, changes, created_at)
    VALUES
      (v_user_id, v_action, TG_TABLE_NAME, v_resource_id, v_ip, v_user_agent, v_changes, now());
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fdi_audit_write_log: bỏ qua log audit (%/%), %',
      TG_TABLE_NAME, TG_OP, SQLERRM;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fdi_audit_write_log() IS
  'Audit AFTER INSERT/UPDATE/DELETE trên bảng nghiệp vụ; ghi user_id=auth.uid(), action=TG_OP, resource_type=TG_TABLE_NAME, changes=diff OLD/NEW. Bỏ qua khi không có actor.';

-- ---------------------------------------------------------------------
-- 2. Gắn trigger cho 11 bảng nghiệp vụ (không gắn vào audit_logs -> tránh đệ quy)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'customers','sites','projects','devices','alerts',
    'maintenances','works','reports','documents','config','users'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_audit ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.fdi_audit_write_log()', t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 3. Đăng ký version migration
-- ---------------------------------------------------------------------
INSERT INTO public.schema_migrations (version, note)
VALUES ('004_audit_trigger', 'Trigger audit AFTER INSERT/UPDATE/DELETE trên 11 bảng + cột changes JSONB')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Verify nhanh (dán riêng trong SQL Editor):
-- SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'trg_%_audit';  -- kỳ vọng 11
-- SELECT action, resource_type, count(*) FROM public.audit_logs GROUP BY 1,2 ORDER BY 1;
