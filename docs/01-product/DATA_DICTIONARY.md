> **v1.0 NOTE (2026-11-18):** This section is authoritative where UI descriptions conflict. Source: approved dashboard baseline. See `DESIGN_BASELINE.md`.

### Dashboard alignment (approved baseline)
New dashboard response definitions: as_of, effective_scope, definition_id, baseline_version, weighted_progress, progress_coverage, ticket_status_bucket, sla_risk_count, sla_breached_count, trend_metric, trend_local_date, is_stale.

---

# Data Dictionary Critical Fields
| Entity.field | Type | Required | Owner | Validation / sensitivity |
|---|---|---|---|---|
| customers.id | uuid | yes | Customer | immutable PK |
| customers.name | text | yes | Customer | trim, 2–255 chars |
| customers.tax_id | text | no | Customer | business tax code; duplicate check Phase 2 |
| customers.headquarters_address | text | no | Customer | headquarters address, free text |
| customers.primary_contact_name | text | no | Customer | primary contact name (+ phone) |
| customers.primary_contact_position | text | no | Customer | ≤120 chars |
| customers.notes | text | no | Customer | ≤500 chars; XSS-safe on display |
| customers.consent_contact | boolean | yes | Customer | DNC; false = không được liên hệ; default false (migration 009) |
| customers.consent_contact_at | timestamptz | no | Customer | UTC timestamp khi user đồng ý; null khi từ chối |
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

> **Drift note (2026-11-19, cập nhật 2026-11-23):** `customers.code` / `customers.status` từng được khai báo trong `lib/types.ts` cũ nhưng **không tồn tại** trong schema đang chạy (migrations/001_initial_schema.sql). `status` vẫn chưa có; còn **`code` ĐÃ có** sau migration **010_customer_code** (áp dụng thật 2026-11-23 trên Supabase, `schema_migrations` = `010_customer_code`): `code TEXT` + unique partial index + trigger BEFORE INSERT sinh `CUS-YYYY-NNN` bằng hàm `fdi_next_customer_code()` (SECURITY DEFINER, advisory xact lock chống race) + backfill bản ghi cũ. Client KHÔNG tự bịa mã — form gọi RPC rồi gửi `code` trong payload; trigger là rào cuối nếu client bỏ trống.

> **Consent/DNC note (2026-11-19):** `customers.consent_contact` là boolean có audit (migration 009), mặc định `false` = không được liên hệ. Consent **KHÔNG** được lưu trong `customers.notes`; dùng cột chuyên biệt `consent_contact` + `consent_contact_at` (timestamp UTC lúc đồng ý, `null` khi từ chối).

**Ownership rules:** only owning module writes core entity; other modules reference stable IDs. PII: contacts, email, phone; restricted: credentials, network diagrams, configuration backups. Secrets must never be stored as free-text fields. All timestamps UTC; site timezone IANA identifier.

---
## Visual baseline alignment (2026-11-18)
Add dashboard response vocabulary: `as_of` UTC timestamp, `scope` effective authorization, `range_start/end`, `definition_id`, `numerator`, `denominator`, `comparison_window`, `is_stale`, `drilldown_filter`; data owners must approve metric definitions.
