-- =====================================================================
-- FDI_Project — Migration 003 : Seed tối thiểu cho Bản 1 (demo/QA)
-- Chạy SAU 001 + 002. Idempotent: mọi INSERT dùng ON CONFLICT DO NOTHING
-- với UUID cố định → chạy lại không tạo trùng.
-- KHÔNG seed password hash thật, KHÔNG có thông tin nhạy cảm
-- (không bank, không IP quản trị, không mật khẩu thiết bị).
-- SQL Editor chạy với quyền postgres/service_role → bypass RLS, seed OK.
-- =====================================================================

BEGIN;

-- Users: 4 role, password_hash là CHUỖI GIẢ để demo, không phải hash thật.
-- Trong production phải thay bằng Supabase Auth (auth.users) + bảng profile.
INSERT INTO public.users (id, email, password_hash, role, team, active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'demo.employee@fdi.local', 'SEED_ONLY_NOT_A_REAL_HASH', 'employee', 'team-alpha', TRUE),
  ('22222222-2222-2222-2222-222222222222', 'demo.leader@fdi.local',   'SEED_ONLY_NOT_A_REAL_HASH', 'leader',   'team-alpha', TRUE),
  ('33333333-3333-3333-3333-333333333333', 'demo.manager@fdi.local',  'SEED_ONLY_NOT_A_REAL_HASH', 'manager',  'operations',  TRUE),
  ('44444444-4444-4444-4444-444444444444', 'demo.director@fdi.local', 'SEED_ONLY_NOT_A_REAL_HASH', 'director', 'board',      TRUE)
ON CONFLICT (id) DO NOTHING;
-- (email cũng có UNIQUE → nếu chạy lại sau khi đổi id vẫn không trùng email)

-- Customer (1)
INSERT INTO public.customers (id, name, phone, email, industry, contact_technical, contact_commercial, contact_emergency) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Khách hàng Demo FDI', '0900000000', 'demo@fdi.local', 'Manufacturing',
   'Kỹ thuật Demo', 'Kinh doanh Demo', 'Hotline Demo')
ON CONFLICT (id) DO NOTHING;

-- Site (1)
INSERT INTO public.sites (id, name, customer_id, address, contact, working_hours) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Site HCM Demo',
   'aaaaaaaa-0000-0000-0000-000000000001', 'Quận 1, TP.HCM', '0900000001',
   '{"mon_fri":"08:00-17:00","sat":"08:00-12:00","sun":null}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Project (1)
INSERT INTO public.projects (id, customer_id, site_id, name, status, start_date, end_date, progress, pm_id, color, checklist) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000002',
   'Dự án triển khai Demo', 'in_progress', DATE '2026-11-01', DATE '2026-12-31',
   35.00, '11111111-1111-1111-1111-111111111111', '#3b82f6',
   '{"survey":true,"deployment":false,"acceptance":false}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Devices (vài cái; serial unique per project, mac unique)
INSERT INTO public.devices (id, project_id, site_id, serial, type, model, mac_address, rack_id, location, warranty_from, warranty_to, status) VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'DEMO-SW-001', 'Switch', 'DemoSwitch24', '00:11:22:33:44:01', 'RACK-A1', 'Tầng 1', DATE '2026-01-01', DATE '2028-01-01', 'active'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'DEMO-RT-002', 'Router',  'DemoRouterX',  '00:11:22:33:44:02', 'RACK-A1', 'Tầng 1', DATE '2026-01-01', DATE '2028-01-01', 'active'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'DEMO-AP-003',  'AP',      'DemoAP v2',    '00:11:22:33:44:03', NULL,      'Tầng 2', DATE '2025-01-01', DATE '2026-06-01', 'expired')
ON CONFLICT (id) DO NOTHING;

