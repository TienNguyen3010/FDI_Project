-- -----------------------------------------------------------------------------
-- 005_works_sla.sql — Bản 2, checklist §5 #15 (SLA / MTTR / % vi phạm)
-- Chạy trong Supabase SQL Editor. Idempotent: có thể chạy lại nhiều lần.
-- KHÔNG tự động execute — chỉ là source SQL.
-- -----------------------------------------------------------------------------
BEGIN;

-- -----------------------------------------------------------------------------
-- 1. View v_alert_sla — tính SLA cho từng sự cố.
--    - sla_threshold_hours: critical 4h, major 8h, minor 24h.
--    - elapsed_hours: từ created_at đến resolved_at (nếu đã xử lý) hoặc now().
--    - mttr_hours: chỉ có nghĩa với sự cố đã solved/resolved_at NOT NULL.
--    - sla_breached: elapsed > ngưỡng.
--    security_invoker = true để view TUÂN THỦ RLS của bảng alerts (không rò rỉ
--    dữ liệu các dự án mà user không được xem). Yêu cầu PostgreSQL >= 15 (DB: 17).
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_alert_sla;
CREATE VIEW public.v_alert_sla WITH (security_invoker = true) AS
SELECT
  a.id,
  a.project_id,
  a.severity,
  a.status,
  a.owner_id,
  a.created_at,
  a.resolved_at,
  CASE a.severity
    WHEN 'critical' THEN 4
    WHEN 'major'    THEN 8
    WHEN 'minor'    THEN 24
    ELSE NULL
  END AS sla_threshold_hours,
  EXTRACT(EPOCH FROM (COALESCE(a.resolved_at, now()) - a.created_at)) / 3600.0
    AS elapsed_hours,
  CASE
    WHEN a.resolved_at IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (a.resolved_at - a.created_at)) / 3600.0
  END AS mttr_hours,
  (
    EXTRACT(EPOCH FROM (COALESCE(a.resolved_at, now()) - a.created_at)) / 3600.0
    > CASE a.severity
        WHEN 'critical' THEN 4
        WHEN 'major'    THEN 8
        WHEN 'minor'    THEN 24
        ELSE NULL
      END
  ) AS sla_breached
FROM public.alerts a;

COMMENT ON VIEW public.v_alert_sla IS
  'SLA/MTTR theo sự cố (checklist §5 #15). elapsed_hours tới resolved_at hoặc now(); ngưỡng critical 4h/major 8h/minor 24h; security_invoker=true để giữ RLS.';

GRANT SELECT ON public.v_alert_sla TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. Index phục vụ lọc/lookup thường dùng (checklist §5 / §3 #11).
--    Tên mới để không trùng index đơn cột đã có ở 001_initial_schema.sql.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_alerts_status_severity_composite
  ON public.alerts (status, severity);
CREATE INDEX IF NOT EXISTS idx_works_assignee_incident_composite
  ON public.works (assignee_id, incident_id);

-- -----------------------------------------------------------------------------
-- 3. Đăng ký version migration.
-- -----------------------------------------------------------------------------
INSERT INTO public.schema_migrations (version, note)
VALUES ('005_works_sla', 'View v_alert_sla (SLA/MTTR/vi phạm, security_invoker) + index composite alerts(status,severity), works(assignee_id,incident_id)')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Verify nhanh (dán riêng trong SQL Editor):
-- SELECT * FROM public.v_alert_sla ORDER BY created_at DESC LIMIT 10;
-- SELECT version, applied_at FROM public.schema_migrations WHERE version = '005_works_sla';
-- SELECT indexname FROM pg_indexes WHERE indexname IN ('idx_alerts_status_severity_composite','idx_works_assignee_incident_composite');
