-- 010_customer_code.sql — cột mã khách hàng CUS-YYYY-XXX sinh bởi DB.
-- Idempotent; chạy trực tiếp trong Supabase SQL Editor. Không DROP function/policy.
-- Chạy sau 009_customer_create_hardening.sql.
--
-- Vì sao phải do DB sinh (không client):
--   * Mã là danh tính công khai của khách hàng; client có thể ghi đè / bịa.
--   * RLS cho INSERT authenticated (002) nên trigger phải SECURITY DEFINER để
--     đọc bảng đếm; ngược lại không insert được.
--   * Dùng advisory lock theo năm + TOCTOU-safe: chống trùng khi 2 request
--     insert song song cùng năm.
BEGIN;

-- (a) Cột code. UNIQUE để bảo toàn tính duy nhất ở tầng dữ liệu.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS customers_code_key
  ON public.customers (code) WHERE code IS NOT NULL;

-- Ghi chú ngữ nghĩa.
COMMENT ON COLUMN public.customers.code IS 'Mã khách hàng do hệ thống sinh, định dạng CUS-YYYY-NNN. NULL = bản ghi cũ/chưa backfill.';

-- (b) Hàm sinh mã. Trả về mã mới trong cùng một transaction caller.
--     Đếm theo năm dựa trên CHÍNH bảng customers (không đếm sequence riêng)
--     nên không có gì để desync; advisory lock chặn race giữa 2 phiên.
CREATE OR REPLACE FUNCTION public.fdi_next_customer_code(p_year INT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_year   INT;
  v_next   INT;
  v_code   TEXT;
  v_locked BOOLEAN;
BEGIN
  v_year := coalesce(p_year, extract(year FROM (now() AT TIME ZONE 'Asia/Ho_Chi_Minh'))::int);

  -- Advisory lock theo khóa cố định theo năm; không blocking row.
  v_locked := pg_try_advisory_xact_lock(7401000 + v_year);
  IF NOT v_locked THEN
    -- Không lấy được lock: bảo toàn tính đúng, báo lỗi thay vì sinh mã có thể trùng.
    RAISE EXCEPTION 'fdi_next_customer_code: khong lay duoc khoa tao ma nam %', v_year
      USING ERRCODE = '55006';
  END IF;

  SELECT count(*) + 1 INTO v_next
    FROM public.customers
   WHERE code LIKE 'CUS-' || v_year::text || '-%';

  v_code := 'CUS-' || v_year::text || '-' || lpad(v_next::text, 3, '0');

  -- Rào cuối: nếu vì lý do nào đó đã tồn tại thì báo lỗi (UNIQUE sẽ chặn,
  -- nhưng thông báo rõ hơn để client hiểu là trùng, không phải lỗi hệ thống).
  IF EXISTS (SELECT 1 FROM public.customers WHERE code = v_code) THEN
    RAISE EXCEPTION 'fdi_next_customer_code: ma % da ton tai', v_code
      USING ERRCODE = '23505';
  END IF;

  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.fdi_next_customer_code(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fdi_next_customer_code(INT) TO anon, authenticated, service_role;

-- (c) Trigger BEFORE INSERT: chỉ sinh khi client không cung cấp code.
--     AFTER INSERT dùng NEW.code đã có sẵn.
CREATE OR REPLACE FUNCTION public.trg_customers_set_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.code IS NULL OR btrim(NEW.code) = '' THEN
    NEW.code := public.fdi_next_customer_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customers_set_code ON public.customers;
CREATE TRIGGER customers_set_code
  BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.trg_customers_set_code();

-- (d) Backfill bản ghi cũ.
--     QUAN TRỌNG: phải gọi ĐÚNG hàm fdi_next_customer_code() thay vì tự đếm,
--     vì trigger BEFORE INSERT cũng đang dùng hàm này — tự đếm sẽ sinh trùng
--     với mã của bản ghi mới. Hàm có advisory xact lock nên an toàn song song.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.customers
     WHERE code IS NULL OR btrim(code) = ''
     ORDER BY created_at ASC, id ASC
  LOOP
    UPDATE public.customers
       SET code = public.fdi_next_customer_code()
     WHERE id = r.id;
  END LOOP;
END $$;

-- (e) Đăng ký version migration.
INSERT INTO public.schema_migrations (version, note)
VALUES ('010_customer_code', 'customers.code CUS-YYYY-NNN + DB trigger + backfill')
ON CONFLICT (version) DO NOTHING;

COMMIT;
