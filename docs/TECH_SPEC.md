> **v1.4 OVERRIDE (2026-11-18):** This section supersedes earlier UI-specific descriptions when they conflict. See `DESIGN_BASELINE_v1.4.md`.

### v1.4 dashboard alignment
UI design system: green light sidebar with KPI gradient cards preserved. Snapshot consistency and as_of timestamps are required. Prefer server-side authorized aggregation and transactionally consistent snapshot; no fake realtime guarantee.

---

# Technical Architecture Specification
## Architecture decision
Deploy a single-company modular monolith with domain modules and asynchronous workers. No SaaS tenant partitioning. Internal customers separated by policy grants and domain checks.
## Suggested stack
Frontend Next.js/React + TypeScript + accessible component system; backend NestJS/TypeScript (alternative ASP.NET Core subject to team competency); PostgreSQL; Redis/BullMQ for jobs; S3-compatible storage/MinIO; OIDC IdP; Docker; reverse proxy; OpenTelemetry; metrics/log aggregation.
## Module boundaries
Identity, Customer, Site, Project, Asset, CMDB, ServiceDesk, Maintenance, Document, Reporting, Notification, Audit, Integration. Each module owns data access and exposes application services; avoid direct cross-module writes. Transactional outbox for email/webhook/report events.
## Integrations
Email SMTP/API outbound and optional inbound parsing; Telegram Bot API for alerts; Zalo OA/API only after permissions and template restrictions verified; Zabbix/LibreNMS/Prometheus adapters for telemetry. Secrets in vault; verify inbound signatures; maintain external_id mapping and retry logs.
## Non-functional requirements — initial targets to validate
P95 standard read API <500ms at agreed load; dashboard <3s at agreed dataset; 99.5% monthly application availability target excluding agreed maintenance; RPO <=24h and RTO <=8h **provisional**, require business sign-off; 30-day logs and longer audit retention per policy. Capacity test based on agreed customers/sites/assets/tickets/concurrency, not arbitrary promises.
## Security
TLS, OIDC, MFA for privileged roles, short-lived tokens, scope checks on every read/write/export/download/event, CSRF protection for cookie sessions, XSS sanitization, file malware scan, upload size/type allowlists, least-privilege DB access, immutable audit trail, encryption at rest as applicable, dependency scanning, penetration test before production.
## Reliability
Automated daily backups plus PITR where needed; restore drills; queue retries/DLQ; outbox idempotency; health/readiness checks; structured logs with correlation IDs; circuit breakers for external providers; graceful degradation when Telegram/Zalo unavailable.
## Delivery architecture
Dev/staging/prod separated; CI lint/test/SAST/migration check; CD with approvals; blue-green or rolling deployment where infrastructure supports; migration rollback strategy and versioned API contracts.
## ADRs needed
ADR-001 auth provider; ADR-002 file storage; ADR-003 realtime transport; ADR-004 monitoring integration; ADR-005 data retention; ADR-006 RPO/RTO; ADR-007 customer portal; ADR-008 CMDB graph strategy.

## Baseline assumptions and boundaries
- One operating company, multiple customers and sites; **not SaaS multi-tenant**.
- Customer portal is optional and isolated by customer scope; no direct device administration from portal.
- On-premises or private-cloud deployment; English identifiers, Vietnamese UI labels supported.
- P0 includes project delivery, assets, site, tickets, basic maintenance, reports, email and RBAC; advanced topology editor, telemetry and bidirectional Zalo are later phases.
- All dates persisted UTC with timezone-aware presentation; all important mutations audited.
- Architecture decisions require stakeholder sign-off before production.


---

# v1.1 Technical decisions and quality gates
Modular monolith with bounded contexts, internal domain events and transactional outbox. No SaaS multi-tenancy. PostgreSQL OLTP; object storage for files; Redis queue for delivery and asynchronous reports; external monitoring provider via adapter. Choose one backend stack before coding (NestJS/TypeScript **or** ASP.NET Core), not both. OIDC with MFA for privileged roles; vault for secrets; TLS end-to-end; short-lived signed file links; strict customer scope at query boundary.

**NFRs to validate (proposed, not approved):** 95th percentile GET list latency < 500 ms at agreed load; 99.5% app availability excluding planned maintenance; API audit completeness 100% for privileged mutations; retryable integrations at-least-once with dedupe; 30-day restore drill cadence initially. RPO, RTO, users, assets and event throughput remain TBD and must be signed off before infra sizing.

**Threat model:** IDOR across customers, stale role membership, file leakage, webhook spoofing/replay, malicious uploads, event flood, CSV injection, audit tampering, notification PII leakage. Mitigations include scoped queries, signed webhooks, replay window, AV scan, rate limiting, escaping, append-only event policy, separate audit DB role and retention rules.

**Observability:** traceId correlation across API/outbox/worker, structured logs without credentials, metrics for queue lag/failed jobs/SLA recalculation, health/readiness endpoints, backup/restore evidence. Release gate requires rollback rehearsal and migration compatibility.


---
## v1.3 Visual baseline alignment (2026-11-18)
Frontend design tokens from `design/tokens.json`; semantic components rather than inline colors. KPI refresh must expose source timestamp and cache age. Do not infer realtime availability from UI animation.


## v1.5 implementation evidence
See `quality/INTEGRATION_STATUS_v1_5.md` for executable reference, verified tests and remaining production blockers. No production acceptance implied.
