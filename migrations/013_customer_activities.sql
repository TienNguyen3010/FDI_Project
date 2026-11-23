-- ============================================================================
-- FDI_Project — Migration 013 : HOẠT ĐỘNG / ACTIVITIES (kiến trúc ĐA HÌNH)
-- ----------------------------------------------------------------------------
-- YÊU CẦU CỦA USER (Tien Nguyen):
--   "muốn thiết kế phần Hoạt động/Activities giống SoftNET CRM để lưu MỌI hoạt
--    động liên quan tới khách hàng (và sau này dự án/site)."
--
-- GỐC THAM CHIẾU: /opt/data/tien_crm/sql/0012_activities_polymorphic.sql
--   (schema SoftNET CRM v8 — bảng activities ĐA HÌNH entity_type/entity_id).
--   Bản FDI GIỮ ĐÚNG Ý ĐỒ gốc: tên bảng/cột, activity_types, channels,
--   log_activity(). Khác có chủ ý ở chỗ được ghi chú tại từng mục.
--
-- FDI_Project TRƯỚC 013 CHƯA CÓ: activities, activity_types, channels,
-- geo_subdivisions (grep toàn repo = 0 kết quả) → 013 tạo mới, KHÔNG phải
-- upgrade bảng cũ như gốc SoftNET (0012 phải ALTER bảng đã tồn tại).
--
-- PHẠM VI: CHỈ tạo object MỚI. KHÔNG DROP function/policy đã có; chỉ dùng
--   CREATE OR REPLACE / CREATE [TABLE|INDEX] IF NOT EXISTS /
--   DROP POLICY IF EXISTS + CREATE POLICY / ON CONFLICT DO NOTHING.
--
-- ⚠️ APPLY THỦ CÔNG bằng Supabase SQL Editor (agent KHÔNG có quyền DB).
-- Thứ tự: chạy SAU 001 → 012 (đặc biệt cần 010 cho trigger sinh mã KH,
--         011/012 cho fdi_can_read / fdi_is_manager_plus).
--
-- NỘI DUNG:
--   1) Lookup  public.activity_types, public.channels (+ seed idempotent).
--   2) Bảng    public.activities — ĐA HÌNH (entity_type, entity_id).
--   3) Indexes  (entity_type, entity_id, created_at DESC) + 2 index phụ.
--   4) RLS      activities + lookup; SELECT đi qua public.fdi_can_read.
--   5) RPC      public.log_activity(...)  → UUID   (SECURITY DEFINER).
--   6) RPC      public.create_customer_with_activity(...) → JSONB
--               (nguyên tử + idempotent qua metadata->>'idem_key').
--   7) Ghi      public.schema_migrations version 013.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1) LOOKUP TABLES — config-driven: thêm kênh/loại chỉ là 1 INSERT.
--    Khớp gốc SoftNET 0012 (activity_types: code/label/icon/is_auto_logged/
--    default_channel; channels: code/label/two_way_sync/provider).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_types (
  code            TEXT PRIMARY KEY,
  label           TEXT NOT NULL,
  icon            TEXT,
  is_auto_logged  BOOLEAN NOT NULL DEFAULT TRUE,
  default_channel TEXT
);

CREATE TABLE IF NOT EXISTS public.channels (
  code          TEXT PRIMARY KEY,
  label         TEXT NOT NULL,
  two_way_sync  BOOLEAN NOT NULL DEFAULT FALSE,
  provider      TEXT
);

COMMENT ON TABLE public.activity_types IS
  'Migration 013: lookup loại hoạt động (call/email/meeting/note/task/other...). Tham chiếu gốc SoftNET CRM 0012_activities_polymorphic.sql. Thêm loại = 1 INSERT, không cần migration.';
COMMENT ON COLUMN public.activity_types.default_channel IS
  'Kênh mặc định gợi ý khi tạo hoạt động loại này (tham chiếu channels.code); NULL = không gợi ý.';
COMMENT ON TABLE public.channels IS
  'Migration 013: lookup kênh liên hệ (phone/zalo/email/sms/inapp/manual). Tham chiếu gốc SoftNET CRM 0012_activities_polymorphic.sql.';
