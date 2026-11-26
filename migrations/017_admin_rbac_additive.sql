-- =====================================================================
-- FDI_Project — Migration 017 : Additive schema iam.* (Admin RBAC)
-- Chạy SAU 016_customer_duplicate_lookup.sql.
-- Công dụng: bổ sung schema iam.* (users, roles, permissions,
-- role_grants, user_role_assignments, permission_templates,
-- permission_audit) theo spec Figma v1.1 (ADM-01..04).
-- Idempotent: mọi CREATE dùng IF NOT EXISTS; mọi INSERT dùng
-- ON CONFLICT DO NOTHING.
-- Lưu ý: KHÔNG DROP cột/bảng cũ. Alway additive.
-- =====================================================================

BEGIN;

-- =====================================================================
-- 0) Extension
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- 1) Schema iam
-- =====================================================================
CREATE SCHEMA IF NOT EXISTS iam;

-- =====================================================================
-- 2) permission registry (iam.permissions)
-- =====================================================================
CREATE TABLE IF NOT EXISTS iam.permissions (
  code          TEXT PRIMARY KEY,
  resource      TEXT NOT NULL,
  action        TEXT NOT NULL,
  is_sensitive  BOOLEAN NOT NULL DEFAULT false
);

-- Admin RBAC permission registry
INSERT INTO iam.permissions (code, resource, action, is_sensitive) VALUES
  ('admin.user_manage',       'admin',       'manage',     false),
  ('admin.role_manage',       'admin',       'manage',     false),
  ('admin.templates.read',    'template',    'read',       false),
  ('admin.templates.create',  'template',    'create',     false),
  ('admin.templates.update',  'template',    'update',     false),
  ('admin.templates.publish', 'template',    'publish',    false),
  ('admin.audit_read',        'audit',       'read',       false),
  ('admin.audit.export',      'audit',       'export',     false)
ON CONFLICT (code) DO NOTHING;

-- =====================================================================
-- 3) iam.users
-- =====================================================================
CREATE TABLE IF NOT EXISTS iam.users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username        TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  display_name    TEXT        NOT NULL,
  phone           TEXT,
  team_id         TEXT,
  locale          TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending_invitation'
    CHECK (status IN ('pending_invitation','active','suspended','archived')),
  is_system_admin BOOLEAN     NOT NULL DEFAULT false,
  version         BIGINT      NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_ci
  ON iam.users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_ci
  ON iam.users (lower(email));
CREATE INDEX IF NOT EXISTS users_status_idx
  ON iam.users (status);
CREATE INDEX IF NOT EXISTS users_email_idx
  ON iam.users (email);

-- =====================================================================
-- 4) iam.roles + iam.role_versions
-- =====================================================================
CREATE TABLE IF NOT EXISTS iam.roles (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT        NOT NULL,
  name            TEXT        NOT NULL,
  description     TEXT,
  is_system       BOOLEAN     NOT NULL DEFAULT false,
  state           TEXT        NOT NULL DEFAULT 'draft'
    CHECK (state IN ('draft','active','retired')),
  version         BIGINT      NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS roles_code_idx
  ON iam.roles (code);
CREATE INDEX IF NOT EXISTS roles_state_idx
  ON iam.roles (state);
CREATE INDEX IF NOT EXISTS roles_name_idx
  ON iam.roles (name);

CREATE TABLE IF NOT EXISTS iam.role_versions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id         UUID        NOT NULL REFERENCES iam.roles(id) ON DELETE CASCADE,
  version         BIGINT      NOT NULL,
  code            TEXT        NOT NULL,
  name            TEXT        NOT NULL,
  description     TEXT,
  is_system       BOOLEAN     NOT NULL DEFAULT false,
  state           TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT role_versions_code_version_key UNIQUE (role_id, version)
);

CREATE INDEX IF NOT EXISTS role_versions_role_idx
  ON iam.role_versions (role_id);

-- =====================================================================
-- 5) iam.role_grants
-- =====================================================================
CREATE TABLE IF NOT EXISTS iam.role_grants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id         UUID        NOT NULL REFERENCES iam.roles(id) ON DELETE CASCADE,
  permission_code TEXT        NOT NULL REFERENCES iam.permissions(code),
  scope_kind      TEXT        NOT NULL
    CHECK (scope_kind IN ('own','assigned','team','project','customer','all')),
  scope_ref       UUID,
  CONSTRAINT role_grants_scope_check
    CHECK ((scope_kind = 'all' AND scope_ref IS NULL) OR scope_kind <> 'all'),
  UNIQUE (role_id, permission_code, scope_kind, scope_ref)
);

CREATE INDEX IF NOT EXISTS role_grants_role_idx
  ON iam.role_grants (role_id);
CREATE INDEX IF NOT EXISTS role_grants_perms_idx
  ON iam.role_grants (permission_code);

