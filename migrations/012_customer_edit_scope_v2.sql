-- 012_customer_edit_scope_v2.sql — SỬA GỐC lỗi "Mã KH không hiện khi sửa khách hàng".
--
-- NGUYÊN NHÂN GỐC (migration 011 CHƯA sửa hết):
--   public.fdi_current_role() có nhánh lọc JWT:
--       IF v IS NULL OR v NOT IN ('employee','leader','manager','director','super_admin') THEN v := NULL;
--   Role JWT 'project_manager' KHÔNG nằm trong whitelist → bị đánh thành NULL.
--   Sau đó fallback đọc public.users.role (bảng users chỉ có 4 role legacy, KHÔNG có
--   project_manager) → vẫn NULL → fdi_current_role() trả 'anon'.
--   Hệ quả: fdi_can_read(NULL, id, NULL, NULL, NULL, NULL) = FALSE (dù 011 đã nới
--   nhánh toàn công ty sang 'director','manager','project_manager') → policy
--   customers_select chặn → GET /api/v1/customers/[id] trả 404/rỗng → form sửa
--   không có `code` → ô "Mã KH" hiển thị trống / "—".
--   RBAC client (lib/rbac/policy.core.mjs) vẫn CẤP customer.read/customer.update cho
--   project_manager → nút Sửa hiện, nhưng DB từ chối → hai đầu lệch.
--
-- CÁCH SỬA (idempotent, KHÔNG DROP function/policy đã có):
--   1) CREATE OR REPLACE fdi_current_role(): copy NGUYÊN thân từ 009, CHỈ mở rộng
--      whitelist JWT thêm 'project_manager'. Giữ nguyên logic fallback public.users.
--   2) Copy NGUYÊN thân fdi_can_read() từ 011 (nhánh toàn công ty đã có PM) + grant.
--   3) Copy NGUYÊN thân fdi_is_leader_plus() từ 011 + grant.
--   4) Tạo lại policy fdi_customers_update chuẩn 011 (DROP POLICY IF EXISTS + CREATE).
--   5) Thêm RPC DỰ PHÒNG public.fdi_get_customer_code(UUID) để lấy mã khi GET detail
--      vẫn bị chặn. QUAN TRỌNG: RPC KHÔNG lách RLS — nó kiểm tra đúng
--      fdi_can_read(NULL, p_customer_id, NULL, NULL, NULL, NULL) rồi mới trả code.
--      Nguồn chân lý vẫn là GET /api/v1/customers/[id]; RPC chỉ là lối thoát dự phòng.
--
-- ⚠️ APPLY THỦ CÔNG bằng Supabase SQL Editor (agent không có quyền DB).
-- Thứ tự: chạy sau 009 → 010 → 011.
BEGIN;

-- =====================================================================
-- 1) fdi_current_role(): mở rộng whitelist JWT thêm 'project_manager'.
--    Copy nguyên thân từ 009_customer_create_hardening.sql, chỉ sửa 1 dòng IN (...).
--    Signature không đổi (TEXT, no args) → CREATE OR REPLACE, KHÔNG DROP.
-- =====================================================================
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

  -- 012: thêm 'project_manager' (011 thiếu role này → PM bị coi là anon).
  -- 'super_admin' giữ từ 009. Giữ nguyên phần fallback public.users bên dưới.
  IF v IS NULL OR v NOT IN ('employee','leader','manager','director','super_admin','project_manager') THEN
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

-- Grant copy nguyên từ 002_rls_policies.sql (REVOKE/GRANT EXECUTE fdi_current_role).
REVOKE ALL ON FUNCTION public.fdi_current_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fdi_current_role() TO authenticated, anon, service_role;

-- =====================================================================
-- 2) fdi_can_read(): copy NGUYÊN thân đã sửa của 011 (nhánh toàn công ty
--    = director/manager/project_manager). Không viết lại từ đầu.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.fdi_can_read(
  p_project_id  UUID DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_site_id     UUID DEFAULT NULL,
  p_owner_id    UUID DEFAULT NULL,
  p_assignee_id UUID DEFAULT NULL,
  p_user_id     UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  r      TEXT := public.fdi_current_role();
  uid    UUID := public.fdi_current_user_id();
  myteam TEXT := public.fdi_current_team();
BEGIN
  -- 012: thêm 'super_admin'. RBAC client (lib/rbac/policy.core.mjs) cấp
  -- customer.read cho super_admin (ALL), nhưng nhánh này chỉ có
  -- director/manager/project_manager → admin bị policy fdi_customers_select
  -- chặn → danh sách khách hàng rống dù DB có dữ liệu.
  -- (002 gốc chỉ có director/manager; 009 thêm super_admin cho
  --  fdi_is_manager_plus nhưng QUÊN fdi_can_read.)
  IF r IN ('director','manager','project_manager','super_admin') THEN
    RETURN TRUE;
  END IF;

  IF uid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Đối tượng gắn trực tiếp với mình (mọi role)
  IF p_owner_id = uid OR p_assignee_id = uid OR p_user_id = uid THEN
    RETURN TRUE;
  END IF;

  IF r = 'leader' THEN
    IF p_project_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.projects pr
        LEFT JOIN public.users pm ON pm.id = pr.pm_id
        WHERE pr.id = p_project_id
          AND (pr.pm_id = uid OR pm.team IS NOT DISTINCT FROM myteam)
      ) THEN RETURN TRUE; END IF;
    END IF;
    IF p_customer_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.projects pr
        LEFT JOIN public.users pm ON pm.id = pr.pm_id
        WHERE pr.customer_id = p_customer_id
          AND (pr.pm_id = uid OR pm.team IS NOT DISTINCT FROM myteam)
      ) THEN RETURN TRUE; END IF;
    END IF;
    IF p_site_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.projects pr
        LEFT JOIN public.users pm ON pm.id = pr.pm_id
        WHERE pr.site_id = p_site_id
          AND (pr.pm_id = uid OR pm.team IS NOT DISTINCT FROM myteam)
      ) THEN RETURN TRUE; END IF;
    END IF;
    RETURN FALSE;
  END IF;

  -- employee: chỉ hội dự án được gán
  IF p_project_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.projects pr
                WHERE pr.id = p_project_id AND pr.pm_id = uid) THEN
      RETURN TRUE;
    END IF;
    IF EXISTS (SELECT 1 FROM public.works w
                WHERE w.project_id = p_project_id AND w.assignee_id = uid)
       OR EXISTS (SELECT 1 FROM public.alerts a
                   WHERE a.project_id = p_project_id AND a.owner_id = uid)
       OR EXISTS (SELECT 1 FROM public.reports rp
                WHERE rp.project_id = p_project_id AND rp.user_id = uid) THEN
      RETURN TRUE;
    END IF;
  END IF;

  IF p_customer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.projects pr
    WHERE pr.customer_id = p_customer_id AND pr.pm_id = uid
  ) THEN RETURN TRUE; END IF;

  IF p_site_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.projects pr
    WHERE pr.site_id = p_site_id AND pr.pm_id = uid
  ) THEN RETURN TRUE; END IF;

  RETURN FALSE;
