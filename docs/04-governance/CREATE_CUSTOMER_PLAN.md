# Create Customer — Implementation Plan (Phase 1)

> **Trạng thái:** Chốt bởi Dev Director · 2026-11-19 · Review-first (đã có standard, chờ approve code).
> **Phạm vi:** `/customers/new` theo mockup, giữ schema đang chạy. Không rebuild REST, không tạo bảng `contacts`.
> Standard đi kèm: `../02-design/CREATE_CUSTOMER_COMPONENTS_STANDARD.md`.

## 1. Hiện trạng đã verify (code @ `355de30`)

| Lớp | Sự thật | Bằng chứng |
|---|---|---|
| Route | Chỉ có `/customers` (list). **Không có** `/customers/new`, `/customers/[id]` | `app/(workspace)/customers/` chỉ 1 file `page.tsx` |
| UI | 1 modal 1 cột qua `CrudPage` generic, 8 field | `app/(workspace)/customers/page.tsx:6-29`; `components/crud/CrudPage.tsx:338-395` |
| Mutation | Direct `.insert()` / `.update()` / `.delete()` — **không có RPC** | `components/crud/CrudPage.tsx:160,167,194-197` |
| DB thật | `customers`: id, name, phone, email, industry, contact_technical, contact_commercial, contact_emergency, created_at, updated_at — **không có** code/tax_id/headquarters_address/status/notes | `migrations/001_initial_schema.sql:38-48` |
| Type drift | `lib/types.ts` khai báo `code` + `status` không có trong DB | `lib/types.ts:30-48` |
| RBAC | `editableBy: ['manager','director']` — `manager` không có trong `ROLES` v1 | `page.tsx:11`; `lib/rbac/policy.core.mjs:4-6` |
| RLS | Insert chỉ `fdi_is_manager_plus()`; select qua `fdi_can_read` | `migrations/002_rls_policies.sql:302-319` |

**Kết luận:** mockup/spec là thiết kế đề xuất, code chưa triển khai. Đây là **gap-fill**, không phải "viết lại theo spec".

## 2. Quyết định phân phase

| | Phase 1 (lần này) | Phase 2 (sau) |
|---|---|---|
| Form | Trang riêng 3 card + summary, đúng mockup | Giữ nguyên, tinh chỉnh theo UAT |
| Cột DB | Thêm 5 cột `tax_id`, `headquarters_address`, `primary_contact_name`, `primary_contact_position`, `notes` | `code` + trigger sinh `CUS-YYYY-XXX`, `relationships_start_date` |
| Contact | 3 ô text + tên contact chính TEXT | Tách bảng `contacts`, contact selector, `customer_contact_roles` |
| Validation | Inline blur/submit, required, 500 ký tự | Duplicate check, idempotency-key, transaction, audit correlation |
| RBAC | Sửa `editableBy` + route gate `customer.create` | Không đổi |

## 3. SQL migration đề xuất (008 — CHƯA apply)

```sql
-- 008_customer_create_fields.sql — bổ sung field cho màn tạo khách hàng.
-- Idempotent; chạy trong Supabase SQL Editor. Không đổi cột đã có.
BEGIN;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS headquarters_address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS primary_contact_name TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS primary_contact_position TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes TEXT;
INSERT INTO public.schema_migrations (version, note)
VALUES ('008_customer_create_fields', 'Phase 1 Create Customer fields')
ON CONFLICT (version) DO NOTHING;
COMMIT;
```

`COMMENT ON TABLE customers` hiện ghi "không lưu nhạy cảm" — vẫn đúng (không lưu bank/NDA/mật khẩu). Không đổi RLS policy (009 chỉ `CREATE OR REPLACE` 2 helper).

**Migration 009 (hardening, CHƯA apply)** — paste trong SQL Editor sau 008:

```sql
BEGIN;
-- 1) super_admin vào whitelist fdi_current_role() + fdi_is_manager_plus()
--    (copy nguyên thân hàm 002, chỉ đổi whitelist; xem file migrations/009_...sql)
-- 2) DNC columns
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS consent_contact BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS consent_contact_at TIMESTAMPTZ;
COMMIT;
```

Chi tiết đầy đủ (CREATE OR REPLACE functions, COMMENT, schema_migrations): file migrations/009_customer_create_hardening.sql ở repo root.

## 4. Checklistcode (đã build 2026-11-19, commit `e180357`)

> Tick = có tool output. Migration file ✅ (soạn) nhưng **apply trên DB thật ⏳** (không có credentials/DB access trong sandbox).