COMMENT ON COLUMN public.channels.two_way_sync IS
  'true = kênh đồng bộ hai chiều với nhà cung cấp (vd Zalo). Chỉ metadata, chưa có tích hợp thật ở 013.';

-- ----------------------------------------------------------------------------
-- 2) BẢNG activities — ĐA HÌNH
--    entity_type ∈ {customer, project, site}; entity_id = id của đối tượng.
--
--    ⚠️ entity_id CỐ Ý KHÔNG CÓ FK VẬT LÝ:
--      Một cột UUID không thể tham chiếu cùng lúc 3 bảng cha khác nhau
--      (customers / projects / sites) — Postgres không có "polymorphic FK".
--      Đây là thiết kế GIỐNG GỐC SoftNET (entity_id uuid, không FK). Tầng app/
--      PO chịu trách nhiệm toàn vẹn tham chiếu. Đổi lại: không có FK xóa
--      CASCADE → khi xóa khách hàng, activities của KH đó phải do tầng app/
--      dọn (hoặc thêm trigger ở migration sau).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activities (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Đối tượng gắn hoạt động: 'customer' | 'project' | 'site'.
  entity_type   TEXT        NOT NULL
                CONSTRAINT activities_entity_type_check
                  CHECK (entity_type IN ('customer','project','site')),
  -- KHÔNG FK vật lý (đa hình — xem ghi chú đầu bảng).
  entity_id     UUID        NOT NULL,
  activity_type TEXT        NOT NULL
                CONSTRAINT activities_activity_type_fkey
                  REFERENCES public.activity_types(code),
  channel       TEXT
                CONSTRAINT activities_channel_fkey
                  REFERENCES public.channels(code),
  direction     TEXT
                CONSTRAINT activities_direction_check
                  CHECK (direction IN ('inbound','outbound') OR direction IS NULL),
  status        TEXT        NOT NULL DEFAULT 'planned'
                CONSTRAINT activities_status_check
                  CHECK (status IN ('planned','done','failed','no_answer')),
  subject       TEXT,
  body          TEXT,
  occurred_at   TIMESTAMPTZ,
  scheduled_at  TIMESTAMPTZ,
  done_at       TIMESTAMPTZ,
  owner_id      UUID
                CONSTRAINT activities_owner_id_fkey
                  REFERENCES public.users(id) ON DELETE SET NULL,
  created_by    UUID
                CONSTRAINT activities_created_by_fkey
                  REFERENCES public.users(id) ON DELETE SET NULL,
  metadata      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.activities IS
  'Migration 013: nhật ký HOẠT ĐỘNG ĐA HÌNH gắn với customer/project/site (entity_type + entity_id). entity_id KHÔNG FK vật lý vì một cột không tham chiếu được 3 bảng cha — giống gốc SoftNET CRM 0012.';
COMMENT ON COLUMN public.activities.entity_type IS
  'Loại đối tượng: customer | project | site. Mở rộng bằng cách nới CHECK (migration sau) + tầng app hỗ trợ.';
COMMENT ON COLUMN public.activities.entity_id IS
  'id của customer/project/site tương ứng. KHÔNG FK (đa hình); toàn vẹn do tầng app/PO đảm bảo.';
COMMENT ON COLUMN public.activities.status IS
  'planned = đang lên lịch; done = đã xong; failed = thất bại; no_answer = gọi không bắt máy. Mặc định planned.';
COMMENT ON COLUMN public.activities.occurred_at IS
  'Thời điểm hoạt động THỰC SỰ xảy ra. NULL khi mới lên lịch (chưa xảy ra).';
COMMENT ON COLUMN public.activities.scheduled_at IS
  'Thời điểm KẾ HOẠCH. Dùng cho công việc cần nhắc lịch.';
COMMENT ON COLUMN public.activities.done_at IS
  'Thời điểm đánh dấu xong. NULL = chưa xong.';
COMMENT ON COLUMN public.activities.metadata IS
  'JSONB linh hoạt. Khoá `idem_key` (UUID) dùng cho idempotency RPC create_customer_with_activity: nếu đã có bản ghi cùng idem_key thì trả kết quả cũ, không tạo trùng.';

-- ----------------------------------------------------------------------------
-- 3) INDEXES
--    (1) đúng yêu cầu: (entity_type, entity_id, created_at DESC) — biểu đồ
--        dòng thời gian hoạt động của 1 đối tượng.
--    (2) (owner_id, status) — "việc của tôi / cần làm".
--    (3) (entity_id, scheduled_at) WHERE scheduled_at IS NOT NULL — lịch sắp tới.
--    Gốc SoftNET dùng occurred_at DESC ở index (1); FDI chọn created_at DESC
--    vì occurred_at có thể NULL khi mới lên lịch → bỏ các dòng thực tế vừa tạo.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_activities_entity
  ON public.activities (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_owner_status
  ON public.activities (owner_id, status);
CREATE INDEX IF NOT EXISTS idx_activities_entity_scheduled
  ON public.activities (entity_id, scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_idem_key
  ON public.activities ((metadata ->> 'idem_key')) WHERE metadata ? 'idem_key';

-- Trigger cập nhật updated_at: dùng lại hàm chuẩn public.fdi_set_updated_at()
-- của 001 (KHÔNG tạo hàm mới). Tên trigger theo đúng quy ước 001:
-- trg_<table>_updated_at. Guard bằng pg_trigger để re-run an toàn.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'trg_activities_updated_at'
       AND tgrelid = 'public.activities'::regclass
  ) THEN
    CREATE TRIGGER trg_activities_updated_at
      BEFORE UPDATE ON public.activities
      FOR EACH ROW EXECUTE FUNCTION public.fdi_set_updated_at();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4) RLS
