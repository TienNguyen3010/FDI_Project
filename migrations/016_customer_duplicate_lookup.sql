-- 016_customer_duplicate_lookup.sql — Tìm khách hàng trùng khi tạo/sửa (PSM).
--
-- Vì sao: DB thật đã có trùng — 2 KH 'SoftNET' (CUS-2026-002 / 007) cùng SĐT
-- 0976995641; 2 KH cùng SĐT 0912345678 (003 / 004). Form trước đây chỉ hiện
-- text tĩnh "Chưa đủ dữ liệu để kiểm tra" → không bao giờ chặn được.
--
-- Nguyên tắc: CHỈ ĐỌC + đi qua fdi_can_read (khớp customers_select). Không được
-- lộ KH ngoài phạm vi. Idempotent; KHÔNG DROP/Rename gì của 015.
BEGIN;

-- ---------------------------------------------------------------------
-- 1) Hàm tra cứu trùng — chỉ trả KH trong phạm vi đọc của user gọi.
--    Trả 0 dòng khi email/phone/tax_id đều trống (không bịa cảnh báo).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fdi_find_customer_duplicates(
  p_email   TEXT,
  p_phone   TEXT,
  p_tax_id  TEXT,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id        UUID,
  code      TEXT,
  name      TEXT,
  phone     TEXT,
  email     TEXT,
  tax_id    TEXT,
  match_on  TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email TEXT := lower(btrim(coalesce(p_email, '')));
  v_phone TEXT := btrim(coalesce(p_phone, ''));
  v_tax   TEXT := btrim(coalesce(p_tax_id, ''));
BEGIN
  IF v_email = '' AND v_phone = '' AND v_tax = '' THEN
    RETURN;                       -- chưa nhập gì → không tra (không báo giả)
  END IF;

  RETURN QUERY
  SELECT c.id, c.code, c.name, c.phone, c.email, c.tax_id,
         CASE
           WHEN v_tax <> '' AND c.tax_id IS NOT NULL
                AND btrim(c.tax_id) = v_tax THEN 'tax_id'
           WHEN v_email <> '' AND c.email IS NOT NULL
                AND lower(btrim(c.email)) = v_email THEN 'email'
           ELSE 'phone'
         END AS match_on
    FROM public.customers c
   WHERE (p_exclude_id IS NULL OR c.id <> p_exclude_id)
     AND (
          (v_tax  <> '' AND c.tax_id IS NOT NULL AND btrim(c.tax_id) = v_tax)
       OR (v_email <> '' AND c.email IS NOT NULL AND lower(btrim(c.email)) = v_email)
       OR (v_phone <> '' AND c.phone IS NOT NULL AND btrim(c.phone) = v_phone)
     )
     -- rào phạm vi: ĐÚNG hàm của policy customers_select
     AND public.fdi_can_read(NULL::uuid, c.id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid)
   ORDER BY c.code;
END;
$$;

REVOKE ALL ON FUNCTION public.fdi_find_customer_duplicates(TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fdi_find_customer_duplicates(TEXT, TEXT, TEXT, UUID)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fdi_find_customer_duplicates IS
  'Tra cứu KH trùng theo tax_id/email/phone, CHỈ trong phạm vi fdi_can_read.';

COMMIT;

INSERT INTO public.schema_migrations(version, note, applied_at)
VALUES ('016', 'P0-4: RPC fdi_find_customer_duplicates(email,phone,tax_id,exclude_id) cheo pham vi fdi_can_read de form canh bao trung KH that (da co SoftNET trung SDT, 003/004 trung SDT). Chi doc, khong sua du lieu.', now())
ON CONFLICT (version) DO NOTHING;
