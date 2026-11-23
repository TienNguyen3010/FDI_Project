// Regression: footer form có 3 actions (Hủy / Lưu và tạo mới / Lưu khách hàng)
// + bố cục gọn để không phải zoom 70%.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const root = new URL('..', import.meta.url).pathname
const src = readFileSync(root + 'components/customers/CreateCustomerForm.tsx', 'utf8')

test('Footer có nút Lưu và tạo mới (saveAndNew)', () => {
  assert.match(src, /submitCustomer\('saveAndNew'\)/, 'phải gọi submitCustomer saveAndNew')
  assert.match(src, /Lưu và tạo mới/, 'phải có nhãn nút')
  assert.match(src, /setForm\(EMPTY\)/, 'saveAndNew phải reset form')
})

test('Bố cục gọn: max-width + gap nhỏ + header padding thấp', () => {
  assert.match(src, /max-w-\[1180px\]/, 'khung nội dung có max-width')
  assert.match(src, /gap-x-4 gap-y-3/, 'field gap dọc nhỏ hơn')
  assert.match(src, /CardHeader className="px-5 py-3"/, 'card header gọn')
})

test('Footer sticky có z-index và backdrop', () => {
  assert.match(src, /sticky bottom-0 z-30/, 'footer không bị bottom nav che')
  assert.match(src, /bg-card\/95[^"]*backdrop-blur/, 'footer nền mờ chuyên nghiệp')
})