- [x] **C1** Migration 008_customer_create_fields.sql soạn xong (`migrations/008...`) · **apply trên Supabase SQL Editor: ⏳ do user**.
- [x] **C2** `lib/types.ts:30-...` đổi theo schema thật: bỏ `code`/`status`, thêm 5 cột + cột cũ. Verify `tsc --noEmit` = exit 0.
- [x] **C3** `app/(workspace)/customers/page.tsx:11` → `['project_manager','director','super_admin']`. Verify build exit 0.
- [x] **C4** Route `app/(workspace)/customers/new/page.tsx` (gate `customer.create`) + `components/customers/CreateCustomerForm.tsx` (3 card, breadcrumb, summary, sticky footer). Verify build output có `/customers/new` ◐.
- [x] **C5** Validation: 5 required, email regex, phone regex, `maxLength=500` + counter, lỗi dưới field. Verify tsc 0 + code review.
- [x] **C6** Submit: `supabase.from('customers').insert(payload)` + disable/spinner + toast + `router.push('/customers')`. Verify build 0 · **submit DB thật ⏳ chờ apply 008**.
- [x] **C7** Hủy + unsaved confirm + link list. Verify code.
- [x] **C8** Responsive `lg:grid-cols-3` → single column + a11y. Verify build 0 · screenshot 390px ⏳ (chờ user chụp).
- [x] **C9** DATA_DICTIONARY.md (5 field + drift note) + CHECKLISTS.md "Nhật ký đồng bộ" cùng commit `e180357`.
- [x] **C10** `npm run check:docs` OK 55 files · `npm test` 24/24 · `tsc` 0 · build 0 (`NEXT_PRIVATE_BUILD_WORKER=0 NODE_OPTIONS=--max-old-space-size=640 next build --webpack`).
- [x] **C11** (bổ sung 2026-11-19) Nút "+ Thêm mới" trên list điều hướng `/customers/new` (CUS-L07) qua `CrudConfig.createHref`; module khác giữ modal. Verify `tests/customer-create-link.test.mjs` 2/2 · tsc 0.
- [x] **C12** (bổ sung 2026-11-19) Rewrite Customers List theo spec 01: page standalone (`app/(workspace)/customers/page.tsx`) + API `GET /api/v1/customers` (`app/api/v1/customers/route.ts`, envelope `data.{items,pagination,summary}`, scope deny-by-default, CSAT null, `code` null, status `'active'`, count project/ticket theo scope) + form align prefix `CUS-` UI-only. Verify tsc 0 · test 29/29 · build 0 · docs-check OK · KHÔNG bịa KPI. Standard: `../02-design/CUSTOMERS_LIST_COMPONENTS_STANDARD.md` · `../02-design/CREATE_CUSTOMER_COMPONENTS_STANDARD.md`.
- [x] **C13** (hardening 2026-11-19, duyệt bởi Dev Director) — (a) migration 009_customer_create_hardening.sql: whitelist `super_admin` vào `fdi_current_role()`/`fdi_is_manager_plus()`, thêm `consent_contact`+`consent_contact_at` (**chưa apply**); (b) RBAC client cấp `customer.create` cho director+project_manager (khớp RLS); (c) form: bỏ input mã giả (readonly "Tự động tạo"), checkbox DNC, optional `null`, email lowercase, name ≥2, phone warning không chặn, blur + focus lỗi đầu, `title` trên summary, `htmlFor="f-notes"`, `Badge`/`Spinner`. Verify tsc 0 · test **47/47** · build 0 · docs-check OK.

## 5. Rủi ro & guardrails

- **Không** claim xong trước khi migration 008/009 apply — cột mới sẽ bị PostgREST trả lỗi `PGRST204` nếu DB chưa có; 009 còn đổi whitelist RLS nên chưa apply → super_admin vẫn bị chặn insert.
- **Không** đổi schema đã apply (001–008) hay force push; migration 009 là additive + `CREATE OR REPLACE` function (signature không đổi).
- **Không** dùng `manager`/`leader` trong `editableBy` (role không tồn tại); **không** để `super_admin` lọt khỏi whitelist RLS.
- **Không** tự sinh `code` hay gửi `created_at` từ client.
- Docs guard `CHECKLIST_BASE` chặn commit nếu đổi `app/|components|lib|migrations|docs/` mà không chạm `CHECKLISTS.md` (`scripts/docs-check.mjs:193-212`).
- Token `vcp_...` nếu lộ trong chat → rotate, không lưu repo/config.

## 6. Definition of Done

Migration 008 ✅ (đã apply) · **009 file ✅ soạn, apply ⏳ do user** · `tsc` 0 · `check:docs` OK · `npm test` 47/47 · build 0 · form `/customers/new` hardening xong (bỏ input mã giả, RBAC 2 đầu, DNC checkbox, validation blur) · docs + checklist cùng commit · prod deploy trước đó READY (`3539c83`) — **chưa deploy hardening này**. Definition of Done cuối: user apply 009 → submit DB thật 1 customer có consent → chụp màn hình verify.