--    Lookup: authenticated đọc được (giống gốc SoftNET 0012).
--    activities: KHÔNG tự mở rộng quyền — dùng ĐÚNG hàm phạm vi đọc của 002/011
--    (fdi_can_read) để khớp với policy customers_select hiện tại:
--      SELECT  → fdi_can_read(NULL, entity_id, NULL, NULL, NULL, NULL)
--      INSERT  → created_by = auth.uid() (owner_id = auth.uid() đã ghi ở RPC)
--      UPDATE  → owner/creator = auth.uid()
--      DELETE  → owner/creator = auth.uid() (gốc SoftNET để USING(false); FDI
--               cho phép người tạo xoá hoạt động của chính mình, vẫn KHÔNG vượt
--               phạm vi fdi_can_read)
-- ----------------------------------------------------------------------------
ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities     ENABLE ROW LEVEL SECURITY;

-- Lookup: read-only cho authenticated.
DROP POLICY IF EXISTS fdi_activity_types_select ON public.activity_types;
CREATE POLICY fdi_activity_types_select
  ON public.activity_types FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS fdi_channels_select ON public.channels;
CREATE POLICY fdi_channels_select
  ON public.channels FOR SELECT TO authenticated
  USING (TRUE);

-- activities: đọc theo ĐÚNG phạm vi customers_select (khớp fdi_can_read).
DROP POLICY IF EXISTS fdi_activities_select ON public.activities;
CREATE POLICY fdi_activities_select ON public.activities FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND public.fdi_can_read(NULL, entity_id, NULL, NULL, NULL, NULL)
  );

-- Chỉ được ghi hoạt động do mình tạo/gán.
DROP POLICY IF EXISTS fdi_activities_insert ON public.activities;
CREATE POLICY fdi_activities_insert ON public.activities FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (created_by = auth.uid() OR owner_id = auth.uid())
  );

DROP POLICY IF EXISTS fdi_activities_update ON public.activities;
CREATE POLICY fdi_activities_update ON public.activities FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (created_by = auth.uid() OR owner_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (created_by = auth.uid() OR owner_id = auth.uid())
  );

