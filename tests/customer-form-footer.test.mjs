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

test('Bố cục: full màn hình + gap nhỏ + header padding thấp', () => {
  // 2026-11-23: user yêu cầu form full màn hình → container nới rộng, không còn 1180px.
  assert.match(src, /max-w-\[1600px\]/, 'khung nội dung full màn hình')
  assert.doesNotMatch(src, /max-w-\[1180px\]/, 'bỏ max-width hẹp cũ')
  assert.match(src, /gap-x-4 gap-y-3/, 'field gap dọc nhỏ hơn')
  assert.match(src, /CardHeader className="px-5 py-3"/, 'card header gọn')
})

test('Footer sticky có z-index và NỀN ĐỤC (không để chữ lọt qua khi cuộn)', () => {
  assert.match(src, /sticky bottom-0 z-30/, 'footer không bị bottom nav che')
  // nền đục TUYỆT ĐỐI #ffffff (2026-11-23: bg-card/bg-surface có thể nhòe khi footer
  // nằm trong flex item bị stretch) + bị đổ bóng để tách lớp khỏi nội dung.
  assert.match(src, /sticky bottom-0[^\n]*bg-\[#ffffff\]/, 'footer nền đục tuyệt đối')
  assert.doesNotMatch(
    src.split('\n').filter((l) => l.includes('className=')).join('\n'),
    /bg-card\/95/,
    'KHÔNG dùng nền mờ ở footer (chữ card lọt qua)',
  )
  assert.match(src, /safe-area-inset-bottom/, 'footer tôn trọng safe-area')
  // footer phải nằm NGOÀI cột: chuỗi `lg:col-span-2` KHÔNG được xuất hiện
  // ở mọi className của footer (kiểm tra bằng vị trí: footer đứng sau khi grid đóng).
  const footerIdx = src.indexOf('<footer className="sticky bottom-0')
  const gridIdx = src.indexOf('lg:col-span-2')
  assert.ok(footerIdx !== -1 && gridIdx !== -1 && footerIdx > gridIdx, 'footer nằm sau vùng cột grid')
  assert.ok(!/sticky bottom-0[^"]*lg:col-span-2/.test(src), 'footer không còn nằm trong cột grid')
})

// Regression: modal xác nhận thoát thay window.confirm() native (ảnh softnet-crm).
test('Modal "Xác nhận thoát" thay window.confirm', () => {
  assert.doesNotMatch(
    src,
    /window\.confirm/,
    'KHÔNG được dùng window.confirm — phải là modal UI',
  )
  for (const s of ['Xác nhận thoát', 'Ở lại', 'Thoát mà không lưu', 'setShowExit(true)', 'confirmExit']) {
    assert.ok(src.includes(s), `thiếu "${s}" trong form`)
  }
  // Cỡ modal + nút destructive màu rose đúng chuẩn CRM.
  assert.match(src, /max-w-\[420px\]/, 'modal cỡ 420px')
  assert.match(src, /#E11D48/, 'nút "Thoát mà không lưu" dùng rose-600')
  assert.match(src, /AlertTriangle/, 'có icon cảnh báo')
})

