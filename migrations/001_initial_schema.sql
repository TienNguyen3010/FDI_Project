-- =====================================================================
-- FDI_Project — Migration 001 : Initial Schema
-- Chạy trong Supabase SQL Editor (PostgreSQL 13+/Supabase).
-- Idempotent: CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE / IF NOT EXISTS.
-- Không dùng psql meta-command (\i, \d). Không hard-code uid.
-- Quy ước: UUID PK = gen_random_uuid(); timestamp = TIMESTAMPTZ DEFAULT now();
--          ngày = DATE; JSON linh hoạt = JSONB. Local time hiển thị GMT+7
--          (Asia/Ho_Chi_Minh) ở tầng app; DB lưu UTC qua timestamptz.
-- Nguồn contract: lib/types.ts (tên bảng/cột/enum) + database_schema.sql §3/§6
--                + checklist.md §3 (PK/FK/ENUM/cascade/index/not null/GMT+7).
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- 1. users — người dùng, 4 role, team. (email unique, không seed password)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'employee'
                CONSTRAINT users_role_check
                  CHECK (role IN ('employee','leader','manager','director')),
  team          TEXT,
  active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_email_key UNIQUE (email)
);
COMMENT ON TABLE public.users IS 'Người dùng nội bộ; role: employee/leader/manager/director. password_hash chỉ để tương thích contract — nên chuyển sang Supabase Auth.';

-- ---------------------------------------------------------------------
-- 2. customers — khách hàng (thông tin liên hệ; KHÔNG lưu nhạy cảm)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  phone               TEXT,
  email               TEXT,
  industry            TEXT,
  contact_technical   TEXT,
  contact_commercial  TEXT,
  contact_emergency   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.customers IS 'Khách hàng FDI; chỉ lưu thông tin liên hệ cơ bản, không lưu bank/NDA/mật khẩu thiết bị.';

-- ---------------------------------------------------------------------
-- 3. sites — chi nhánh/site của customer
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sites (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  customer_id   UUID        NOT NULL
                CONSTRAINT sites_customer_id_fkey
                  REFERENCES public.customers(id) ON DELETE CASCADE,
  address       TEXT,
  contact       TEXT,
  working_hours JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.sites IS 'Site/chi nhánh thuộc customer; working_hours lưu JSONB.';

-- ---------------------------------------------------------------------
-- 4. projects — dự án triển khai
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID        NOT NULL
              CONSTRAINT projects_customer_id_fkey
                REFERENCES public.customers(id) ON DELETE CASCADE,
  site_id     UUID
              CONSTRAINT projects_site_id_fkey
                REFERENCES public.sites(id) ON DELETE SET NULL,
  name        TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'planned'
              CONSTRAINT projects_status_check
                CHECK (status IN ('planned','in_progress','deployed','paused','ended')),
  start_date  DATE,
  end_date    DATE,
  progress    NUMERIC(5,2) NOT NULL DEFAULT 0,
  pm_id       UUID
              CONSTRAINT projects_pm_id_fkey
                REFERENCES public.users(id) ON DELETE SET NULL,
  color       TEXT,
  checklist   JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT projects_progress_check CHECK (progress >= 0 AND progress <= 100)
);
COMMENT ON TABLE public.projects IS 'Dự án; status enum 5 giá trị theo types.ts. progress 0..100.';

