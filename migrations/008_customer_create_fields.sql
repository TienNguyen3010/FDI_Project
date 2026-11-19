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
