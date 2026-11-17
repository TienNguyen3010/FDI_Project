-- =====================================================================
-- FDI_Project — Migration 002 : Row Level Security + RBAC policies
-- Chạy trong Supabase SQL Editor SAU 001. Idempotent (DROP POLICY IF EXISTS).
-- 4 role: employee / leader / manager / director (rbac_matrix.md).
-- Không hard-code uid. Không đọc cột "role" từ JWT trực tiếp kiểu
--   (auth.jwt()->>'role') làm role app — claim đó là 'authenticated'.
--   'role' của app lấy từ public.users hoặc app_metadata.app_role.
-- Helper SECURITY DEFINER + search_path cố định → tránh đệ quy RLS khi
--   policy trên chính bảng users gọi hàm đọc users.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Helper 1: uid hiện tại (Supabase auth.uid, fallback JWT sub)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fdi_current_user_id()
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v UUID;
BEGIN
  BEGIN
    v := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v := NULL;
  END;

  IF v IS NULL THEN
    BEGIN
      v := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub';
    EXCEPTION WHEN OTHERS THEN
      v := NULL;
    END;
  END IF;

  IF v IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN v::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- ---------------------------------------------------------------------
-- Helper 2: team của user hiện tại (users.team, fallback app_metadata.team)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fdi_current_team()
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v TEXT;
  uid UUID := public.fdi_current_user_id();
BEGIN
  IF uid IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    SELECT u.team INTO v FROM public.users u
     WHERE u.id = uid AND u.active = TRUE LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v := NULL;
  END;

  IF v IS NULL THEN
    BEGIN
      v := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb
             -> 'app_metadata' ->> 'team';
    EXCEPTION WHEN OTHERS THEN
      v := NULL;
    END;
  END IF;

  RETURN v;
END;
$$;

-- ---------------------------------------------------------------------
-- Helper 3: role app hiện tại — an toàn, KHÔNG trả 'authenticated'
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

  IF v IS NULL OR v NOT IN ('employee','leader','manager','director') THEN
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

CREATE OR REPLACE FUNCTION public.fdi_is_director()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ SELECT public.fdi_current_role() = 'director' $$;

CREATE OR REPLACE FUNCTION public.fdi_is_manager_plus()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ SELECT public.fdi_current_role() IN ('manager','director') $$;

CREATE OR REPLACE FUNCTION public.fdi_is_leader_plus()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ SELECT public.fdi_current_role() IN ('leader','manager','director') $$;

-- ---------------------------------------------------------------------
-- Helper 4: phạm vi đọc theo role (rbac_matrix.md §2 & §3)
--   director/manager: toàn công ty / toàn phòng → true
--   leader: dự án của team (pm cùng team) hoặc việc mình làm
--   employee: dự án được gán (pm = mình) hoặc việc/sự cố/báo cáo của mình
-- Nhận project/customer/site/owner/assignee/user để dùng cho mọi bảng.
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
AS $$
DECLARE
  r      TEXT := public.fdi_current_role();
  uid    UUID := public.fdi_current_user_id();
  myteam TEXT := public.fdi_current_team();
BEGIN
  IF r IN ('director','manager') THEN
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

  -- employee: chỉ hộc dự án được gán
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
$$;

