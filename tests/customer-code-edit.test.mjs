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
  assert.ok(form.includes('? codeDisplay\n                      : form[key as FieldKey]'), 'summary dùng codeDisplay (không bao giờ trống)')
})

test('P1: chế độ sửa ẩn nút "Lưu và tạo mới" (chỉ tạo mới ở form tạo)', () => {
  const form = src('components/customers/CreateCustomerForm.tsx')
  assert.ok(/!isEdit && \(\s*<Button/.test(form) || form.includes('{!isEdit && ('), 'gate nút saveAndNew')
})
