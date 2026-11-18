> **v1.4 OVERRIDE (2026-11-18):** This section supersedes earlier UI-specific descriptions when they conflict. See `DESIGN_BASELINE_v1.4.md`.

### v1.4 dashboard alignment
New dashboard response definitions: as_of, effective_scope, definition_id, baseline_version, weighted_progress, progress_coverage, ticket_status_bucket, sla_risk_count, sla_breached_count, trend_metric, trend_local_date, is_stale.

---

# Data Dictionary v1.1 — Critical Fields
| Entity.field | Type | Required | Owner | Validation / sensitivity |
|---|---|---|---|---|
| customers.id | uuid | yes | Customer | immutable PK |
| customers.code | text | yes | Customer | globally unique, immutable business code |
| sites.customer_id | uuid | yes | Customer | FK, immutable except controlled transfer |
| projects.customer_id | uuid | yes | Delivery | FK, cross-site invariant |
| assets.asset_code | text | yes | Infrastructure | unique, QR payload references ID/code only |
| assets.serial_number | text | no | Infrastructure | trim/normalize; manufacturer policy; sensitive operational |
| asset_placements.valid_from | timestamptz | yes | Infrastructure | UTC; append-only interval start |
| asset_placements.valid_to | timestamptz | no | Infrastructure | null only for current placement |
| configuration_items.ci_type | text | yes | Infrastructure | controlled vocabulary |
| diagram_versions.revision | int | yes | Infrastructure | positive; unique per diagram |
| tickets.customer_id | uuid | yes | Service Ops | derived from authorized site/service |
| tickets.priority | enum | yes | Service Ops | derived from impact/urgency; override audited |
| tickets.version | int | yes | Service Ops | optimistic concurrency |
| sla_instances.policy_id | uuid | no | Service Ops | null only with policy_missing |
| documents.classification | enum | yes | Platform | public/internal/confidential/restricted |
| audit_events.actor_id | uuid | yes | Platform | actor or system identity; immutable |
| outbox_events.dedupe_key | text | yes | Platform | unique logical delivery key |

**Ownership rules:** only owning module writes core entity; other modules reference stable IDs. PII: contacts, email, phone; restricted: credentials, network diagrams, configuration backups. Secrets must never be stored as free-text fields. All timestamps UTC; site timezone IANA identifier.


---
## v1.3 Visual baseline alignment (2026-11-18)
Add dashboard response vocabulary: `as_of` UTC timestamp, `scope` effective authorization, `range_start/end`, `definition_id`, `numerator`, `denominator`, `comparison_window`, `is_stale`, `drilldown_filter`; data owners must approve metric definitions.
