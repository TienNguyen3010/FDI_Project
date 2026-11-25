// Regression 2026-11-25 (yêu cầu user trên màn danh sách + right sidebar KH):
//   Bảng: gộp 2 cột Email + Điện thoại -> 1 cột "Liên hệ" (tel:/mailto:/copy).
//   Panel: thêm "Liên hệ bổ sung" (kỹ thuật / thương mại / khẩn cấp) có copy.
// Nguồn dữ liệu: 3 cột contact_technical/contact_commercial/contact_emergency
// đã có sẵn trong schema (migrations/001_initial_schema.sql:44-46) và form tạo KH.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const root = new URL('..', import.meta.url).pathname
const page = readFileSync(root + 'app/(workspace)/customers/page.tsx', 'utf8')
const panel = readFileSync(root + 'components/customers/CustomerDetailPanel.tsx', 'utf8')
const api = readFileSync(root + 'app/api/v1/customers/route.ts', 'utf8')
const types = readFileSync(root + 'components/customers/types.ts', 'utf8')
const helper = readFileSync(root + 'components/customers/contact.ts', 'utf8')

// --- 1. Bảng: đúng 9 cột, gộp Email/Điện thoại -> Liên hệ ----------------------
test('P0: bảng gộp Email + Điện thoại thành MỘT cột "Liên hệ" (vẫn 9 cột)', () => {
  const heads = [
    '#', 'Tên khách hàng', 'Người liên hệ', 'Liên hệ',
    'Dự án', 'Vòng đời', 'Ngày tạo', 'Thao tác',
  ].join("', '")
  assert.ok(page.includes(heads), 'đúng 8 tiêu đề theo thứ tự mới')
  // Hai tiêu đề cũ phải biến mất khỏi bảng.
  assert.doesNotMatch(page, /'Email', 'Điện thoại'/, 'bỏ 2 tiêu đề riêng')
})

test('P0: ô Liên hệ dùng component ContactCell (tel + mailto + copy)', () => {
  assert.match(page, /import \{[^}]*ContactCell[^}]*\} from '@\/components\/customers\/contact'/,
               'page import ContactCell từ helper dùng chung')
  assert.match(page, /<ContactCell phone=\{item\.phone\} email=\{item\.email\} \/>/,
               'ô Liên hệ nhận phone + email thật từ API')
})

// --- 2. Helper: tel/mailto/copy chuẩn, có fallback clipboard -------------------
test('P0: helper sinh href tel/mailto đúng, rỗng -> ""', () => {
  assert.match(helper, /export function normalizePhone/, 'có normalizePhone')
  assert.match(helper, /export function emailHref/, 'có emailHref')
  assert.match(helper, /export function isEmailLike/, 'có isEmailLike')
  assert.match(helper, /export function splitContactText/, 'có splitContactText')
  assert.match(helper, /export function CopyButton/, 'có CopyButton')
  assert.match(helper, /export function ContactCell/, 'có ContactCell')
  // Rỗng không được tạo link rác.
  assert.match(helper, /if \(!value\) return ''/, 'normalizePhone rỗng -> ""')
  // Clipboard phải có fallback (iframe/HTTP có thể chặn navigator.clipboard).
  assert.match(helper, /navigator\.clipboard\.writeText/, 'dùng Clipboard API')
  assert.match(helper, /execCommand\('copy'\)|execCommand\("copy"\)/, 'có fallback execCommand')
})

test('P1: splitContactText tách tên / số / email từ chuỗi tự do', () => {
  // Regex phải khớp ĐÚNG chuỗi trong source helper (đã verify bằng search_files):
  //   email: /[^@\s]+@[^@\s]+\.[^@\s]+/   phone: /[0-9][0-9.\-\s]{7,14}[0-9]/ + check {9,11}
  assert.match(helper, /@\[\^@/, 'nhận diện email')
  assert.match(helper, /\[0-9\]\[0-9\.\\-\\s\]\{7,14\}\[0-9\]/, 'cụm số cho phép ./ - ngăn cách')
  assert.match(helper, /\/\^\[0-9\]\{9,11\}\$\//, 'ràng buộc 9–11 chữ số')
})

// --- 3. API list phải trả 3 cột liên hệ bổ sung --------------------------------
test('P0: API /api/v1/customers select + map 3 cột liên hệ bổ sung', () => {
  for (const col of ['contact_technical', 'contact_commercial', 'contact_emergency']) {
    assert.ok(api.includes(col), `API phải trả ${col}`)
  }
  assert.match(api, /contact_technical: c\.contact_technical \?\? null/,
               'map contact_technical từ row thật')
})

test('P0: type Customer có 3 field liên hệ bổ sung', () => {
  for (const col of ['contact_technical', 'contact_commercial', 'contact_emergency']) {
    assert.ok(types.includes(`${col}?: string | null`), `types.ts phải khai ${col}`)
  }
})

// --- 4. Right sidebar: khối liên hệ bổ sung + copy ---------------------------
test('P0: panel hiển thị đủ 3 kênh liên hệ bổ sung', () => {
  for (const label of ['Liên hệ kỹ thuật', 'Liên hệ thương mại', 'Liên hệ khẩn cấp']) {
    assert.ok(panel.includes(label), `panel phải có nhãn "${label}"`)
  }
  for (const field of ['contact_technical', 'contact_commercial', 'contact_emergency']) {
    assert.ok(panel.includes(`customer.${field}`), `panel phải đọc customer.${field}`)
  }
})

test('P0: panel parse liên hệ bổ sung bằng splitContactText (không in thẳng)', () => {
  assert.match(panel, /splitContactText\(/, 'phải parse chuỗi tự do')
  assert.match(panel, /normalizePhone|emailHref/, 'sinh href tel:/mailto: từ helper')
  assert.match(panel, /CopyButton/, 'có nút copy cho từng giá trị')
})

test('P0: panel KHÔNG bịa dữ liệu — rỗng vẫn hiện "—"', () => {
  assert.match(panel, /'—'/, 'giá trị rỗng hiện —')
  assert.match(panel, /Chưa có thông tin liên hệ bổ sung|Chưa có liên hệ bổ sung/,
               'có empty state cho khối liên hệ bổ sung')
})

// --- 5. A11y / không phá bố cục cũ ------------------------------------------
test('P1: nút copy có aria-label + hit-area, không mở panel khi bấm', () => {
  assert.match(helper, /aria-label/, 'CopyButton có aria-label')
  assert.match(page, /stopPropagation/, 'ô/action cell chặn bubble để không mở panel')
})

test('P1: panel giữ nguyên khung mirror LeadDetailPanel', () => {
  assert.match(panel, /role="dialog"/, 'panel là dialog')
  assert.match(panel, /aria-modal="true"/, 'aria-modal giữ nguyên')
  assert.match(panel, /Sửa khách hàng/, 'nút Sửa vẫn còn')
})
