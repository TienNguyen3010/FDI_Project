-- 009_customer_create_hardening.sql — super_admin RLS whitelist + consent_contact (DNC).
-- Idempotent; chạy trực tiếp trong Supabase SQL Editor. Không đổi policy RLS khác, không DROP function.
-- Chạy sau 008_customer_create_fields.sql.
BEGIN;

-- ---------------------------------------------------------------------
-- (a) fdi_current_role(): copy nguyên thân từ 002, chỉ mở rộng whitelist
--     JWT path thêm 'super_admin'. Logic JWT/fallback DB giữ nguyên.
--     Signature không đổi (TEXT, no args) → CREATE OR REPLACE, không DROP.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fdi_current_role()
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v   TEXT;
  uid UUID;
BEGIN
  BEGIN
    v := lower(coalesce(
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() ->> 'app_role'
    ));
  EXCEPTION WHEN OTHERS THEN
    v := NULL;
  END;

  IF v IS NULL THEN
    BEGIN
      v := lower(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb
                   -> 'app_metadata' ->> 'role');
    EXCEPTION WHEN OTHERS THEN
      v := NULL;
    END;
  END IF;

  IF v IS NULL OR v NOT IN ('employee','leader','manager','director','super_admin') THEN
    v := NULL;
  END IF;

  IF v IS NULL THEN
    uid := public.fdi_current_user_id();
    IF uid IS NOT NULL THEN
      BEGIN
        SELECT u.role INTO v FROM public.users u
         WHERE u.id = uid AND u.active = TRUE LIMIT 1;
      EXCEPTION WHEN OTHERS THEN
        v := NULL;
      END;
    END IF;
  END IF;

  RETURN coalesce(lower(v), 'anon');
END;
$$;

-- ---------------------------------------------------------------------
-- (b) fdi_is_manager_plus(): super_admin cũng tính manager+.
--     Signature không đổi (BOOLEAN, no args) → CREATE OR REPLACE, không DROP.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fdi_is_manager_plus()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ SELECT public.fdi_current_role() IN ('manager','director','super_admin') $$;

-- ---------------------------------------------------------------------
-- (c) consent_contact columns (DNC) trên public.customers.
-- ---------------------------------------------------------------------
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS consent_contact BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS consent_contact_at TIMESTAMPTZ;

-- (d) Comment giải thích ngữ nghĩa DNC.
COMMENT ON COLUMN public.customers.consent_contact IS 'Customer consent for outbound contact (DNC). false = không được liên hệ.';

-- (e) Đăng ký version migration.
INSERT INTO public.schema_migrations (version, note)
VALUES ('009_customer_create_hardening', 'super_admin RLS whitelist + consent_contact (DNC) columns on customers')
ON CONFLICT (version) DO NOTHING;

COMMIT;
