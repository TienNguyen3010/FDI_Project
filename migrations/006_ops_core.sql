-- =====================================================================
-- FDI_Project — Migration 006 : Ops core — supplemental schema + RLS cho Dashboard
-- Chạy trong Supabase SQL Editor SAU 001..005. KHÔNG sửa migration đã apply.
-- Idempotent: CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS
--             / ON CONFLICT DO NOTHING / mọi ALTER đều nằm trong DO ... IF NOT EXISTS.
-- Quy ước: UUID PK = gen_random_uuid(); mọi mốc thời gian = TIMESTAMPTZ;
--          BEGIN/COMMIT; KHÔNG đổi cột (ADD COLUMN) của bảng đã có.
-- Nguồn: docs/03-contracts/database/001_core.sql + 002_extended.sql,
--        docs/05-quality/rbac_policy.json (6 role),
--        docs/02-design/DASHBOARD_METRIC_CONTRACT.md (MET-02, MET-04, MET-05).
-- PHẠM VI: bổ sung object MỚI. Bảng cũ giữ nguyên policy của migration 002;
--          mọi bảng MỚI ở đây đều có RLS theo customer scope qua user_grants.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =====================================================================
-- 0. Helpers nền tảng (tự chứa, không phụ thuộc helper của migration 002)
-- =====================================================================

-- uid hiện tại: auth.uid() rồi fallback JWT sub. SECURITY DEFINER + search_path cố định.
CREATE OR REPLACE FUNCTION public.auth_user_id()
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

  BEGIN
    RETURN v::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

COMMENT ON FUNCTION public.auth_user_id() IS
  'Migration 006: uid của request (auth.uid() fallback JWT sub); NULL khi anonymous.';