DROP POLICY IF EXISTS fdi_activities_delete ON public.activities;
CREATE POLICY fdi_activities_delete ON public.activities FOR DELETE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (created_by = auth.uid() OR owner_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 5) RPC log_activity(...) → UUID
--    SECURITY DEFINER + search_path cố định; tự kiểm auth.uid() → an toàn khi
--    GRANT cho anon (trình duyệt dùng anon key). owner_id/created_by = uid.
--    KHÔNG kiểm fdi_can_read ở đây: log_activity chỉ GHI, phạm vi đọc do policy
--    đảm nhiệm (người không đọc được KH cũng không nên ghi — xem ghi chú ở
--    create_customer_with_activity để biết RPC nào có kiểm quyền).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_activity(
  p_entity_type   TEXT,
  p_entity_id     UUID,
  p_activity_type TEXT,
  p_channel       TEXT DEFAULT NULL,
  p_subject       TEXT DEFAULT NULL,
  p_body          TEXT DEFAULT NULL,
  p_direction     TEXT DEFAULT NULL,
  p_status        TEXT DEFAULT 'planned',
  p_scheduled_at  TIMESTAMPTZ DEFAULT NULL,
  p_metadata      JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_uid   UUID := public.fdi_current_user_id();
  v_id    UUID;
  v_meta  JSONB := COALESCE(p_metadata, '{}'::jsonb);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = '42501';
  END IF;

  -- Chặn entity_type lạ (CHECK ở bảng cũng chặn, nhưng báo lỗi rõ hơn).
  IF p_entity_type IS NULL OR p_entity_type NOT IN ('customer','project','site') THEN
    RAISE EXCEPTION 'entity_type phai la customer|project|site'
      USING ERRCODE = '22023';
  END IF;
  IF p_entity_id IS NULL THEN
    RAISE EXCEPTION 'entity_id khong duoc de trong'
      USING ERRCODE = '22023';
  END IF;

  -- occurred_at: mặc định now() khi hoạt động đã xong, ngược lại để NULL (chưa xảy ra).
  INSERT INTO public.activities (
    entity_type, entity_id, activity_type, channel, direction, status,
    subject, body, occurred_at, scheduled_at, done_at,
    owner_id, created_by, metadata, created_at, updated_at
  ) VALUES (
    p_entity_type, p_entity_id, p_activity_type, p_channel, p_direction, p_status,
    p_subject, p_body,
    CASE WHEN p_status IN ('done','failed','no_answer') THEN now() ELSE NULL END,
    p_scheduled_at,
    CASE WHEN p_status = 'done' THEN now() ELSE NULL END,
    v_uid, v_uid, v_meta, now(), now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.log_activity(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_activity(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, JSONB
) TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6) RPC create_customer_with_activity(...) → JSONB
--    Thay thế hành vi "insert customer trực tiếp từ client": một transaction
--    nguyên tử tạo khách hàng (+ hoạt động đầu tiên) và idempotent.
--
--    - SECURITY DEFINER + search_path cố định.
--    - Quyền insert KH: public.fdi_is_manager_plus() — ĐÚNG như policy
--      fdi_customers_insert (002 → 012). KHÔNG lách RLS.
--    - Hoạt động: chỉ thêm khi uid đọc được KH mới qua
--      public.fdi_can_read(NULL, v_customer_id, ...) — ĐÚNG như customers_select.
--    - code: KHÔNG nhận từ client; do trigger 010 (trg_customers_set_code)
--      sinh CUS-YYYY-NNN.
--    - Idempotent: nếu đã tồn tại activities với metadata->>'idem_key' =
--      p_idem_key thì trả lại kết quả cũ (customer_id + activity_id), KHÔNG
--      tạo bản ghi trùng.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_customer_with_activity(
  p_customer  JSONB,
  p_activity  JSONB DEFAULT NULL,
  p_idem_key  UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_uid         UUID := public.fdi_current_user_id();
  v_customer_id UUID;
  v_activity_id UUID;
  v_existing    UUID;
  v_result      JSONB;
  v_name        TEXT;
  v_act_type    TEXT;
  v_meta        JSONB;
BEGIN
  -- --- Idempotency: trả kết quả cũ nếu idem_key đã dùng -------------------
  IF p_idem_key IS NOT NULL THEN
    SELECT a.entity_id, a.id
      INTO v_customer_id, v_activity_id
      FROM public.activities a
     WHERE a.entity_type = 'customer'
       AND a.metadata ->> 'idem_key' = p_idem_key::text
     LIMIT 1;

    IF v_customer_id IS NOT NULL THEN
      -- Xác nhận KH còn tồn tại; nếu đã bị xoá thì coi như hết hiệu lực.
      IF EXISTS (SELECT 1 FROM public.customers c WHERE c.id = v_customer_id) THEN
        RETURN jsonb_build_object(
          'customer_id', v_customer_id,
          'activity_id', v_activity_id,
          'idempotent',  TRUE
        );
      END IF;
      v_customer_id := NULL;
      v_activity_id := NULL;
    END IF;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = '42501';
  END IF;

  -- --- Quyền tạo khách hàng: ĐÚNG policy fdi_customers_insert -------------
  IF NOT public.fdi_is_manager_plus() THEN
    RAISE EXCEPTION 'khong co quyen tao khach hang'
      USING ERRCODE = '42501';
  END IF;

  IF p_customer IS NULL OR p_customer = '{}'::jsonb THEN
    RAISE EXCEPTION 'p_customer khong duoc de trong'
      USING ERRCODE = '22023';
  END IF;

  v_name := NULLIF(btrim(p_customer ->> 'name'), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'thieu ten khach hang'
      USING ERRCODE = '22023';
  END IF;

  -- --- INSERT khách hàng: bỏ `code` (do DB trigger sinh), bỏ id nếu client gửi.
  --     Các cột khớp customers (001 + 008 + 009 + 010).
  INSERT INTO public.customers (
    name, phone, email, industry,
    contact_technical, contact_commercial, contact_emergency,
    tax_id, headquarters_address,
    primary_contact_name, primary_contact_position, notes,
    consent_contact, consent_contact_at,
    created_at, updated_at
  ) VALUES (
    v_name,
    NULLIF(btrim(p_customer ->> 'phone'), ''),
    NULLIF(btrim(p_customer ->> 'email'), ''),
    NULLIF(btrim(p_customer ->> 'industry'), ''),
    NULLIF(btrim(p_customer ->> 'contact_technical'), ''),
    NULLIF(btrim(p_customer ->> 'contact_commercial'), ''),
    NULLIF(btrim(p_customer ->> 'contact_emergency'), ''),
    NULLIF(btrim(p_customer ->> 'tax_id'), ''),
    NULLIF(btrim(p_customer ->> 'headquarters_address'), ''),
    NULLIF(btrim(p_customer ->> 'primary_contact_name'), ''),
    NULLIF(btrim(p_customer ->> 'primary_contact_position'), ''),
    NULLIF(btrim(p_customer ->> 'notes'), ''),
    COALESCE((p_customer ->> 'consent_contact')::boolean, FALSE),
    (p_customer ->> 'consent_contact_at')::timestamptz,
    now(), now()
  )
  RETURNING id INTO v_customer_id;

  -- --- Hoạt động đi kèm (tùy chọn) ----------------------------------------
  IF p_activity IS NOT NULL AND p_activity <> '{}'::jsonb THEN
    -- Kiểm phạm vi đọc KH mới: ĐÚNG customers_select. Với manager/director/PM
    -- thì fdi_can_read = TRUE; với leader/employee thì KH vừa tạo có thể chưa
    -- nằm trong phạm vi (chưa gán project) → bỏ qua hoạt động, vẫn tạo KH.
    IF public.fdi_can_read(NULL, v_customer_id, NULL, NULL, NULL, NULL) THEN
      v_act_type := NULLIF(btrim(p_activity ->> 'activity_type'), '');
      IF v_act_type IS NULL THEN
        v_act_type := 'note';
      END IF;

      v_meta := COALESCE(p_activity -> 'metadata', '{}'::jsonb);
      IF p_idem_key IS NOT NULL THEN
        v_meta := COALESCE(v_meta, '{}'::jsonb) || jsonb_build_object('idem_key', p_idem_key);
      END IF;

      INSERT INTO public.activities (
        entity_type, entity_id, activity_type, channel, direction, status,
        subject, body, occurred_at, scheduled_at, done_at,
        owner_id, created_by, metadata, created_at, updated_at
      ) VALUES (
        'customer', v_customer_id, v_act_type,
        NULLIF(btrim(p_activity ->> 'channel'), ''),
        NULLIF(btrim(p_activity ->> 'direction'), ''),
        COALESCE(NULLIF(btrim(p_activity ->> 'status'), ''), 'planned'),
        NULLIF(btrim(p_activity ->> 'subject'), ''),
        NULLIF(btrim(p_activity ->> 'body'), ''),
        CASE WHEN COALESCE(NULLIF(btrim(p_activity ->> 'status'), ''), 'planned') IN ('done','failed','no_answer')
             THEN now() ELSE NULL END,
        (p_activity ->> 'scheduled_at')::timestamptz,
        CASE WHEN COALESCE(NULLIF(btrim(p_activity ->> 'status'), ''), 'planned') = 'done'
             THEN now() ELSE NULL END,
        v_uid, v_uid, v_meta, now(), now()
      )
      RETURNING id INTO v_activity_id;
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'customer_id', v_customer_id,
    'activity_id', v_activity_id,
    'idempotent',  FALSE
  );

  RETURN v_result;
END;
$fn$;

REVOKE ALL ON FUNCTION public.create_customer_with_activity(JSONB, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_customer_with_activity(JSONB, JSONB, UUID)
  TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6b) GRANT quyền bảng (Supabase default: authenticated có quyền nền; liệt kê
--     tường minh để chắc chắn). KHÔNG cấp quyền ngoài phạm vi RLS.
-- ----------------------------------------------------------------------------
GRANT SELECT ON public.activity_types, public.channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;

-- ----------------------------------------------------------------------------
-- 7) SEED lookup (idempotent)
--    activity_types: call/email/meeting/note/task/other
--    channels:       phone/zalo/email/sms/inapp/manual   (đúng yêu cầu user)
-- ----------------------------------------------------------------------------
INSERT INTO public.activity_types (code, label, icon, is_auto_logged, default_channel) VALUES
  ('call',    'Call',    'phone',  TRUE,  'phone'),
  ('email',   'Email',   'mail',   TRUE,  'email'),
  ('meeting', 'Meeting', 'users',  TRUE,  'inapp'),
  ('note',    'Note',    'sticky', FALSE, 'manual'),
  ('task',    'Task',    'check',  FALSE, 'manual'),
  ('other',   'Other',   'ellipsis', FALSE, 'manual')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.channels (code, label, two_way_sync, provider) VALUES
  ('phone',  'Phone',  FALSE, 'voip'),
  ('zalo',   'Zalo',   TRUE,  'zalo'),
  ('email',  'Email',  TRUE,  'smtp'),
  ('sms',    'SMS',    TRUE,  'twilio'),
  ('inapp',  'In-app', FALSE, 'fdi'),
  ('manual', 'Manual', FALSE, NULL)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 8) Đăng ký version migration.
-- ----------------------------------------------------------------------------
INSERT INTO public.schema_migrations (version, note)
VALUES (
  '013_customer_activities',
  'Activities da hinh (entity_type/entity_id customer|project|site) + lookup activity_types/channels + RLS theo fdi_can_read + RPC log_activity & create_customer_with_activity (nguyen tu + idempotent). Tham chieu goc SoftNET CRM 0012_activities_polymorphic.sql.'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ----------------------------------------------------------------------------
-- VERIFY NHANH (dán riêng trong SQL Editor):
-- SELECT tablename FROM pg_tables WHERE schemaname='public'
--   AND tablename IN ('activities','activity_types','channels') ORDER BY 1;   -- 3
-- SELECT relname, relrowsecurity FROM pg_class
--   WHERE relnamespace='public'::regnamespace AND relkind='r'
--     AND relname IN ('activities','activity_types','channels');               -- true
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname='public'
--   AND tablename IN ('activities','activity_types','channels')
--   ORDER BY 1,2;                                                            -- 6 policy
-- SELECT code FROM public.activity_types ORDER BY code;   -- call/email/meeting/note/other/task
-- SELECT code FROM public.channels ORDER BY code;         -- email/inapp/manual/phone/sms/zalo
-- SELECT proname FROM pg_proc WHERE proname IN ('log_activity','create_customer_with_activity');
-- SELECT version FROM public.schema_migrations WHERE version='013_customer_activities';
-- ----------------------------------------------------------------------------
