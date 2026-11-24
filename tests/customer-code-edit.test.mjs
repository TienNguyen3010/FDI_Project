// 2026-11-23 — Contract mã khách hàng + sửa khách hàng.
// Nguồn truth: migration 010 (code do DB sinh) + API list trả code thật.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const root = new URL('..', import.meta.url).pathname

function src(rel) {
  return readFileSync(root + rel, 'utf8')
}

test('P0: API /api/v1/customers KHÔNG còn hardcode code: null — trả c.code thật', () => {
  const api = src('app/api/v1/customers/route.ts')
  assert.ok(!/code:\s*null/.test(api), 'không được còn "code: null"')
  assert.ok(api.includes('.select(\'id, name, code,'), 'select phải có cột code')
  assert.ok(/code:\s*c\.code\s*\?\?\s*null/.test(api), 'map phải lấy c.code')
})

test('P0: search theo mã khách hàng (CUS-L05)', () => {
  const api = src('app/api/v1/customers/route.ts')
  assert.ok(/SEARCH_FIELDS\s*=.*'code'/.test(api), 'SEARCH_FIELDS phải gồm code')
})

test('P0: list hiển thị mã (font-mono), vẫn fallback — khi null', () => {
  const page = src('app/(workspace)/customers/page.tsx')
  assert.ok(page.includes('font-mono'), 'ô mã dùng font-mono')
  assert.ok(/Mã:\s*—/.test(page), 'fallback đúng là "Mã: —"')
  assert.ok(page.includes('customer.code || \'—\''), 'drawer header vẫn hiển thị mã')
})

test('P0: nút Sửa hoạt động cho role có customer.update; drawer có nút Sửa', () => {
  const page = src('app/(workspace)/customers/page.tsx')
  assert.ok(page.includes("hasPermission(role, 'customer.update')"), 'phải gate bằng customer.update')
  assert.ok(page.includes('editCustomer(item.id)'), 'cột Thao tác phải gọi editCustomer')
  assert.ok(page.includes('/customers/${encodeURIComponent(id)}'), 'điều hướng tới form sửa')
  assert.ok(page.includes('onEdit={canEdit ? editCustomer : undefined}'), 'drawer nhận onEdit có điều kiện')
  // nút Sửa cũ (disabled "sẽ hỗ trợ") phải biến mất
  assert.ok(!page.includes('Sửa (sẽ hỗ trợ ở bản sau)'), 'không còn nút Sửa disabled')
})

test('P0: form hỗ trợ initial (sửa) — không gửi code khi PATCH', () => {
  const form = src('components/customers/CreateCustomerForm.tsx')
  assert.ok(form.includes('export interface CustomerFormInitial'), 'có type initial export')
  assert.ok(form.includes('method: \'PATCH\''), 'gọi PATCH khi sửa')
  assert.ok(form.includes('/api/v1/customers/${initial.id}'), 'PATCH đúng id')
  // đường sửa không được chứa payload.code
  const editBranch = form.slice(form.indexOf("if (isEdit && initial)"), form.indexOf('fdi_next_customer_code'))
  assert.ok(!/payload\.code/.test(editBranch), 'nhánh sửa KHÔNG được gửi code')
})

