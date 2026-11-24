-- 015_customer_lifecycle_stage.sql — Trạng thái vận hành của khách hàng (PSM).
--
-- Vì sao: dự án là PSM (theo dõi dự án triển khai / đã triển khai / vận hành /
-- bảo trì). `customers.status` TRƯỚC đây là giá trị BỊA ('active' hardcode ở API),
-- filter inactive/archived luôn trả rỗng. Thay bằng lifecycle_stage THẬT.
--
-- Idempotent: chạy lại được. KHÔNG DROP function/policy. Chạy sau 014.
BEGIN;

-- ---------------------------------------------------------------------
-- 1) Cột mới + backfill theo dữ liệu THẬT đã có:
--    - KH có project đang triển khai (status active/in_progress/planned) → 'implementing'
--    - KH chỉ có project đã xong (completed/closed)              → 'operating'
--    - còn lại                                                     → 'prospect'
--    Không suy đoán ngoài dữ liệu hiện có.
-- ---------------------------------------------------------------------
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='customers'
               AND column_name='lifecycle_stage') THEN
    -- phòng khi ALTER rồi nhưng backfill chưa chạy
    NULL;
  END IF;
END $$;

UPDATE public.customers c
   SET lifecycle_stage = COALESCE(c.lifecycle_stage, sub.stage)
  FROM (
        SELECT p.customer_id,
               CASE
                 WHEN bool_or(p.status IN ('active','in_progress','planned')) THEN 'implementing'
                 WHEN count(*) > 0                                           THEN 'operating'
                 ELSE 'prospect'
               END AS stage
          FROM public.projects p
         GROUP BY p.customer_id
       ) sub
 WHERE c.id = sub.customer_id;

UPDATE public.customers SET lifecycle_stage = 'prospect'
 WHERE lifecycle_stage IS NULL OR lifecycle_stage = '';

-- Ràng buộc giá trị — tránh nhập chữ tùy ý.
ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_lifecycle_stage_check;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_lifecycle_stage_check
  CHECK (lifecycle_stage IN ('prospect','implementing','operating','maintenance','stopped'));

COMMENT ON COLUMN public.customers.lifecycle_stage IS
  'Vòng đời vận hành (PSM): prospect | implementing | operating | maintenance | stopped';

-- Index cho filter list (index nhỏ, idempotent).
CREATE INDEX IF NOT EXISTS customers_lifecycle_stage_idx
  ON public.customers (lifecycle_stage);

-- ---------------------------------------------------------------------
-- 2) Gán lại chủ sở hữu bản ghi (audit cơ bản cho PSM).
--    created_by/updated_by KHÔNG tồn tại trước đó → thêm, KHÔNG bắt buộc.
-- ---------------------------------------------------------------------
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS updated_by UUID;

-- ---------------------------------------------------------------------
-- 3) BỔ SUNG lifecycle_stage vào RPC tạo khách hàng + Next Action (013).
--    ⚠️ KHÔNG đổi chữ ký hàm: `p_idem_key UUID` + idempotency qua activities.
--       (Client đã gọi 3 tham số JSONB, JSONB, TEXT — xem form 013/014.)
--    Chỉ thêm nhánh đọc `lifecycle_stage`, mặc định 'prospect'.
-- ---------------------------------------------------------------------
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
  v_stage       TEXT;
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
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF NOT public.fdi_is_manager_plus() THEN
    RAISE EXCEPTION 'khong co quyen tao khach hang' USING ERRCODE = '42501';
  END IF;

  IF p_customer IS NULL OR p_customer = '{}'::jsonb THEN
    RAISE EXCEPTION 'p_customer khong duoc de trong' USING ERRCODE = '22023';
  END IF;

  v_name := NULLIF(btrim(p_customer ->> 'name'), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'thieu ten khach hang' USING ERRCODE = '22023';
  END IF;

  v_stage := lower(NULLIF(btrim(p_customer ->> 'lifecycle_stage'), ''));
  IF v_stage IS NULL OR v_stage NOT IN
     ('prospect','implementing','operating','maintenance','stopped') THEN
    v_stage := 'prospect';   -- mặc định an toàn, KHÔNG bịa trạng thái
  END IF;

  INSERT INTO public.customers (
    name, phone, email, industry,
    contact_technical, contact_commercial, contact_emergency,
    tax_id, headquarters_address,
    primary_contact_name, primary_contact_position, notes,
    consent_contact, consent_contact_at,
    lifecycle_stage, created_by, updated_by,
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
    v_stage, v_uid, v_uid,
    now(), now()
  )
  RETURNING id INTO v_customer_id;

  IF p_activity IS NOT NULL AND NULLIF(btrim(p_activity ->> 'activity_type'), '') IS NOT NULL THEN
    v_act_type := lower(btrim(p_activity ->> 'activity_type'));
    INSERT INTO public.activities (
      entity_type, entity_id, activity_type, channel, subject, body,
      scheduled_at, status, owner_id, metadata, created_at
    ) VALUES (
      'customer', v_customer_id, v_act_type,
      COALESCE(lower(btrim(p_activity ->> 'channel')), 'manual'),
      COALESCE(NULLIF(btrim(p_activity ->> 'subject'), ''), 'Next Action đầu tiên'),
      NULLIF(btrim(p_activity ->> 'body'), ''),
      NULLIF(btrim(p_activity ->> 'scheduled_at'), '')::timestamptz,
      'planned', v_uid,
      jsonb_build_object('idem_key', p_idem_key, 'source', 'customer_form'),
      now()
    )
    RETURNING id INTO v_activity_id;
  END IF;

  v_result := jsonb_build_object(
    'customer_id', v_customer_id,
    'activity_id', v_activity_id,
    'lifecycle_stage', v_stage
  );

  IF p_idem_key IS NOT NULL THEN
    UPDATE public.activities
       SET metadata = COALESCE(metadata, '{}'::jsonb)
                    || jsonb_build_object('idem_key', p_idem_key)
     WHERE id = v_activity_id;
  END IF;

  RETURN v_result;
END;
$fn$;

REVOKE ALL ON FUNCTION public.create_customer_with_activity(JSONB, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_customer_with_activity(JSONB, JSONB, UUID)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 4) PATCH route whitelist: cập nhật lifecycle_stage được phép (kèm audit).
--    Hàm helper dùng chung cho route UPDATE.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fdi_customer_stage_label(p_stage TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE lower(p_stage)
    WHEN 'prospect'     THEN 'Tiềm năng'
    WHEN 'implementing' THEN 'Đang triển khai'
    WHEN 'operating'    THEN 'Đang vận hành'
    WHEN 'maintenance'  THEN 'Bảo trì'
    WHEN 'stopped'      THEN 'Ngừng'
    ELSE '—'
  END;
$$;

COMMIT;

-- Đăng ký migration (bảng schema_migrations tự tạo nếu chưa có).
INSERT INTO public.schema_migrations(version, note, applied_at)
VALUES ('015', 'PSM: customers.lifecycle_stage + created_by/updated_by + bổ sung stage vào RPC create_customer_with_activity (giữ nguyên chữ ký UUID)', now())
ON CONFLICT (version) DO NOTHING;