-- =====================================================================
-- 1. user_grants — scope customer cho RLS (docs rbac_policy.json scope_rules.customer)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_grants (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_id  UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  role_code    TEXT,
  scope        TEXT        NOT NULL DEFAULT 'customer'
                 CONSTRAINT user_grants_scope_check
                   CHECK (scope IN ('customer','site','project','team')),
  valid_from   TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_grants_user_customer_key UNIQUE (user_id, customer_id),
  CONSTRAINT user_grants_validity_check CHECK (valid_to IS NULL OR valid_to > valid_from),
  CONSTRAINT user_grants_role_check CHECK (
    role_code IS NULL OR lower(role_code) IN (
      'super_admin','director','project_manager','engineer','support','customer_viewer'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_user_grants_user    ON public.user_grants (user_id);
CREATE INDEX IF NOT EXISTS idx_user_grants_customer ON public.user_grants (customer_id);
CREATE INDEX IF NOT EXISTS idx_user_grants_active   ON public.user_grants (user_id, customer_id)
  WHERE valid_to IS NULL;

COMMENT ON TABLE public.user_grants IS
  'Migration 006: map user -> customer scope (docs rbac_policy.json scope_rules). role_code là role v1.0 (6 giá trị); NULL = chỉ cấp scope, không cấp role.';
COMMENT ON COLUMN public.user_grants.role_code IS
  'Role v1.0 theo rbac_policy.json: super_admin/director/project_manager/engineer/support/customer_viewer. Role grant KHÔNG override resource scope.';


-- =====================================================================
-- 2. Project baseline weight + accepted completion fraction (MET-02)
--    Implement dạng BẢNG MỚI — không ALTER/projects (giữ nguyên cột bảng cũ).
--    Công thức: SUM(approved baseline weight × accepted completion fraction)
--               / SUM(eligible baseline weights).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.project_baselines (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID         NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  customer_id     UUID         NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  baseline_weight NUMERIC(12,3) NOT NULL
                  CONSTRAINT project_baselines_weight_check CHECK (baseline_weight > 0),
  approved        BOOLEAN      NOT NULL DEFAULT FALSE,
  approved_by     UUID         REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  effective_from  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  effective_to    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT project_baselines_effective_check
    CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT project_baselines_approval_check
    CHECK ((approved = FALSE) OR (approved = TRUE AND approved_at IS NOT NULL)),
  CONSTRAINT project_baselines_project_effective_key
    UNIQUE (project_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_project_baselines_customer
  ON public.project_baselines (customer_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_project_baselines_approved
  ON public.project_baselines (project_id) WHERE approved AND effective_to IS NULL;

COMMENT ON TABLE public.project_baselines IS
  'Migration 006 / MET-02: baseline TRỌNG SỐ đã duyệt của project. "approved baseline weight" ở tử số và "eligible baseline weights" ở mẫu số. Baseline mới tạo mặc định approved=FALSE cần PO duyệt.';
COMMENT ON COLUMN public.project_baselines.baseline_weight IS
  'Trọng số baseline ( > 0 ). Cần Product Owner sign-off về cách weighting theo DASHBOARD_METRIC_CONTRACT.md Open questions.';


CREATE TABLE IF NOT EXISTS public.acceptance_fractions (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID         NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  customer_id       UUID         NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  baseline_id       UUID         REFERENCES public.project_baselines(id) ON DELETE SET NULL,
  accepted_fraction NUMERIC(5,4) NOT NULL
                    CONSTRAINT acceptance_fraction_range_check
                      CHECK (accepted_fraction >= 0 AND accepted_fraction <= 1),
  as_of             TIMESTAMPTZ  NOT NULL DEFAULT now(),
  recorded_by       UUID         REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acceptance_fractions_project_asof
  ON public.acceptance_fractions (project_id, as_of DESC);
CREATE INDEX IF NOT EXISTS idx_acceptance_fractions_customer
  ON public.acceptance_fractions (customer_id);

COMMENT ON TABLE public.acceptance_fractions IS
  'Migration 006 / MET-02: accepted completion fraction (0..1) theo thời điểm as_of. Latest accepted state as of period end; dùng chung với project_baselines để tính weighted progress.';


-- View read-model cho MET-02. security_invoker=true → vẫn chịu RLS của 2 bảng nguồn (PG >= 15).
DROP VIEW IF EXISTS public.v_project_progress_baseline;
CREATE VIEW public.v_project_progress_baseline WITH (security_invoker = true) AS
SELECT
  b.project_id,
  b.customer_id,
  SUM(b.baseline_weight) AS eligible_baseline_weight,
  SUM(b.baseline_weight * COALESCE(af.accepted_fraction, 0))
    / NULLIF(SUM(b.baseline_weight), 0) AS weighted_progress,
  COUNT(af.id) AS acceptance_records
FROM public.project_baselines b
LEFT JOIN LATERAL (
  SELECT af.id, af.accepted_fraction
  FROM public.acceptance_fractions af
  WHERE af.baseline_id = b.id
  ORDER BY af.as_of DESC
  LIMIT 1
) af ON TRUE
WHERE b.approved AND b.effective_to IS NULL
GROUP BY b.project_id, b.customer_id;

COMMENT ON VIEW public.v_project_progress_baseline IS
  'Migration 006 / MET-02: weighted progress = SUM(weight × latest accepted_fraction)/SUM(weight) trên baseline đã duyệt. Không có baseline -> không có row (null), KHÔNG trả 0 (invariant #3). security_invoker=true giữ RLS.';


-- =====================================================================
-- 3. SLA cho dashboard (MET-04/MET-05) — ILLUSTRATIVE
--    CẢNH BÁO: đây chỉ là scaffold minh hoạ. Ngưỡng risk, business calendar,
--    pause rule và policy chính thức CHƯA được Product Owner phê duyệt
--    (xem DASHBOARD_METRIC_CONTRACT.md → Open questions). Không dùng làm
--    nguồn tính SLA production khi chưa có sign-off.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.sla_state (
  code        TEXT    PRIMARY KEY,
  label       TEXT    NOT NULL,
  description TEXT,
  is_open     BOOLEAN NOT NULL DEFAULT TRUE,
  is_terminal BOOLEAN NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE public.sla_state IS
  'ILLUSTRATIVE (migration 006): bảng lookup trạng thái SLA minh hoạ cho MET-04/MET-05. Các code/ngưỡng CHƯA được PO phê duyệt — KHÔNG phải policy production.';

INSERT INTO public.sla_state (code, label, description, is_open, is_terminal) VALUES
  ('policy_missing', 'No policy',  'ILLUSTRATIVE: chưa có policy áp dụng', TRUE,  FALSE),
  ('running',        'Running',    'ILLUSTRATIVE: đồng hồ SLA đang chạy',   TRUE,  FALSE),
  ('at_risk',        'At risk',    'ILLUSTRATIVE: trong ngưỡng risk (MET-04)', TRUE, FALSE),
  ('breached',       'Breached',   'ILLUSTRATIVE: quá hạn (MET-05)',        TRUE,  FALSE),
  ('paused',         'Paused',     'ILLUSTRATIVE: tạm dừng theo pause rule', TRUE, FALSE),
  ('met',            'Met',        'ILLUSTRATIVE: đạt SLA',                 FALSE, TRUE),
  ('cancelled',      'Cancelled',  'ILLUSTRATIVE: huỷ instance',            FALSE, TRUE)
ON CONFLICT (code) DO NOTHING;


CREATE TABLE IF NOT EXISTS public.sla_instances (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  ticket_id    UUID        NOT NULL,
  state_code   TEXT        NOT NULL REFERENCES public.sla_state(code),
  policy_code  TEXT,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at       TIMESTAMPTZ,
  risk_at      TIMESTAMPTZ,
  breached_at  TIMESTAMPTZ,
  met_at       TIMESTAMPTZ,
  paused_total INTERVAL    NOT NULL DEFAULT INTERVAL '0',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sla_instances_customer_state
  ON public.sla_instances (customer_id, state_code);
CREATE INDEX IF NOT EXISTS idx_sla_instances_ticket
  ON public.sla_instances (ticket_id);
CREATE INDEX IF NOT EXISTS idx_sla_instances_open_due
  ON public.sla_instances (due_at) WHERE state_code IN ('running','at_risk','breached');
-- ticket_id cố tình KHÔNG có FK: schema docs dùng tickets(id), DB đã apply dùng alerts(id).
-- Liên kết logic do tầng app/PO quyết định sau khi chốt contract.

COMMENT ON TABLE public.sla_instances IS
  'ILLUSTRATIVE (migration 006): instance đồng hồ SLA cho MET-04 (at_risk) / MET-05 (breached). MET-04 và MET-05 phải disjoint theo instance (invariant #2). Ngưỡng risk/calendar/pause CHƯA sign-off — KHÔNG phải policy production.';
COMMENT ON COLUMN public.sla_instances.state_code IS
  'ILLUSTRATIVE: tham chiếu public.sla_state. Không suy ra từ browser time (invariant #7).';
COMMENT ON COLUMN public.sla_instances.ticket_id IS
  'Tham chiếu LOGICAL tới ticket/alert; không FK vì schema v1.0 (tickets) và DB đã apply (alerts) khác nhau.';


-- =====================================================================
-- 4. Helper scope + 6 role check (rbac_policy.json)
-- =====================================================================

-- Customer IDs mà request hiện tại được phép thấy qua user_grants (còn hiệu lực).
CREATE OR REPLACE FUNCTION public.auth_customer_ids()
RETURNS TABLE (customer_id UUID)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := public.auth_user_id();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT DISTINCT g.customer_id
    FROM public.user_grants g
    WHERE g.user_id = v_uid
      AND (g.valid_to IS NULL OR g.valid_to > now());
END;
$$;

COMMENT ON FUNCTION public.auth_customer_ids() IS
  'Migration 006: set customer_id được cấp cho uid hiện tại qua user_grants (unless hết hạn). Dùng trong mọi RLS policy của bảng mới.';


-- Roles v1.0 của request: từ user_grants.role_code + JWT app_metadata.role.
CREATE OR REPLACE FUNCTION public.auth_roles()
RETURNS SETOF TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  UUID := public.auth_user_id();
  v_role TEXT;
BEGIN
  IF v_uid IS NOT NULL THEN
    RETURN QUERY
      SELECT DISTINCT lower(g.role_code)
      FROM public.user_grants g
      WHERE g.user_id = v_uid
        AND g.role_code IS NOT NULL
        AND (g.valid_to IS NULL OR g.valid_to > now());
  END IF;

  BEGIN
    v_role := lower(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb
                    -> 'app_metadata' ->> 'role');
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;

  IF v_role IN ('super_admin','director','project_manager','engineer','support','customer_viewer') THEN
    RETURN NEXT v_role;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_has_role(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ SELECT lower(p_role) = ANY (ARRAY(SELECT public.auth_roles())) $$;

-- 6 role check theo đúng tên role trong rbac_policy.json.
CREATE OR REPLACE FUNCTION public.is_super_admin()       RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$ SELECT public.auth_has_role('super_admin') $$;
CREATE OR REPLACE FUNCTION public.is_director()          RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$ SELECT public.auth_has_role('director') $$;
CREATE OR REPLACE FUNCTION public.is_project_manager()   RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$ SELECT public.auth_has_role('project_manager') $$;
CREATE OR REPLACE FUNCTION public.is_engineer()          RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$ SELECT public.auth_has_role('engineer') $$;
CREATE OR REPLACE FUNCTION public.is_support()           RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$ SELECT public.auth_has_role('support') $$;
CREATE OR REPLACE FUNCTION public.is_customer_viewer()   RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$ SELECT public.auth_has_role('customer_viewer') $$;

COMMENT ON FUNCTION public.is_super_admin()     IS 'Migration 006 / rbac_policy.json: role super_admin (bypass scope — break-glass cần audit riêng).';
COMMENT ON FUNCTION public.is_director()        IS 'Migration 006 / rbac_policy.json: role director.';
COMMENT ON FUNCTION public.is_project_manager() IS 'Migration 006 / rbac_policy.json: role project_manager.';
COMMENT ON FUNCTION public.is_engineer()        IS 'Migration 006 / rbac_policy.json: role engineer.';
COMMENT ON FUNCTION public.is_support()         IS 'Migration 006 / rbac_policy.json: role support.';
COMMENT ON FUNCTION public.is_customer_viewer() IS 'Migration 006 / rbac_policy.json: role customer_viewer.';


-- =====================================================================
-- 5. RLS — mọi bảng MỚI đều enable + policy theo customer scope qua user_grants
--    super_admin bypass; mọi role khác bị giới hạn bởi auth_customer_ids().
-- =====================================================================

ALTER TABLE public.user_grants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_baselines   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acceptance_fractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_state           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_instances       ENABLE ROW LEVEL SECURITY;

-- user_grants: user đọc grant của chính mình; chỉ super_admin ghi.
DROP POLICY IF EXISTS ops_user_grants_select ON public.user_grants;
CREATE POLICY ops_user_grants_select ON public.user_grants FOR SELECT TO authenticated
  USING (user_id = public.auth_user_id() OR public.is_super_admin());

DROP POLICY IF EXISTS ops_user_grants_write ON public.user_grants;
CREATE POLICY ops_user_grants_write ON public.user_grants FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- project_baselines: đọc theo scope; ghi bởi super_admin/director/project_manager.
DROP POLICY IF EXISTS ops_project_baselines_select ON public.project_baselines;
CREATE POLICY ops_project_baselines_select ON public.project_baselines FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR customer_id IN (SELECT customer_id FROM public.auth_customer_ids())
  );

DROP POLICY IF EXISTS ops_project_baselines_write ON public.project_baselines;
CREATE POLICY ops_project_baselines_write ON public.project_baselines FOR ALL TO authenticated
  USING (
    (public.is_super_admin() OR public.is_director() OR public.is_project_manager())
    AND (public.is_super_admin()
         OR customer_id IN (SELECT customer_id FROM public.auth_customer_ids()))
  )
  WITH CHECK (
    (public.is_super_admin() OR public.is_director() OR public.is_project_manager())
    AND (public.is_super_admin()
         OR customer_id IN (SELECT customer_id FROM public.auth_customer_ids()))
  );

-- acceptance_fractions: đọc theo scope; ghi bởi super_admin/director/project_manager/engineer.
DROP POLICY IF EXISTS ops_acceptance_fractions_select ON public.acceptance_fractions;
CREATE POLICY ops_acceptance_fractions_select ON public.acceptance_fractions FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR customer_id IN (SELECT customer_id FROM public.auth_customer_ids())
  );

DROP POLICY IF EXISTS ops_acceptance_fractions_write ON public.acceptance_fractions;
CREATE POLICY ops_acceptance_fractions_write ON public.acceptance_fractions FOR ALL TO authenticated
  USING (
    (public.is_super_admin() OR public.is_director()
     OR public.is_project_manager() OR public.is_engineer())
    AND (public.is_super_admin()
         OR customer_id IN (SELECT customer_id FROM public.auth_customer_ids()))
  )
  WITH CHECK (
    (public.is_super_admin() OR public.is_director()
     OR public.is_project_manager() OR public.is_engineer())
    AND (public.is_super_admin()
         OR customer_id IN (SELECT customer_id FROM public.auth_customer_ids()))
  );

-- sla_state: lookup — authenticated đọc; chỉ super_admin ghi.
DROP POLICY IF EXISTS ops_sla_state_select ON public.sla_state;
CREATE POLICY ops_sla_state_select ON public.sla_state FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS ops_sla_state_write ON public.sla_state;
CREATE POLICY ops_sla_state_write ON public.sla_state FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- sla_instances: đọc theo scope; ghi bởi support/engineer/director/super_admin.
DROP POLICY IF EXISTS ops_sla_instances_select ON public.sla_instances;
CREATE POLICY ops_sla_instances_select ON public.sla_instances FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR customer_id IN (SELECT customer_id FROM public.auth_customer_ids())
  );

DROP POLICY IF EXISTS ops_sla_instances_write ON public.sla_instances;
CREATE POLICY ops_sla_instances_write ON public.sla_instances FOR ALL TO authenticated
  USING (
    (public.is_super_admin() OR public.is_director()
     OR public.is_support() OR public.is_engineer())
    AND (public.is_super_admin()
         OR customer_id IN (SELECT customer_id FROM public.auth_customer_ids()))
  )
  WITH CHECK (
    (public.is_super_admin() OR public.is_director()
     OR public.is_support() OR public.is_engineer())
    AND (public.is_super_admin()
         OR customer_id IN (SELECT customer_id FROM public.auth_customer_ids()))
  );


-- =====================================================================
-- 6. Privileges — browser dùng anon key nên phải GRANT cả anon.
-- =====================================================================

REVOKE ALL ON FUNCTION public.auth_user_id()      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_customer_ids()  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_roles()         FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_has_role(TEXT)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin()     FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_director()        FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_project_manager() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_engineer()        FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_support()         FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_customer_viewer() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.auth_user_id()      TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_customer_ids()  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_roles()         TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_has_role(TEXT)  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin()     TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_director()        TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_project_manager() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_engineer()        TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_support()         TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_customer_viewer() TO anon, authenticated, service_role;

GRANT SELECT ON public.v_project_progress_baseline TO authenticated;


-- =====================================================================
-- 7. Đăng ký version (guard: bảng có thể không tồn tại nếu chạy trên schema docs)
-- =====================================================================

DO $$
BEGIN
  IF to_regclass('public.schema_migrations') IS NOT NULL THEN
    INSERT INTO public.schema_migrations (version, note)
    VALUES (
      '006_ops_core',
      'Ops core cho dashboard: user_grants, project_baselines+acceptance_fractions (MET-02), sla_instances+sla_state (ILLUSTRATIVE MET-04/05), auth_customer_ids, 6 role check, RLS theo customer scope'
    )
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------
-- Verify nhanh (dán riêng trong SQL Editor):
-- SELECT tablename FROM pg_tables WHERE schemaname='public'
--   AND tablename IN ('user_grants','project_baselines','acceptance_fractions','sla_state','sla_instances')
--   ORDER BY tablename;                                           -- kỳ vọng 5
-- SELECT relname, relrowsecurity FROM pg_class
--   WHERE relnamespace='public'::regnamespace AND relkind='r'
--     AND relname IN ('user_grants','project_baselines','acceptance_fractions','sla_state','sla_instances')
--   ORDER BY relname;                                             -- relrowsecurity = true
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname='public'
--   AND tablename IN ('user_grants','project_baselines','acceptance_fractions','sla_state','sla_instances')
--   ORDER BY tablename, policyname;                               -- kỳ vọng 10 policy
-- SELECT code FROM public.sla_state ORDER BY code;               -- kỳ vọng 7 (ILLUSTRATIVE)
-- SELECT proname FROM pg_proc WHERE proname IN (
--   'auth_user_id','auth_customer_ids','auth_roles','auth_has_role',
--   'is_super_admin','is_director','is_project_manager','is_engineer','is_support','is_customer_viewer'
-- ) ORDER BY proname;                                             -- kỳ vọng 10 helper
-- SELECT version, applied_at FROM public.schema_migrations WHERE version='006_ops_core';
-- ---------------------------------------------------------------------