-- ---------------------------------------------------------------------
-- 5. devices — thiết bị, serial per project, mac unique
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.devices (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID        NOT NULL
                CONSTRAINT devices_project_id_fkey
                  REFERENCES public.projects(id) ON DELETE CASCADE,
  site_id       UUID
                CONSTRAINT devices_site_id_fkey
                  REFERENCES public.sites(id) ON DELETE SET NULL,
  serial        TEXT        NOT NULL,
  type          TEXT        NOT NULL,
  model         TEXT,
  mac_address   TEXT,
  rack_id       TEXT,
  location      TEXT,
  warranty_from DATE,
  warranty_to   DATE,
  status        TEXT        NOT NULL DEFAULT 'active'
                CONSTRAINT devices_status_check
                  CHECK (status IN ('active','inactive','expired')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT devices_project_serial_key UNIQUE (project_id, serial),
  CONSTRAINT devices_mac_address_key UNIQUE (mac_address)
);
COMMENT ON TABLE public.devices IS 'Thiết bị; serial unique theo project, mac_address unique toàn cục; warranty_* dùng DATE.';

-- ---------------------------------------------------------------------
-- 6. alerts — cảnh báo/sự cố (severity + priority enum)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alerts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   UUID
              CONSTRAINT alerts_device_id_fkey
                REFERENCES public.devices(id) ON DELETE SET NULL,
  site_id     UUID
              CONSTRAINT alerts_site_id_fkey
                REFERENCES public.sites(id) ON DELETE SET NULL,
  project_id  UUID        NOT NULL
              CONSTRAINT alerts_project_id_fkey
                REFERENCES public.projects(id) ON DELETE CASCADE,
  severity    TEXT        NOT NULL
              CONSTRAINT alerts_severity_check
                CHECK (severity IN ('critical','major','minor')),
  status      TEXT        NOT NULL,
  priority    TEXT        NOT NULL
              CONSTRAINT alerts_priority_check
                CHECK (priority IN ('low','medium','high','critical')),
  owner_id    UUID
              CONSTRAINT alerts_owner_id_fkey
                REFERENCES public.users(id) ON DELETE SET NULL,
  description TEXT        NOT NULL,
  source      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
COMMENT ON TABLE public.alerts IS 'Cảnh báo/sự cố; severity critical|major|minor, priority low|medium|high|critical. status là TEXT tự do theo types.ts.';

-- ---------------------------------------------------------------------
-- 7. maintenances — bảo trì định kỳ / đột xuất
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maintenances (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id  UUID
             CONSTRAINT maintenances_device_id_fkey
               REFERENCES public.devices(id) ON DELETE SET NULL,
  project_id UUID        NOT NULL
             CONSTRAINT maintenances_project_id_fkey
               REFERENCES public.projects(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL DEFAULT 'regular'
             CONSTRAINT maintenances_type_check
               CHECK (type IN ('regular','emergency')),
  schedule   JSONB,
  due_date   DATE,
  status     TEXT        NOT NULL,
  checklist  JSONB,
  result     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.maintenances IS 'Bảo trì; type regular|emergency; due_date DATE; schedule/checklist JSONB.';

-- ---------------------------------------------------------------------
-- 8. works — công việc (gắn project/incident/assignee/creator)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.works (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL
              CONSTRAINT works_project_id_fkey
                REFERENCES public.projects(id) ON DELETE CASCADE,
  incident_id UUID
              CONSTRAINT works_incident_id_fkey
                REFERENCES public.alerts(id) ON DELETE SET NULL,
  assignee_id UUID
              CONSTRAINT works_assignee_id_fkey
                REFERENCES public.users(id) ON DELETE SET NULL,
  creator_id  UUID
              CONSTRAINT works_creator_id_fkey
                REFERENCES public.users(id) ON DELETE SET NULL,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  description TEXT,
  status      TEXT        NOT NULL,
  priority    TEXT        NOT NULL,
  due_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.works IS 'Công việc; incident_id trỏ alerts(id). status/priority/type là TEXT tự do theo types.ts.';

-- ---------------------------------------------------------------------
-- 9. reports — báo cáo hiện trường (site report)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL
             CONSTRAINT reports_project_id_fkey
               REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL
             CONSTRAINT reports_user_id_fkey
               REFERENCES public.users(id) ON DELETE RESTRICT,
  type       TEXT        NOT NULL DEFAULT 'survey'
             CONSTRAINT reports_type_check
               CHECK (type IN ('survey','deployment','maintenance')),
  content    TEXT,
  progress   JSONB,
  photos     JSONB,
  signature  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.reports IS 'Site report; type survey|deployment|maintenance. user_id RESTRICT để giữ bằng chứng báo cáo.';

-- ---------------------------------------------------------------------
-- 10. documents — tài liệu/sơ đồ/ảnh của project
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL
             CONSTRAINT documents_project_id_fkey
               REFERENCES public.projects(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  file_url   TEXT        NOT NULL,
  type       TEXT        NOT NULL,
  version    INTEGER     NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.documents IS 'Tài liệu đính kèm project; version tăng dần.';

-- ---------------------------------------------------------------------
-- 11. audit_logs — nhật ký thay đổi (append-only; resource_id đa hình)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL
                CONSTRAINT audit_logs_user_id_fkey
                  REFERENCES public.users(id) ON DELETE RESTRICT,
  action        TEXT        NOT NULL,
  resource_type TEXT        NOT NULL,
  resource_id   UUID,
  ip            TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.audit_logs IS 'Append-only audit. resource_id đa hình nên KHÔNG có FK. Cột ip/user_agent theo contract — nên để NULL/ẩn theo RBAC §5.3.';

-- ---------------------------------------------------------------------
-- 12. config — cấu hình dùng chung
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.config (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  type       TEXT        NOT NULL,
  value      JSONB       NOT NULL,
  color      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT config_name_key UNIQUE (name)
);
COMMENT ON TABLE public.config IS 'Cấu hình/danh mục dùng chung; value JSONB.';

-- ---------------------------------------------------------------------
-- Trigger tự cập nhật updated_at cho mọi bảng có cột này
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fdi_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','customers','sites','projects','devices','alerts',
    'maintenances','works','reports','documents','audit_logs','config'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.fdi_set_updated_at()', t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- Index theo checklist.md §3 #11: project_id / serial / status /
-- created_at / customer_id (+ cácFK hay dùng)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_customers_created_at        ON public.customers (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sites_customer_id           ON public.sites (customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer_id        ON public.projects (customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status             ON public.projects (status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at         ON public.projects (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_pm_id              ON public.projects (pm_id);
CREATE INDEX IF NOT EXISTS idx_devices_project_id          ON public.devices (project_id);
CREATE INDEX IF NOT EXISTS idx_devices_site_id             ON public.devices (site_id);
CREATE INDEX IF NOT EXISTS idx_devices_serial              ON public.devices (serial);
CREATE INDEX IF NOT EXISTS idx_devices_status              ON public.devices (status);
CREATE INDEX IF NOT EXISTS idx_devices_created_at          ON public.devices (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_project_id           ON public.alerts (project_id);
CREATE INDEX IF NOT EXISTS idx_alerts_device_id            ON public.alerts (device_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status               ON public.alerts (status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity             ON public.alerts (severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at           ON public.alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenances_project_id     ON public.maintenances (project_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_device_id      ON public.maintenances (device_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_status          ON public.maintenances (status);
CREATE INDEX IF NOT EXISTS idx_maintenances_due_date       ON public.maintenances (due_date);
CREATE INDEX IF NOT EXISTS idx_works_project_id            ON public.works (project_id);
CREATE INDEX IF NOT EXISTS idx_works_incident_id           ON public.works (incident_id);
CREATE INDEX IF NOT EXISTS idx_works_assignee_id           ON public.works (assignee_id);
CREATE INDEX IF NOT EXISTS idx_works_status                ON public.works (status);
CREATE INDEX IF NOT EXISTS idx_works_due_date              ON public.works (due_date);
CREATE INDEX IF NOT EXISTS idx_works_created_at            ON public.works (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_project_id          ON public.reports (project_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at          ON public.reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_project_id        ON public.documents (project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id          ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at       ON public.audit_logs (created_at DESC);

-- ---------------------------------------------------------------------
-- Version migration (checklist §3 #15)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version     TEXT        PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  note        TEXT
);
COMMENT ON TABLE public.schema_migrations IS 'Đánh dấu version migration đã chạy (001/002/003).';
INSERT INTO public.schema_migrations (version, note)
VALUES ('001_initial_schema', 'Tạo 12 bảng + trigger updated_at + index')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Verify nhanh (dán riêng trong SQL Editor):
-- SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;  -- kỳ vọng 13 (12 + schema_migrations)
-- SELECT count(*) FROM pg_indexes WHERE schemaname='public';                     -- kỳ vọng >= 30