REVOKE ALL ON FUNCTION public.fdi_current_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fdi_current_team() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fdi_current_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fdi_is_director() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fdi_is_manager_plus() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fdi_is_leader_plus() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fdi_can_read(UUID,UUID,UUID,UUID,UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fdi_current_user_id() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fdi_current_team() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fdi_current_role() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fdi_is_director() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fdi_is_manager_plus() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fdi_is_leader_plus() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fdi_can_read(UUID,UUID,UUID,UUID,UUID,UUID) TO authenticated, anon, service_role;

-- ---------------------------------------------------------------------
-- Bật RLS toàn bộ bảng (role service_role bypass mặc định trong Supabase)
-- ---------------------------------------------------------------------
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenances     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.works            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- users — Admin: manager/director thêm user, team. Employee/leader: tự xem.
-- =====================================================================
DROP POLICY IF EXISTS fdi_users_select ON public.users;
CREATE POLICY fdi_users_select ON public.users FOR SELECT TO authenticated
  USING (public.fdi_is_manager_plus() OR id = public.fdi_current_user_id());

DROP POLICY IF EXISTS fdi_users_insert ON public.users;
CREATE POLICY fdi_users_insert ON public.users FOR INSERT TO authenticated
  WITH CHECK (public.fdi_is_manager_plus());

DROP POLICY IF EXISTS fdi_users_update ON public.users;
CREATE POLICY fdi_users_update ON public.users FOR UPDATE TO authenticated
  USING (public.fdi_is_manager_plus())
  WITH CHECK (public.fdi_is_manager_plus());

DROP POLICY IF EXISTS fdi_users_delete ON public.users;
CREATE POLICY fdi_users_delete ON public.users FOR DELETE TO authenticated
  USING (public.fdi_is_director());

-- =====================================================================
-- customers — Employee xem; Leader sửa liên hệ; Manager/Director full.
-- =====================================================================
DROP POLICY IF EXISTS fdi_customers_select ON public.customers;
CREATE POLICY fdi_customers_select ON public.customers FOR SELECT TO authenticated
  USING (public.fdi_can_read(NULL, id, NULL, NULL, NULL, NULL));

DROP POLICY IF EXISTS fdi_customers_insert ON public.customers;
CREATE POLICY fdi_customers_insert ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.fdi_is_manager_plus());

DROP POLICY IF EXISTS fdi_customers_update ON public.customers;
CREATE POLICY fdi_customers_update ON public.customers FOR UPDATE TO authenticated
  USING (public.fdi_is_leader_plus()
         AND public.fdi_can_read(NULL, id, NULL, NULL, NULL, NULL))
  WITH CHECK (public.fdi_is_leader_plus()
         AND public.fdi_can_read(NULL, id, NULL, NULL, NULL, NULL));

DROP POLICY IF EXISTS fdi_customers_delete ON public.customers;
CREATE POLICY fdi_customers_delete ON public.customers FOR DELETE TO authenticated
  USING (public.fdi_is_manager_plus());

-- =====================================================================
-- sites — Employee xem; Leader+ lập/sửa; Manager+ xóa.
-- =====================================================================
DROP POLICY IF EXISTS fdi_sites_select ON public.sites;
CREATE POLICY fdi_sites_select ON public.sites FOR SELECT TO authenticated
  USING (public.fdi_can_read(NULL, customer_id, id, NULL, NULL, NULL));

DROP POLICY IF EXISTS fdi_sites_insert ON public.sites;
CREATE POLICY fdi_sites_insert ON public.sites FOR INSERT TO authenticated
  WITH CHECK (public.fdi_is_leader_plus());

DROP POLICY IF EXISTS fdi_sites_update ON public.sites;
CREATE POLICY fdi_sites_update ON public.sites FOR UPDATE TO authenticated
  USING (public.fdi_is_leader_plus()
         AND public.fdi_can_read(NULL, customer_id, id, NULL, NULL, NULL))
  WITH CHECK (public.fdi_is_leader_plus()
         AND public.fdi_can_read(NULL, customer_id, id, NULL, NULL, NULL));

DROP POLICY IF EXISTS fdi_sites_delete ON public.sites;
CREATE POLICY fdi_sites_delete ON public.sites FOR DELETE TO authenticated
  USING (public.fdi_is_manager_plus());

-- =====================================================================
-- projects — Employee xem/cập nhật dự án được gán; Leader tạo/sửa/duyệt
-- checklist; Manager đổi trạng thái; Director xem tất cả + duyệt nghiệm thu.
-- =====================================================================
DROP POLICY IF EXISTS fdi_projects_select ON public.projects;
CREATE POLICY fdi_projects_select ON public.projects FOR SELECT TO authenticated
  USING (public.fdi_can_read(id, customer_id, site_id, NULL, NULL, pm_id));

