> **v1.4 OVERRIDE (2026-11-18):** This section supersedes earlier UI-specific descriptions when they conflict. See `DESIGN_BASELINE_v1.4.md`.

### v1.4 dashboard alignment
No SQL schema migration is claimed for this UI change. Implement dashboard read projections only after validating existing table columns and snapshot semantics; add scoped indexes and migrations via separate reviewed change. Do not assume tickets have historical as-of data.

---

# Database Specification — PostgreSQL 16+
## Principles
UUID PKs, UTC timestamptz, explicit FK constraints, optimistic concurrency (`version`), soft archive for operational data, partial unique indexes, immutable history, outbox for side effects. Avoid EAV for core fields. Separate secret vault.
## Starter DDL (illustrative, not full production migration)
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE customers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name text NOT NULL, status text NOT NULL CHECK (status IN ('active','inactive')), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE sites (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES customers(id), code text NOT NULL, name text NOT NULL, timezone text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(customer_id,code));
CREATE TABLE projects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES customers(id), code text NOT NULL UNIQUE, name text NOT NULL, status text NOT NULL, baseline_at timestamptz, version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE project_sites (project_id uuid NOT NULL REFERENCES projects(id), site_id uuid NOT NULL REFERENCES sites(id), PRIMARY KEY(project_id,site_id));
CREATE TABLE assets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), asset_code text NOT NULL UNIQUE, site_id uuid REFERENCES sites(id), manufacturer text NOT NULL, model text NOT NULL, serial_number text, status text NOT NULL, version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX assets_site_status_idx ON assets(site_id,status);
CREATE INDEX assets_serial_lookup_idx ON assets(manufacturer,model,serial_number) WHERE serial_number IS NOT NULL;
CREATE TABLE asset_movements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), asset_id uuid NOT NULL REFERENCES assets(id), old_site_id uuid REFERENCES sites(id), new_site_id uuid REFERENCES sites(id), actor_id uuid NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(), reason text NOT NULL);
CREATE TABLE tickets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_code text NOT NULL UNIQUE, customer_id uuid NOT NULL REFERENCES customers(id), site_id uuid REFERENCES sites(id), type text NOT NULL CHECK(type IN ('incident','service_request')), priority text NOT NULL, status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), version integer NOT NULL DEFAULT 1);
CREATE INDEX tickets_customer_status_idx ON tickets(customer_id,status,created_at DESC);
CREATE TABLE ticket_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL REFERENCES tickets(id), actor_id uuid, event_type text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE outbox_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_type text NOT NULL, aggregate_id uuid NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz);
```
## Additional logical tables
users, teams, team_members, roles, permissions, role_permissions, scope_grants, contacts, contracts, sla_policies, locations, racks, milestones, tasks, task_assignments, asset_models, configuration_items, ci_relations, services, service_ci, ticket_ci, ticket_sla_clocks, maintenance_plans, work_orders, checklist_templates, checklist_items, checklist_answers, documents, document_versions, document_links, approval_requests, audit_events, notifications, integration_connections.
## Migration rules
Numbered migrations, forward-only production process, expand/contract schema changes, backfill with reconciliation, no cascade delete of customer/site/asset/ticket history. Add DB-level validation for project-site customer match via trigger or service + test; FKs alone do not enforce it.
## Security and retention
Separate DB app/migration/read-only users; TLS; encrypted backups; PII and attachments retention per approved policy; audit partitioning at scale; tested restore. For large telemetry use external time-series storage rather than main OLTP DB.

## Baseline assumptions and boundaries
- One operating company, multiple customers and sites; **not SaaS multi-tenant**.
- Customer portal is optional and isolated by customer scope; no direct device administration from portal.
- On-premises or private-cloud deployment; English identifiers, Vietnamese UI labels supported.
- P0 includes project delivery, assets, site, tickets, basic maintenance, reports, email and RBAC; advanced topology editor, telemetry and bidirectional Zalo are later phases.
- All dates persisted UTC with timezone-aware presentation; all important mutations audited.
- Architecture decisions require stakeholder sign-off before production.


---
## v1.3 Visual baseline alignment (2026-11-18)
UI-only theme changes require no schema migration. Dashboard read models may use existing tables/views; any new materialized view requires migration, refresh strategy and scope-safe query tests. Never store gradient values in business tables.


## v1.5 implementation evidence
See `quality/INTEGRATION_STATUS_v1_5.md` for executable reference, verified tests and remaining production blockers. No production acceptance implied.
