// Regression 2026-11-24 (yêu cầu user trên form Sửa/Thêm khách hàng):
//   1) Bỏ hàng topbar "Customers · admin@fdi.local" ở các màn hình full page
//      (màn tự có breadcrumb/h1).
//   2) Dòng "Mã KH" trong panel Tóm tắt hiển thị thẳng, đậm, không Badge.
//   3) Modal xác nhận Hủy căn giữa viewport, z-index cao hơn footer/drawer.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const root = new URL('..', import.meta.url).pathname
const shell = readFileSync(root + 'components/ClientBody.tsx', 'utf8')
const form = readFileSync(root + 'components/customers/CreateCustomerForm.tsx', 'utf8')

test('P0: topbar bị ẩn ở route form khách hàng (không còn "Customers" + email)', () => {
  // Topbar giờ nằm trong nhánh điều kiện — không render vô điều kiện nữa.
  assert.match(shell, /showTopbar \? \(/, 'topbar phải nằm trong nhánh showTopbar')
  assert.match(
    shell,
    /pathname === '\/customers\/new'/,
    'nhận diện route /customers/new',
  )
  assert.match(
    shell,
    /startsWith\('\/customers\/'\) && pathname !== '\/customers'/,
    'nhận diện route /customers/[id] nhưng KHÔNG ẩn topbar ở danh sách',
  )
})

test('P0: mobile vẫn mở được drawer khi topbar ẩn (nút menu thay thế)', () => {
  assert.match(
    shell,
    /setMobileOpen\(true\)/,
    'vẫn có nút gọi setMobileOpen(true)',
  )
})

test('P0: dòng Mã KH hiển thị thẳng, đậm, KHÔNG nằm trong Badge', () => {
  assert.match(form, /text-muted-foreground">Mã KH</, 'nhãn dòng là "Mã KH"')
  assert.doesNotMatch(
    form,
    /<Badge[^>]*>\{codeDisplay\}<\/Badge>/,
    'mã KH không được nằm trong Badge (nền xanh lá làm nhòe)',
  )
  const maIdx = form.indexOf('text-muted-foreground">Mã KH<')
  assert.ok(maIdx !== -1, 'tìm thấy dòng Mã KH')
  assert.match(
    form.slice(maIdx, maIdx + 500),
    /font-semibold[^"]*text-foreground/,
    'dòng mã dùng chữ đậm + màu foreground (đọc rõ)',
  )
})

test('P0: ô input mã KH đọc rõ, không bị nhầm placeholder', () => {
  const codeInput = form.slice(form.indexOf('id="f-code"'), form.indexOf('id="f-code"') + 400)
  assert.match(codeInput, /readOnly/, 'ô mã read-only')
  assert.match(codeInput, /value=\{codeDisplay\}/, 'ô mã dùng codeDisplay')
  assert.match(codeInput, /text-foreground/, 'ô mã dùng màu foreground (không phải muted)')
  assert.doesNotMatch(
    codeInput,
    /placeholder=/,
    'ô mã KHÔNG được có placeholder (sẽ nhầm là chưa có mã)',
  )
})

test('P0: modal Hủy căn giữa viewport, z-index cao hơn footer sticky', () => {
  // Footer sticky z-30 → modal phải cao hơn, nếu không footer đè lên modal.
  assert.match(form, /exit-confirm-modal[\s\S]{0,200}?z-\[60\]/, 'modal z-[60] > footer z-30')
  assert.match(form, /exit-confirm-modal[\s\S]{0,200}?items-center/, 'modal căn giữa dọc')
})

test('P1: breadcrumb "Khách hàng" bấm được → quay lại màn quản lý KH', () => {
  // 2026-11-24 (user): chữ "Khách hàng" trong breadcrumb phải là Link tới /customers.
  assert.match(form, /<Link href="\/customers"/, 'breadcrumb dùng next/link tới /customers')
  assert.doesNotMatch(
    form.slice(form.indexOf('aria-label="Breadcrumb"'), form.indexOf('aria-label="Breadcrumb"') + 500),
    /<span>Khách hàng<\/span>/,
    '"Khách hàng" không còn là span chết',
  )
  assert.match(
    form,
    /import Link from 'next\/link'/,
    'có import Link (client navigation, không reload trang)',
  )
})