DROP POLICY IF EXISTS fdi_projects_insert ON public.projects;
CREATE POLICY fdi_projects_insert ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.fdi_is_leader_plus());

DROP POLICY IF EXISTS fdi_projects_update ON public.projects;
CREATE POLICY fdi_projects_update ON public.projects FOR UPDATE TO authenticated
  USING (public.fdi_can_read(id, customer_id, site_id, NULL, NULL, pm_id))
  WITH CHECK (public.fdi_can_read(id, customer_id, site_id, NULL, NULL, pm_id));

DROP POLICY IF EXISTS fdi_projects_delete ON public.projects;
CREATE POLICY fdi_projects_delete ON public.projects FOR DELETE TO authenticated
  USING (public.fdi_is_manager_plus());

-- =====================================================================
-- devices — Employee nhập khi được gán; Leader sửa/duyệt; Manager sửa/xóa;
-- Director chỉ xem (rbac_matrix.md §3).
-- =====================================================================
DROP POLICY IF EXISTS fdi_devices_select ON public.devices;
CREATE POLICY fdi_devices_select ON public.devices FOR SELECT TO authenticated
  USING (public.fdi_can_read(project_id, NULL, site_id, NULL, NULL, NULL));

DROP POLICY IF EXISTS fdi_devices_insert ON public.devices;
CREATE POLICY fdi_devices_insert ON public.devices FOR INSERT TO authenticated
  WITH CHECK (
    public.fdi_can_read(project_id, NULL, site_id, NULL, NULL, NULL)
    AND public.fdi_current_role() IN ('employee','leader','manager')
  );

DROP POLICY IF EXISTS fdi_devices_update ON public.devices;
CREATE POLICY fdi_devices_update ON public.devices FOR UPDATE TO authenticated
  USING (public.fdi_can_read(project_id, NULL, site_id, NULL, NULL, NULL)
         AND public.fdi_current_role() <> 'director')
  WITH CHECK (public.fdi_can_read(project_id, NULL, site_id, NULL, NULL, NULL)
         AND public.fdi_current_role() <> 'director');

DROP POLICY IF EXISTS fdi_devices_delete ON public.devices;
CREATE POLICY fdi_devices_delete ON public.devices FOR DELETE TO authenticated
  USING (public.fdi_is_manager_plus());

-- =====================================================================
-- alerts — Employee nhận & xử lý; Leader giao việc/đóng; Manager duyệt RCA;
-- Director xem báo cáo.
-- =====================================================================
DROP POLICY IF EXISTS fdi_alerts_select ON public.alerts;
CREATE POLICY fdi_alerts_select ON public.alerts FOR SELECT TO authenticated
  USING (public.fdi_can_read(project_id, NULL, site_id, owner_id, NULL, NULL));

DROP POLICY IF EXISTS fdi_alerts_insert ON public.alerts;
CREATE POLICY fdi_alerts_insert ON public.alerts FOR INSERT TO authenticated
  WITH CHECK (
    public.fdi_can_read(project_id, NULL, site_id, owner_id, NULL, NULL)
    AND public.fdi_current_role() <> 'director'
  );

DROP POLICY IF EXISTS fdi_alerts_update ON public.alerts;
CREATE POLICY fdi_alerts_update ON public.alerts FOR UPDATE TO authenticated
  USING (public.fdi_can_read(project_id, NULL, site_id, owner_id, NULL, NULL)
         AND public.fdi_current_role() <> 'director')
  WITH CHECK (public.fdi_can_read(project_id, NULL, site_id, owner_id, NULL, NULL)
         AND public.fdi_current_role() <> 'director');

DROP POLICY IF EXISTS fdi_alerts_delete ON public.alerts;
CREATE POLICY fdi_alerts_delete ON public.alerts FOR DELETE TO authenticated
  USING (public.fdi_is_manager_plus());

-- =====================================================================
-- maintenances — Employee thực hiện; Leader lập lịch; Manager duyệt kế
-- hoạch; Director xem.
-- =====================================================================
DROP POLICY IF EXISTS fdi_maintenances_select ON public.maintenances;
CREATE POLICY fdi_maintenances_select ON public.maintenances FOR SELECT TO authenticated
  USING (public.fdi_can_read(project_id, NULL, NULL, NULL, NULL, NULL));

