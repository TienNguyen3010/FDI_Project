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

test('P0: footer KHÔNG che chữ khi cuộn tới cùng (user báo 3 lần)', () => {
  // ĐO THẬT trên prod (JS getBoundingClientRect, scrollTop = max):
  //   pb main = 30px  → footerBottom 595 vs viewport 720 ⇒ HỞ 125px ⇒ chữ lọt dưới footer.
  // Fix: pb phải ≥ chiều cao footer (69px) + safe-area. Cả 2 màn hình đều phải có.
  const shellSrc = readFileSync(root + 'components/ClientBody.tsx', 'utf8')
  assert.match(
    shellSrc,
    /md:pb-\[calc\(5\.25rem\+env\(safe-area-inset-bottom\)\)\]/,
    'main desktop padding-bottom ≥ chiều cao footer + safe-area (giữ cho route khác)',
  )
  assert.match(
    shellSrc,
    /pb-\[calc\(6rem\+env\(safe-area-inset-bottom\)\)\]/,
    'main mobile padding-bottom dư cho bottom-nav + footer',
  )

  // Form flex-col vẫn giữ (đẩy footer xuống đáy khung).
  assert.match(form, /<form[^>]*className="[^"]*min-h-full[^"]*flex-col/, 'form là flex-col + min-h-full')
  assert.match(
    form.slice(form.indexOf('aria-label="Breadcrumb"'), form.indexOf('<footer className="sticky')),
    /className="flex-1 space-y-2\.5"/,
    'wrapper nội dung dùng flex-1 đẩy footer xuống đáy',
  )
  const spacerIdx = form.indexOf('</footer>')
  assert.ok(spacerIdx !== -1, 'tìm thấy </footer>')
  const tail = form.slice(spacerIdx, spacerIdx + 900)
  // ĐO THẬT: spacer 96px ⇒ còn hở 179px. Cần ~248px → 256/280.
  assert.match(tail, /h-\[256px\]/, 'spacer mobile đủ cao để footer chạm đáy')
  assert.match(tail, /md:h-\[280px\]/, 'spacer desktop đủ cao để footer chạm đáy')
  assert.match(tail, /bg-\[#ffffff\]/, 'spacer có nền đục che chữ')
  assert.match(form, /sticky bottom-0[^\n]*bg-\[#ffffff\]/, 'footer nền đục tuyệt đối')
  assert.match(form, /safe-area-inset-bottom/, 'footer tôn trọng safe-area')
})

test('P1: breadcrumb "Khách hàng" bấm được → quay lại màn quản lý KH', () => {
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