-- =====================================================================
-- 6) iam.user_role_assignments
-- =====================================================================
CREATE TABLE IF NOT EXISTS iam.user_role_assignments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
  role_id         UUID        NOT NULL REFERENCES iam.roles(id) ON DELETE CASCADE,
  scope_kind      TEXT        NOT NULL
    CHECK (scope_kind IN ('own','assigned','team','project','customer','all')),
  scope_ref       UUID,
  assigned_by     UUID        REFERENCES iam.users(id) ON DELETE SET NULL,
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until     TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  version         BIGINT      NOT NULL DEFAULT 1,
  CONSTRAINT valid_range_check
    CHECK (valid_until IS NULL OR valid_until > valid_from),
  CONSTRAINT user_role_assignments_revoked_check
    CHECK (revoked_at IS NULL OR revoked_at >= valid_from)
);

CREATE INDEX IF NOT EXISTS user_role_assignments_user_active_idx
  ON iam.user_role_assignments (user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS user_role_assignments_role_active_idx
  ON iam.user_role_assignments (role_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS user_role_assignments_revoked_idx
  ON iam.user_role_assignments (user_id, revoked_at);

-- =====================================================================
-- 7) iam.permission_templates + iam.template_versions + iam.template_grants
-- =====================================================================
CREATE TABLE IF NOT EXISTS iam.permission_templates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT        NOT NULL,
  revision        INTEGER     NOT NULL DEFAULT 1,
  name            TEXT        NOT NULL,
  description     TEXT,
  owner_id        UUID        REFERENCES iam.users(id) ON DELETE SET NULL,
  state           TEXT        NOT NULL DEFAULT 'draft'
    CHECK (state IN ('draft','published','retired')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT permission_templates_code_revision_key UNIQUE (code, revision)
);

CREATE INDEX IF NOT EXISTS templates_state_idx
  ON iam.permission_templates (state);

CREATE TABLE IF NOT EXISTS iam.template_versions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID        NOT NULL REFERENCES iam.permission_templates(id) ON DELETE CASCADE,
  revision        INTEGER     NOT NULL,
  code            TEXT        NOT NULL,
  name            TEXT        NOT NULL,
  description     TEXT,
  state           TEXT        NOT NULL,
  created_by      UUID        REFERENCES iam.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT template_versions_code_revision_key UNIQUE (template_id, revision)
);

CREATE INDEX IF NOT EXISTS template_versions_template_idx
  ON iam.template_versions (template_id);

CREATE TABLE IF NOT EXISTS iam.template_grants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID        NOT NULL REFERENCES iam.permission_templates(id) ON DELETE CASCADE,
  template_revision INTEGER   NOT NULL,
  permission_code TEXT        NOT NULL REFERENCES iam.permissions(code),
  scope_kind      TEXT        NOT NULL
    CHECK (scope_kind IN ('own','assigned','team','project','customer','all')),
  scope_ref       UUID,
  CONSTRAINT template_grants_scope_check
    CHECK ((scope_kind = 'all' AND scope_ref IS NULL) OR scope_kind <> 'all'),
  UNIQUE (template_id, template_revision, permission_code, scope_kind, scope_ref)
);

CREATE INDEX IF NOT EXISTS template_grants_template_idx
  ON iam.template_grants (template_id);

-- =====================================================================
-- 8) iam.permission_audit (append-only)
-- =====================================================================
CREATE TABLE IF NOT EXISTS iam.permission_audit (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id        UUID        REFERENCES iam.users(id) ON DELETE SET NULL,
  action          TEXT        NOT NULL,
  target_type     TEXT        NOT NULL,
  target_id       TEXT,
  outcome         TEXT        NOT NULL,
  reason          TEXT,
  request_id      TEXT        NOT NULL,
  policy_version  TEXT,
  before_redacted JSONB,
  after_redacted  JSONB,
  metadata_redact TEXT,
  CONSTRAINT audit_outcome_check
    CHECK (outcome IN ('allow','deny','success','fail'))
);

CREATE INDEX IF NOT EXISTS audit_occurred_idx
  ON iam.permission_audit (occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_actor_idx
  ON iam.permission_audit (actor_id);
CREATE INDEX IF NOT EXISTS audit_action_idx
  ON iam.permission_audit (action);
CREATE INDEX IF NOT EXISTS audit_target_idx
  ON iam.permission_audit (target_type, target_id);

-- =====================================================================
-- 9) schema_migrations version record (checklist §3 #15)
-- =====================================================================
INSERT INTO public.schema_migrations (version, note)
VALUES ('017_admin_rbac_additive', 'Additive iam.* schema for Admin RBAC v1.1 (ADM-01..04); additive only; no drop')
ON CONFLICT (version) DO NOTHING;

COMMIT;