DROP POLICY IF EXISTS fdi_maintenances_insert ON public.maintenances;
CREATE POLICY fdi_maintenances_insert ON public.maintenances FOR INSERT TO authenticated
  WITH CHECK (public.fdi_can_read(project_id, NULL, NULL, NULL, NULL, NULL)
              AND public.fdi_current_role() <> 'director');

DROP POLICY IF EXISTS fdi_maintenances_update ON public.maintenances;
CREATE POLICY fdi_maintenances_update ON public.maintenances FOR UPDATE TO authenticated
  USING (public.fdi_can_read(project_id, NULL, NULL, NULL, NULL, NULL)
         AND public.fdi_current_role() <> 'director')
  WITH CHECK (public.fdi_can_read(project_id, NULL, NULL, NULL, NULL, NULL)
         AND public.fdi_current_role() <> 'director');

DROP POLICY IF EXISTS fdi_maintenances_delete ON public.maintenances;
CREATE POLICY fdi_maintenances_delete ON public.maintenances FOR DELETE TO authenticated
  USING (public.fdi_is_manager_plus());

-- =====================================================================
-- works — Employee việc của mình; Leader giao cho team; Manager giao cho
-- Leader; Director xem.
-- =====================================================================
DROP POLICY IF EXISTS fdi_works_select ON public.works;
CREATE POLICY fdi_works_select ON public.works FOR SELECT TO authenticated
  USING (public.fdi_can_read(project_id, NULL, NULL, NULL, assignee_id, creator_id));

DROP POLICY IF EXISTS fdi_works_insert ON public.works;
CREATE POLICY fdi_works_insert ON public.works FOR INSERT TO authenticated
  WITH CHECK (public.fdi_is_leader_plus()
              AND public.fdi_can_read(project_id, NULL, NULL, NULL, assignee_id, creator_id));

DROP POLICY IF EXISTS fdi_works_update ON public.works;
CREATE POLICY fdi_works_update ON public.works FOR UPDATE TO authenticated
  USING (public.fdi_can_read(project_id, NULL, NULL, NULL, assignee_id, creator_id)
         AND public.fdi_current_role() <> 'director')
  WITH CHECK (public.fdi_can_read(project_id, NULL, NULL, NULL, assignee_id, creator_id)
         AND public.fdi_current_role() <> 'director');

DROP POLICY IF EXISTS fdi_works_delete ON public.works;
CREATE POLICY fdi_works_delete ON public.works FOR DELETE TO authenticated
  USING (public.fdi_is_manager_plus());

-- =====================================================================
-- reports — Employee tạo; Leader/Manager duyệt; Director xem.
-- =====================================================================
DROP POLICY IF EXISTS fdi_reports_select ON public.reports;
CREATE POLICY fdi_reports_select ON public.reports FOR SELECT TO authenticated
  USING (public.fdi_can_read(project_id, NULL, NULL, NULL, NULL, user_id));

DROP POLICY IF EXISTS fdi_reports_insert ON public.reports;
CREATE POLICY fdi_reports_insert ON public.reports FOR INSERT TO authenticated
  WITH CHECK (public.fdi_current_role() <> 'director'
              AND public.fdi_can_read(project_id, NULL, NULL, NULL, NULL, user_id));

DROP POLICY IF EXISTS fdi_reports_update ON public.reports;
CREATE POLICY fdi_reports_update ON public.reports FOR UPDATE TO authenticated
  USING (public.fdi_can_read(project_id, NULL, NULL, NULL, NULL, user_id)
         AND public.fdi_current_role() <> 'director')
  WITH CHECK (public.fdi_can_read(project_id, NULL, NULL, NULL, NULL, user_id)
         AND public.fdi_current_role() <> 'director');

DROP POLICY IF EXISTS fdi_reports_delete ON public.reports;
CREATE POLICY fdi_reports_delete ON public.reports FOR DELETE TO authenticated
  USING (public.fdi_is_manager_plus());

