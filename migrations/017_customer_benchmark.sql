-- =====================================================================
-- FDI_Project — Migration 017 : Benchmark customer chuẩn cho modules sau.
-- Chạy SAU 016_customer_duplicate_lookup.sql.
-- Công dụng: chuẩn hoá 1 cặp customer + site + project + devices
--            làm mẫu tham chiếu cho Product/Asset/Project/Ticket,
--            khớp contract API /api/v1/customers (dữ liệu thật, không
--            bịa). UUID duy nhất, KHÔNG trùng với seed migration 003.
-- Idempotent: mọi INSERT dùng ON CONFLICT DO NOTHING.
-- Lưu ý an toàn credential: KHÔNG ghi giá trị thật trong file.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Customer benchmark (dùng làm mẫu chuẩn cho các module sau).
--    UUID 'bbbbbbbb-…001' KHÔNG trùng với seed 003
--    ('aaaaaaaa-…001' = 'Khách hàng Demo FDI').
-- ---------------------------------------------------------------------
INSERT INTO public.customers (
  id,
  name,
  phone,
  email,
  industry,
  contact_technical,
  contact_commercial,
  contact_emergency,
  primary_contact_name,
  headquarters_address,
  notes,
  consent_contact,
  consent_contact_at,
  lifecycle_stage
) VALUES (
  'bbbbbbbb-0000-0000-0000-000000000001',
  'Khải Thiên Media',
  '0900000000',
  'sales@ktm.example',
  'Manufacturing',
  'Kỹ thuật Demo',
  'Kinh doanh Demo',
  'Hotline Demo',
  'Đỗ Quang Hiểu',
  'Tầng 3, Toà nhà FPT, 268 Đề Thám, Bà Miễu, Ba Đình, Hà Nội',
  'Benchmark standard cho các module sau: product/asset/project/ticket.',
  false,
  NULL,
  'prospect'
) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2) Site + project cùng benchmark (đủ cho Asset / Project / Ticket).
-- ---------------------------------------------------------------------
-- Site benchmark
INSERT INTO public.sites (
  id,
  name,
  customer_id,
  address,
  contact,
  working_hours
) VALUES (
  'bbbbbbbb-0000-0000-0000-000000000002',
  'Site HCM Benchmark',
  'bbbbbbbb-0000-0000-0000-000000000001',  -- → customer benchmark
  'Quận 1, TP.HCM',
  '0900000001',
  '{"mon_fri":"08:00-17:00","sat":"08:00-12:00","sun":null}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Project benchmark
INSERT INTO public.projects (
  id,
  customer_id,
  site_id,
  name,
  status,
  start_date,
  end_date,
  progress,
  pm_id,
  color,
  checklist
) VALUES (
  'cccccccc-0000-0000-0000-000000000003',
  'bbbbbbbb-0000-0000-0000-000000000001',  -- → customer benchmark
  'bbbbbbbb-0000-0000-0000-000000000002',
  'Dự án benchmark',
  'in_progress',
  DATE '2026-11-01',
  DATE '2026-12-31',
  35.00,
  '11111111-1111-1111-1111-111111111111',
  '#3b82f6',
  '{"survey":true,"deployment":false,"acceptance":false}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3) Devices (1 Switch + 1 Router + 1 AP) cùng project/site.
-- ---------------------------------------------------------------------
INSERT INTO public.devices (
  id,
  project_id,
  site_id,
  serial,
  type,
  model,
  mac_address,
  rack_id,
  location,
  warranty_from,
  warranty_to,
  status
) VALUES
  (
    'dddddddd-0000-0000-0000-000000000001',
    'cccccccc-0000-0000-0000-000000000003',
    'bbbbbbbb-0000-0000-0000-000000000002',
    'DEMO-SW-001',
    'Switch',
    'DemoSwitch24',
    '00:11:22:33:44:01',
    'RACK-A1',
    'Tầng 1',
    DATE '2026-01-01',
    DATE '2028-01-01',
    'active'
  ),
  (
    'dddddddd-0000-0000-0000-000000000002',
    'cccccccc-0000-0000-0000-000000000003',
    'bbbbbbbb-0000-0000-0000-000000000002',
    'DEMO-RT-002',
    'Router',
    'DemoRouterX',
    '00:11:22:33:44:02',
    'RACK-A1',
    'Tầng 1',
    DATE '2026-01-01',
    DATE '2028-01-01',
    'active'
  ),
  (
    'dddddddd-0000-0000-0000-000000000003',
    'cccccccc-0000-0000-0000-000000000003',
    'bbbbbbbb-0000-0000-0000-000000000002',
    'DEMO-AP-003',
    'AP',
    'DemoAP v2',
    '00:11:22:33:44:03',
    NULL,
    'Tầng 2',
    DATE '2025-01-01',
    DATE '2026-06-01',
    'expired'
  )
ON CONFLICT (id) DO NOTHING;

COMMIT;
