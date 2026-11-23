-- ============================================================================
-- FDI_Project — Migration 014 : VÁ LỖ HỔNG RLS HOẠT ĐỘNG (log_customer_activity)
-- ----------------------------------------------------------------------------
-- LỖ HỔNG CỦA MIGRATION 013 (đã apply):
--   013 tạo RPC public.log_activity(...) SECURITY DEFINER và GRANT EXECUTE cho
--   anon + authenticated, nhưng CHỈ kiểm auth.uid()/fdi_current_user_id() —
--   KHÔNG kiểm public.fdi_can_read(NULL, p_entity_id, ...). Comment trong 013
--   nói rõ: "KHÔNG kiểm fdi_can_read ở đây… người không đọc được KH cũng không
--   nên ghi".
--   Hệ quả: activities.entity_id KHÔNG có FK vật lý (đa hình) và policy INSERT
--   chỉ chặn created_by = auth.uid(). Mọi thứ GHI đều do chính RPC sinh ra →
--   BẤT KỲ user authenticated nào (kể cả employee/leader) cũng ghi được hoạt
--   động vào khách hàng CỦA NGƯỜI KHÁC → LỖ HỔNG phạm vi dữ liệu.
--
-- CÁCH 014 VÁ (idempotent, KHÔNG DROP function/policy đã có):
--   1) Thêm RPC MỚI public.log_customer_activity(p_entity_id UUID, ...) → UUID,
--      SECURITY DEFINER, SET search_path = public, pg_temp. BẮT BUỘC:
--        - uid NOT NULL                       → RAISE EXCEPTION 'unauthorized' (42501)
--        - fdi_can_read(NULL, p_entity_id,...) = TRUE
--                                               → RAISE EXCEPTION
--                                                 'khong co quyen ghi hoat dong cho doi tuong nay' (42501)
--        - p_activity_type NOT NULL rỗng; status ∈ ('planned','done','failed','no_answer')
--        - entity_type LUÔN 'customer', owner_id = created_by = uid, occurred_at/
--          done_at theo ĐÚNG rule của 013.
--      ĐÂY LÀ ĐIỂM KHÁC so với 013.log_activity.
--   2) Copy NGUYÊN THÂN create_customer_with_activity(JSONB, JSONB, UUID) từ 013
--      vào 014 (CREATE OR REPLACE, signature không đổi) để 014 là bản vá đầy đủ
--      và apply lại được. Không sửa logic/hành vi của hàm này.
--   3) REVOKE ALL FROM PUBLIC + GRANT EXECUTE TO anon, authenticated,
--      service_role cho log_customer_activity (và copy lại grant cho
--      create_customer_with_activity).
--   4) Ghi schema_migrations version 014.
--
--   ⚠️ log_activity của 013 GIỮ NGUYÊN (không sửa/xoá) để không phá app đang dùng;
--      giới hạn phạm vi ghi của nó nằm ở tầng app/PO. Muốn siết hơn nữa thì
--      chuyển client sang log_customer_activity.
--
-- PHẠM VI: CHỈ object MỚI + CREATE OR REPLACE nguyên thân. KHÔNG DROP TABLE /
--          DROP FUNCTION / DROP POLICY. KHÔNG sửa file ngoài migrations/.
--
-- ⚠️ APPLY THỦ CÔNG bằng Supabase SQL Editor (agent KHÔNG có quyền DB).
-- Thứ tự: chạy SAU 013 (cần activities + fdi_can_read từ 002/011/012).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) RPC MỚI: log_customer_activity(...) → UUID
--    Chỉ ghi hoạt động cho KH mà uid hiện tại ĐỌC ĐƯỢC (fdi_can_read).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_customer_activity(
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
  v_uid  UUID := public.fdi_current_user_id();
  v_id   UUID;
  v_meta JSONB := COALESCE(p_metadata, '{}'::jsonb);
BEGIN
  -- (a) Đăng nhập bắt buộc — ĐÚNG như 013.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = '42501';
  END IF;

  -- (b) ĐIỂM MỚI SO VỚI 013: chặn ghi vào KH ngoài phạm vi đọc.
  --     Dùng ĐÚNG hàm phạm vi đọc của customers_select (002 → 011 → 012).
  IF p_entity_id IS NULL
     OR NOT public.fdi_can_read(NULL, p_entity_id, NULL, NULL, NULL, NULL) THEN
    RAISE EXCEPTION 'khong co quyen ghi hoat dong cho doi tuong nay'
      USING ERRCODE = '42501';
  END IF;

  -- (c) Kiểm đầu vào.
  IF p_activity_type IS NULL OR btrim(p_activity_type) = '' THEN
    RAISE EXCEPTION 'thieu loai hoat dong'
      USING ERRCODE = '22023';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('planned','done','failed','no_answer') THEN
    RAISE EXCEPTION 'status phai la planned|done|failed|no_answer'
      USING ERRCODE = '22023';
  END IF;

  -- occurred_at / done_at: ĐÚNG rule 013 — now() khi hoạt động đã xong,
  -- ngược lại để NULL (chưa xảy ra); done_at chỉ khi status = 'done'.
  INSERT INTO public.activities (
    entity_type, entity_id, activity_type, channel, direction, status,
    subject, body, occurred_at, scheduled_at, done_at,
    owner_id, created_by, metadata, created_at, updated_at
  ) VALUES (
    'customer', p_entity_id, p_activity_type, p_channel, p_direction, p_status,
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

REVOKE ALL ON FUNCTION public.log_customer_activity(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_customer_activity(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, JSONB
) TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2) COPY NGUYÊN THÂN create_customer_with_activity từ 013 (để 014 là bản vá
--    đầy đủ, apply lại được). Signature không đổi → CREATE OR REPLACE.
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
-- 3) Đăng ký version migration.
-- ----------------------------------------------------------------------------
INSERT INTO public.schema_migrations (version, note)
VALUES (
  '014_customer_activity_scope',
  'VA LO HOUNG RLS 013: them RPC log_customer_activity CO kiem public.fdi_can_read(NULL, p_entity_id, ...) (013.log_activity chi kiem auth.uid nen moi user authenticated ghi duoc hoat dong cua KH nguoi khac). Copy nguyen than create_customer_with_activity tu 013 (idempotent). Khong DROP function/policy.'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ----------------------------------------------------------------------------
-- VERIFY NHANH (dán riêng trong SQL Editor):
-- SELECT proname FROM pg_proc
--   WHERE proname IN ('log_activity','log_customer_activity','create_customer_with_activity');
-- SELECT version FROM public.schema_migrations WHERE version='014_customer_activity_scope';
-- ----------------------------------------------------------------------------