-- =====================================================================
-- documents — Leader+ quản lý tài liệu; Employee/ director xem.
-- =====================================================================
DROP POLICY IF EXISTS fdi_documents_select ON public.documents;
CREATE POLICY fdi_documents_select ON public.documents FOR SELECT TO authenticated
  USING (public.fdi_can_read(project_id, NULL, NULL, NULL, NULL, NULL));

DROP POLICY IF EXISTS fdi_documents_insert ON public.documents;
CREATE POLICY fdi_documents_insert ON public.documents FOR INSERT TO authenticated
  WITH CHECK (public.fdi_is_leader_plus()
              AND public.fdi_can_read(project_id, NULL, NULL, NULL, NULL, NULL));

DROP POLICY IF EXISTS fdi_documents_update ON public.documents;
CREATE POLICY fdi_documents_update ON public.documents FOR UPDATE TO authenticated
  USING (public.fdi_is_leader_plus()
         AND public.fdi_can_read(project_id, NULL, NULL, NULL, NULL, NULL))
  WITH CHECK (public.fdi_is_leader_plus()
         AND public.fdi_can_read(project_id, NULL, NULL, NULL, NULL, NULL));

DROP POLICY IF EXISTS fdi_documents_delete ON public.documents;
CREATE POLICY fdi_documents_delete ON public.documents FOR DELETE TO authenticated
  USING (public.fdi_is_manager_plus());

-- =====================================================================
-- audit_logs — append-only: mọi authenticated có INSERT (cho trigger/app),
-- chỉ manager/director được đọc; KHÔNG ai UPDATE/DELETE (RBAC §5.3).
-- =====================================================================
DROP POLICY IF EXISTS fdi_audit_logs_select ON public.audit_logs;
CREATE POLICY fdi_audit_logs_select ON public.audit_logs FOR SELECT TO authenticated
  USING (public.fdi_is_manager_plus() OR user_id = public.fdi_current_user_id());

DROP POLICY IF EXISTS fdi_audit_logs_insert ON public.audit_logs;
CREATE POLICY fdi_audit_logs_insert ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (TRUE);

-- =====================================================================
-- config — ai cũng đọc; Manager/Director chỉnh sửa.
-- =====================================================================
DROP POLICY IF EXISTS fdi_config_select ON public.config;
CREATE POLICY fdi_config_select ON public.config FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS fdi_config_insert ON public.config;
CREATE POLICY fdi_config_insert ON public.config FOR INSERT TO authenticated
  WITH CHECK (public.fdi_is_manager_plus());

DROP POLICY IF EXISTS fdi_config_update ON public.config;
CREATE POLICY fdi_config_update ON public.config FOR UPDATE TO authenticated
  USING (public.fdi_is_manager_plus())
  WITH CHECK (public.fdi_is_manager_plus());

DROP POLICY IF EXISTS fdi_config_delete ON public.config;
CREATE POLICY fdi_config_delete ON public.config FOR DELETE TO authenticated
  USING (public.fdi_is_director());

-- schema_migrations: chỉ đọc
DROP POLICY IF EXISTS fdi_schema_migrations_select ON public.schema_migrations;
CREATE POLICY fdi_schema_migrations_select ON public.schema_migrations FOR SELECT TO authenticated
  USING (TRUE);

INSERT INTO public.schema_migrations (version, note)
VALUES ('002_rls_policies', 'Bật RLS 13 bảng + 6 helper + policies 4 role')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Verify nhanh:
-- SELECT relname, relrowsecurity FROM pg_class
--  WHERE relnamespace='public'::regnamespace AND relkind='r' ORDER BY relname; -- relrowsecurity = true
-- SELECT schemaname, tablename, policyname FROM pg_policies
--  WHERE schemaname='public' ORDER BY tablename, policyname;                   -- kỳ vọng 47 policy
-- SELECT public.fdi_current_role();  -- chạy bằng user thường → trả 'employee'/'leader'/... (không phải 'authenticated')