test('P0: route sửa từ chối client ghi code (immutable)', () => {
  const route = src('app/api/v1/customers/[id]/route.ts')
  assert.ok(route.includes("export async function PATCH"), 'phải có export PATCH')
  assert.ok(route.includes("'code' in body"), 'kiểm tra code trong body')
  assert.ok(route.includes('không được gửi khi cập nhật'), 'thông báo rõ khi gửi code')
  const updateCall = route.slice(route.indexOf('.update('))
  assert.ok(
    !/\.update\(\s*body/.test(updateCall) && /payload as Record<string, string \| boolean \| null>/.test(updateCall),
    'payload update phải là payload đã lọc, không phải body thô',
  )
  // whitelist phải chặn `code`
  assert.ok(route.includes("if ('code' in body)"), 'có guard code immutable')
})

test('P1: GET /api/v1/customers/[id] có authorize(customer.read)', () => {
  const route = src('app/api/v1/customers/[id]/route.ts')
  assert.ok(route.includes("authorize('customer.read')"), 'phải authorize')
})

test('P0: mã hiển thị KHÔNG nhân đôi prefix CUS- (sửa form)', () => {
  const form = src('components/customers/CreateCustomerForm.tsx')
  // phải có biến display, không ghép span prefix cứng với giá trị đã đủ mã
  assert.ok(form.includes('const codeDisplay'), 'có codeDisplay')
  assert.ok(!/<span[^>]*aria-hidden[^>]*>\s*CUS-/.test(form), 'bỏ span prefix cứng')
  assert.ok(form.includes('value={codeDisplay}'), 'input dùng codeDisplay')
  // Bản thiết kế lại theo Add Lead: summary hiển thị <Badge>{codeDisplay}</Badge>
  // (mã đã đủ CUS-YYYY-NNN) — hết lỗi CUS-CUS-... và hết summary trống.
  // 2026-11-24: mã KH KHÔNG được để trong Badge (nền xanh lá #ddf5dc làm mã nhòe).
  assert.ok(form.includes('{codeDisplay}'), 'summary vẫn hiển thị mã')
  assert.doesNotMatch(
    form,
    /<Badge[^>]*>\{codeDisplay\}<\/Badge>/,
    'KHÔNG bọc mã trong Badge (nền xanh lá làm mã nhòe)',
  )
  assert.match(form, /Mã KH/, 'nhãn dòng Mã hiển thị đúng')
})

test('P1: chế độ sửa ẩn nút "Lưu và tạo mới" (chỉ tạo mới ở form tạo)', () => {
  const form = src('components/customers/CreateCustomerForm.tsx')
  assert.ok(/!isEdit && \(\s*<Button/.test(form) || form.includes('{!isEdit && ('), 'gate nút saveAndNew')
})

test('UI: form rộng full màn hình + footer nền đục + modal căn giữa viewport', () => {
  const form = src('components/customers/CreateCustomerForm.tsx')
  // full-width container (trước là max-w-[1180px])
  assert.ok(form.includes('max-w-[1600px]'), 'container full màn hình')
  // footer không dùng nền mờ (chữ card lọt qua khi cuộn) — chỉ kiểm tra className thật
  const classLines = form.split('\n').filter((l) => l.includes('className=')).join('\n')
  assert.ok(!/bg-card\/95/.test(classLines), 'không còn bg-card/95 trong className')
  assert.ok(!/backdrop-blur/.test(classLines), 'footer không còn backdrop-blur (nền mờ)')
  // nền ĐỤC TUYỆT ĐỐI: bg-[#ffffff] (2026-11-23 — bg-card/bg-surface vẫn có thể nhòe
  // khi đặt trong cột bị stretch; chốt bằng mã màu trắng đục)
  assert.match(classLines, /sticky bottom-0[^\n]*bg-\[#ffffff\]/, 'footer nền đục tuyệt đối #ffffff')
  assert.ok(form.includes('safe-area-inset-bottom'), 'footer padding safe-area')
  // modal căn giữa thật (important) — trước bị lệch khi cuộn
  assert.ok(form.includes('!items-center'), 'modal có !items-center')
})

test('DB: migration 011 nới RLS scope cho project_manager (khớp RBAC client)', () => {
  const sql = src('migrations/011_customer_edit_scope.sql')
  assert.ok(sql.includes("r IN ('director','manager','project_manager')"), 'fdi_can_read có PM')
  assert.ok(sql.includes("'leader','manager','director','project_manager','super_admin'"), 'fdi_is_leader_plus có PM')
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.fdi_can_read'), 'định nghĩa lại fdi_can_read')
  assert.ok(sql.includes('fdi_customers_update'), 'tái tạo policy update')
  assert.ok(/INSERT INTO public.schema_migrations[\s\S]*011_customer_edit_scope/.test(sql), 'ghi schema_migrations 011')
})

test('DB: migration 012 SỬA GỐC — fdi_current_role whitelist JWT có project_manager', () => {
  const sql = src('migrations/012_customer_edit_scope_v2.sql')
  assert.ok(/^\s*BEGIN\s*;/m.test(sql), '012 có BEGIN;')
  assert.ok(/^\s*COMMIT\s*;/m.test(sql), '012 có COMMIT;')
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.fdi_current_role()'), '012 định nghĩa lại fdi_current_role')
  // whitelist JWT phải có ĐỦ cả project_manager và super_admin
  assert.ok(
    sql.includes("('employee','leader','manager','director','super_admin','project_manager')"),
    'whitelist JWT phải có project_manager + super_admin',
  )
  // KHÔNG được DROP function (chỉ CREATE OR REPLACE)
  assert.ok(!/^\s*DROP\s+FUNCTION/im.test(sql), '012 KHÔNG DROP FUNCTION')
  assert.ok(sql.includes('DROP POLICY IF EXISTS fdi_customers_update'), '012 tái tạo policy update')
  assert.ok(sql.includes('CREATE POLICY fdi_customers_update'), '012 có CREATE POLICY update')
  assert.ok(/INSERT INTO public.schema_migrations[\s\S]*012_customer_edit_scope_v2/.test(sql), 'ghi schema_migrations 012')
})

test('DB: 012 giữ nguyên thân fdi_can_read/fdi_is_leader_plus như 011', () => {
  const s11 = src('migrations/011_customer_edit_scope.sql')
  const s12 = src('migrations/012_customer_edit_scope_v2.sql')
  const strip = (t) => t.split('\n').filter((l) => !l.includes('--') && l.trim() !== '')
  const body = (sql, header) => {
    const i = sql.indexOf(header)
    const ends = [sql.indexOf('$$;', i), sql.indexOf('$fn$;', i)].filter((x) => x !== -1)
    return strip(sql.slice(i, Math.min(...ends) + 3))
  }
  // 012 CỐ Ý khác 011 ở nhánh toàn công ty: thêm 'super_admin' (011 thiếu →
  // admin bị fdi_customers_select chặn → danh sách KH rỗng dù đã lưu thành công).
  // Các đoạn còn lại phải giống hệt 011.
  const norm = (lines) => lines.filter((l) => !/IF r IN \(.*\) THEN/.test(l))
  assert.deepEqual(
    norm(body(s12, 'CREATE OR REPLACE FUNCTION public.fdi_can_read(')),
    norm(body(s11, 'CREATE OR REPLACE FUNCTION public.fdi_can_read(')),
    'fdi_can_read chỉ khác 011 ở nhánh thêm super_admin',
  )
  assert.deepEqual(
    body(s12, 'CREATE OR REPLACE FUNCTION public.fdi_is_leader_plus()'),
    body(s11, 'CREATE OR REPLACE FUNCTION public.fdi_is_leader_plus()'),
    'thân fdi_is_leader_plus phải giống hệt 011',
  )
})

test('DB: 012 fdi_can_read có super_admin (admin phải đọc được danh sách KH)', () => {
  const sql = src('migrations/012_customer_edit_scope_v2.sql')
  // Policy fdi_customers_select dùng fdi_can_read. RBAC client cấp customer.read
  // cho super_admin (ALL) nên nhánh toàn công ty phải có super_admin — nếu không
  // admin lưu KH thành công nhưng danh sách vẫn rỗng.
  assert.match(
    sql,
    /IF r IN \('director','manager','project_manager','super_admin'\) THEN/,
    'fdi_can_read phải có super_admin',
  )
})

// =====================================================================
// 2026-11-23 — Activities (migration 013) + Next Action trong form Thêm KH.
// =====================================================================

test('Activities: form gọi RPC create_customer_with_activity, KHÔNG insert customers trực tiếp', () => {
  const form = src('components/customers/CreateCustomerForm.tsx')
  assert.ok(
    /db\.rpc\(\s*'create_customer_with_activity'/.test(form),
    'form phải gọi RPC create_customer_with_activity (không insert trực tiếp)',
  )
  assert.ok(
    !/db\.from\(\s*'customers'\s*\)\s*\.insert\s*\(/.test(form),
    'KHÔNG còn db.from(\'customers\').insert trực tiếp — phải qua RPC',
  )
})

test('Activities: form có section Next Action (nhãn đúng chính tả)', () => {
  const form = src('components/customers/CreateCustomerForm.tsx')
  for (const label of [
    'Next Action đầu tiên',
    'Tạo Next Action đầu tiên',
    'Nội dung cần thực hiện',
  ]) {
    assert.ok(form.includes(label), `thiếu nhãn "${label}" trong form`)
  }
  // Chặt chẽ chính tả: KHÔNG được viết "tiện" (lỗi gõ).
  assert.ok(!form.includes('Tạo Next Action đầu tiện'), 'chính tả sai: "đầu tiện" → "đầu tiên"')
})

test('DB: migration 012 sửa fdi_is_manager_plus để INSERT khách hàng cho project_manager (lỗi RLS)', () => {
  const sql = src('migrations/012_customer_edit_scope_v2.sql')
  // Policy fdi_customers_insert dùng WITH CHECK (fdi_is_manager_plus()).
  // RBAC client cấp customer.create cho director + project_manager + super_admin,
  // nên hàm phải có ĐỦ cả 4 role, nếu không PM bấm Lưu bị DB chặn:
  //   "new row violates row-level security policy for table \"customers\""
  assert.ok(
    sql.includes("CREATE OR REPLACE FUNCTION public.fdi_is_manager_plus()"),
    '012 phải định nghĩa lại fdi_is_manager_plus',
  )
  assert.match(
    sql,
    /fdi_is_manager_plus\(\)[\s\S]{0,200}?IN \('manager','director','super_admin','project_manager'\)/,
    'fdi_is_manager_plus phải có project_manager',
  )
  assert.ok(!/^\s*DROP\s+FUNCTION/im.test(sql), '012 KHÔNG DROP FUNCTION')
})

test('DB: 012 có RPC dự phòng fdi_get_customer_code (kiểm quyền fdi_can_read)', () => {
  const sql = src('migrations/012_customer_edit_scope_v2.sql')
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.fdi_get_customer_code(p_customer_id UUID)'), 'có fdi_get_customer_code')
  assert.ok(sql.includes('RETURNS TEXT'), 'RPC RETURNS TEXT')
  // KHÔNG lách RLS: bắt buộc kiểm tra fdi_can_read
  assert.ok(/fdi_get_customer_code[\s\S]*?fdi_can_read\(NULL, p_customer_id, NULL, NULL, NULL, NULL\)/.test(sql), 'RPC phải kiểm fdi_can_read')
  assert.ok(sql.includes('REVOKE ALL ON FUNCTION public.fdi_get_customer_code(UUID) FROM PUBLIC'), 'RPC REVOKE PUBLIC')
  assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.fdi_get_customer_code(UUID) TO authenticated, anon, service_role'), 'RPC GRANT roles')
})
