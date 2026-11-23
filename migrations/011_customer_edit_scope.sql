-- 011_customer_edit_scope.sql — Khớp 2 đầu: RBAC client ↔ RLS DB cho việc SỬA khách hàng.
--
-- Vấn đề phát hiện 2026-11-23 (khi nút Sửa đã bật):
--   * Client cấp `customer.update` cho director + project_manager + super_admin
--     (lib/rbac/policy.core.mjs) → nút Sửa hiện, form tải bằng GET /api/v1/customers/[id].
--   * RLS customers_select dùng fdi_can_read(): nhánh "toàn công ty" chỉ có
--     director/manager → project_manager trả rỗng → ô Mã không hiện khi sửa.
--   * RLS customers_update dùng fdi_is_leader_plus() = leader/manager/director/super_admin
--     → project_manager sửa bị DB từ chối dù client đã cho quyền (hai đầu lệch).
--
-- Cách sửa: giữ NGUYÊN toàn bộ thân hàm, chỉ nới tập role. Idempotent.
-- KHÔNG đổi ý đồ phân quyền khác (delete vẫn manager+).

BEGIN;

-- ---------------------------------------------------------------------
-- 1) fdi_can_read(): nới nhánh "đọc toàn công ty" sang director/manager/project_manager.
--    Thân hàm copy nguyên từ 002, chỉ sửa 1 dòng IF.
-- ---------------------------------------------------------------------
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
  IF r IN ('director','manager','project_manager') THEN
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

-- ---------------------------------------------------------------------
-- 2) fdi_is_leader_plus(): thêm project_manager (super_admin đã có từ 009).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fdi_is_leader_plus()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$ SELECT public.fdi_current_role() IN ('leader','manager','director','project_manager','super_admin') $fn$;

REVOKE ALL ON FUNCTION public.fdi_is_leader_plus() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fdi_is_leader_plus() TO authenticated, anon, service_role;

-- ---------------------------------------------------------------------
-- 3) customers_update: mở sang tập trên, giữ điều kiện phạm vi đọc.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS fdi_customers_update ON public.customers;
CREATE POLICY fdi_customers_update ON public.customers FOR UPDATE TO authenticated
  USING (public.fdi_is_leader_plus()
         AND public.fdi_can_read(NULL, id, NULL, NULL, NULL, NULL))
  WITH CHECK (public.fdi_is_leader_plus()
         AND public.fdi_can_read(NULL, id, NULL, NULL, NULL, NULL));

INSERT INTO public.schema_migrations (version, note)
VALUES ('011_customer_edit_scope', 'RLS khop RBAC: fdi_can_read + fdi_is_leader_plus co project_manager; customers_update mo projected scope')
ON CONFLICT (version) DO NOTHING;

COMMIT;