-- Alerts (vài cái: critical/major/minor)
INSERT INTO public.alerts (id, device_id, site_id, project_id, severity, status, priority, owner_id, description, source, resolved_at) VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 'critical', 'new',         'high',     '11111111-1111-1111-1111-111111111111', 'Switch demo mất kết nối', 'monitoring', NULL),
  ('cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 'major',    'in_progress', 'medium',   '11111111-1111-1111-1111-111111111111', 'Router demo cảnh báo tải cao', 'monitoring', NULL),
  ('cccccccc-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 'minor',    'resolved',    'low',      '11111111-1111-1111-1111-111111111111', 'AP demo hết hạn bảo hành', 'manual', TIMESTAMPTZ '2026-11-10 03:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Maintenances (1 regular + 1 emergency)
INSERT INTO public.maintenances (id, device_id, project_id, type, schedule, due_date, status, checklist, result) VALUES
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 'regular',   '{"freq":"monthly"}'::jsonb, DATE '2026-11-20', 'scheduled', '{"check_power":true,"check_ports":false}'::jsonb, NULL),
  ('dddddddd-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 'emergency', NULL, DATE '2026-11-18', 'in_progress', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Works (gắn project + incident; employee được gán)
INSERT INTO public.works (id, project_id, incident_id, assignee_id, creator_id, type, title, description, status, priority, due_date) VALUES
  ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'incident', 'Khôi phục Switch demo', 'Kiểm tra nguồn và cổng', 'in_progress', 'high', DATE '2026-11-18'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', NULL, '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'deployment', 'Cấu hình VLAN demo', 'Cấu hình VLAN 10/20', 'todo', 'medium', DATE '2026-11-22')
ON CONFLICT (id) DO NOTHING;

-- Reports (1 survey)
INSERT INTO public.reports (id, project_id, user_id, type, content, progress, photos, signature) VALUES
  ('ffffffff-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'survey', 'Khảo sát site demo', '{"done":40,"total":100}'::jsonb, '[]'::jsonb, NULL)
ON CONFLICT (id) DO NOTHING;

-- Documents (1)
INSERT INTO public.documents (id, project_id, name, file_url, type, version) VALUES
  ('ffffffff-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 'Site survey demo.pdf', 'https://example.invalid/demo/site-survey.pdf', 'survey', 1)
ON CONFLICT (id) DO NOTHING;

-- Config mẫu (danh mục dùng chung) — name UNIQUE
INSERT INTO public.config (id, name, type, value, color) VALUES
  ('ffffffff-0000-0000-0000-000000000003', 'device_type', 'list', '["Switch","Router","Firewall","AP","Camera","Server"]'::jsonb, NULL),
  ('ffffffff-0000-0000-0000-000000000004', 'incident_severity', 'list', '["critical","major","minor"]'::jsonb, '#ef4444')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.schema_migrations (version, note)
VALUES ('003_seed', 'Seed demo tối thiểu: 1 customer, 1 site, 1 project, 3 device, 3 alert, 2 maintenance, 2 work, 1 report')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Verify nhanh (đếm row theo bảng):
-- SELECT 'users' t, count(*) FROM public.users UNION ALL
-- SELECT 'customers', count(*) FROM public.customers UNION ALL
-- SELECT 'sites', count(*) FROM public.sites UNION ALL
-- SELECT 'projects', count(*) FROM public.projects UNION ALL
-- SELECT 'devices', count(*) FROM public.devices UNION ALL
-- SELECT 'alerts', count(*) FROM public.alerts UNION ALL
-- SELECT 'maintenances', count(*) FROM public.maintenances UNION ALL
-- SELECT 'works', count(*) FROM public.works UNION ALL
-- SELECT 'reports', count(*) FROM public.reports UNION ALL
-- SELECT 'documents', count(*) FROM public.documents UNION ALL
-- SELECT 'config', count(*) FROM public.config;
-- Kỳ vọng: users=4, customers=1, sites=1, projects=1, devices=3, alerts=3,
--           maintenances=2, works=2, reports=1, documents=1, config=2.