END;
$fn$;

REVOKE ALL ON FUNCTION public.fdi_can_read(UUID,UUID,UUID,UUID,UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fdi_can_read(UUID,UUID,UUID,UUID,UUID,UUID) TO authenticated, anon, service_role;

-- =====================================================================
-- 3) fdi_is_leader_plus(): copy NGUYÊN thân 011 (đã có project_manager).
-- =====================================================================
CREATE OR REPLACE FUNCTION public.fdi_is_leader_plus()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$ SELECT public.fdi_current_role() IN ('leader','manager','director','project_manager','super_admin') $fn$;

REVOKE ALL ON FUNCTION public.fdi_is_leader_plus() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fdi_is_leader_plus() TO authenticated, anon, service_role;

-- =====================================================================
-- 3b) fdi_is_manager_plus(): BỔ SUNG trong 012 — thêm 'project_manager'.
--     CHÍNH SÁCH INSERT/DELETE của customers dùng hàm này:
--       fdi_customers_insert → WITH CHECK (fdi_is_manager_plus())
--     RBAC client (lib/rbac/policy.core.mjs) CẤP customer.create cho
--     director + project_manager + super_admin, nhưng 009 chỉ có
--     ('manager','director','super_admin') → PM bấm Lưu bị DB chặn:
--       "new row violates row-level security policy for table \"customers\""
--     Hai đầu lệch → thêm PM. Copy thân 009, chỉ sửa 1 dòng IN (...).
--     Signature không đổi (BOOLEAN, no args) → CREATE OR REPLACE, KHÔNG DROP.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.fdi_is_manager_plus()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ SELECT public.fdi_current_role() IN ('manager','director','super_admin','project_manager') $$;

REVOKE ALL ON FUNCTION public.fdi_is_manager_plus() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fdi_is_manager_plus() TO authenticated, anon, service_role;

-- =====================================================================
-- 4) fdi_customers_update: tạo lại đúng chuẩn 011 (DROP POLICY IF EXISTS
--    + CREATE POLICY ... USING/WITH CHECK). KHÔNG DROP function.
-- =====================================================================
DROP POLICY IF EXISTS fdi_customers_update ON public.customers;
CREATE POLICY fdi_customers_update ON public.customers FOR UPDATE TO authenticated
  USING (public.fdi_is_leader_plus()
         AND public.fdi_can_read(NULL, id, NULL, NULL, NULL, NULL))
  WITH CHECK (public.fdi_is_leader_plus()
         AND public.fdi_can_read(NULL, id, NULL, NULL, NULL, NULL));

-- =====================================================================
-- 5) RPC DỰ PHÒNG: fdi_get_customer_code(UUID) → TEXT.
--    - SECURITY DEFINER, SET search_path = public, pg_temp.
--    - Chỉ trả code khi public.fdi_can_read(NULL, p_customer_id, ...) = TRUE.
--    - KHÔNG lách RLS: dùng ĐÚNG hàm phạm vi đọc như policy customers_select.
--    - Nguồn chân lý vẫn là GET /api/v1/customers/[id]; RPC chỉ dùng nếu
--      GET detail còn bị RLS chặn. Trả NULL nếu không đọc được.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.fdi_get_customer_code(p_customer_id UUID)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_code TEXT;
BEGIN
  -- Rào quyền đọc giống hệt policy customers_select (fdi_can_read).
  IF NOT public.fdi_can_read(NULL, p_customer_id, NULL, NULL, NULL, NULL) THEN
    RETURN NULL;
  END IF;

  SELECT c.code INTO v_code
    FROM public.customers c
   WHERE c.id = p_customer_id
   LIMIT 1;

  RETURN v_code;  -- NULL nếu khách hàng không tồn tại / chưa có mã
END;
$fn$;

REVOKE ALL ON FUNCTION public.fdi_get_customer_code(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fdi_get_customer_code(UUID) TO authenticated, anon, service_role;

-- =====================================================================
-- 6) Đăng ký version migration.
-- =====================================================================
INSERT INTO public.schema_migrations (version, note)
VALUES ('012_customer_edit_scope_v2', 'SUA GOC: fdi_current_role() whitelist JWT co project_manager (PM truoc bi anon) + RPC du phong fdi_get_customer_code')
ON CONFLICT (version) DO NOTHING;

COMMIT;
