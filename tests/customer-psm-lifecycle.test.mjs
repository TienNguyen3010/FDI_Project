// Regression 2026-11-24 (PSM): vòng đời vận hành thật thay status='active' giả,
// + block Dự án trong panel + chuẩn hoá font/hit-area.
// Nguồn dữ liệu: migration 015 (đã APPLY và verify RLS bằng JWT).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const root = new URL('..', import.meta.url).pathname
const page = readFileSync(root + 'app/(workspace)/customers/page.tsx', 'utf8')
const form = readFileSync(root + 'components/customers/CreateCustomerForm.tsx', 'utf8')
const panel = readFileSync(root + 'components/customers/CustomerDetailPanel.tsx', 'utf8')
const apiRoute = readFileSync(root + 'app/api/v1/customers/route.ts', 'utf8')
const migration = existsSync(root + 'migrations/015_customer_lifecycle_stage.sql')
  ? readFileSync(root + 'migrations/015_customer_lifecycle_stage.sql', 'utf8')
  : ''

test('P0: migration 015 tồn tại + ràng buộc giá trị lifecycle_stage', () => {
  assert.ok(migration.length > 500, 'có file migration 015')
  assert.match(migration, /lifecycle_stage TEXT/, 'thêm cột lifecycle_stage')
  assert.match(
    migration,
    /CHECK \(lifecycle_stage IN \('prospect','implementing','operating','maintenance','stopped'\)\)/,
    'ràng buộc đúng 5 giá trị',
  )
  assert.doesNotMatch(migration, /DROP FUNCTION IF EXISTS public\.create_customer_with_activity/,
    'KHÔNG được DROP RPC (client đang gọi)')
})

test('P0: API trả lifecycle_stage thật, KHÔNG còn status=active giả', () => {
  assert.match(apiRoute, /lifecycle_stage: \(LIFECYCLE_STAGES as readonly string\[\]\)\.includes/,
             'stage phải nằm trong danh sách hợp lệ')
  assert.doesNotMatch(apiRoute, /status: 'active'/, "bỏ hoàn toàn status='active' hardcode")
  assert.match(apiRoute, /by_lifecycle_stage/, 'summary đếm theo vòng đời')
  assert.match(apiRoute, /params.*lifecycle_stage|lifecycle_stage/, 'có filter theo stage')
})

test('P0: client bỏ select status bịa, dùng lifecycle_stage', () => {
  assert.doesNotMatch(page, /Tất cả trạng thái/, 'bỏ select trạng thái giả')
  assert.match(page, /Tất cả vòng đời/, 'có filter vòng đời thật')
  assert.match(page, /setLifecycleStage\(e\.target\.value\)/, 'onChange đúng state')
  assert.match(page, /p\.set\('lifecycle_stage', lifecycleStage\)/, 'đẩy param thật lên URL/API')
})

test('P0: form có field Vòng đời vận hành (5 lựa chọn)', () => {
  assert.match(form, /label="Vòng đời vận hành"/, 'có label field')
  assert.match(form, /fieldProps\('lifecycle_stage'\)/, 'field bind đúng key')
  for (const v of ['prospect', 'implementing', 'operating', 'maintenance', 'stopped']) {
    assert.ok(form.includes(`value: '${v}'`), `có option ${v}`)
  }
  // Mặc định an toàn, không bịa.
  assert.match(form, /lifecycle_stage: initial\.lifecycle_stage \?\? 'prospect'/, 'default prospect')
})

test('P0-1: nhãn KPI ticket không gây hiểu sai', () => {
  assert.match(page, /Ticket mở \(toàn hệ thống\)/, 'KPI ghi rõ phạm vi đếm')
})

test('P1-5: panel có block Dự án của khách hàng + progress thật', () => {
  assert.match(panel, /Dự án của khách hàng/, 'có tiêu đề block')
  assert.match(panel, /role="progressbar"/, 'progress có role a11y')
  assert.match(panel, /Chưa có dự án nào\./, 'empty state rõ')
  // null → '—', KHÔNG bịa 0%
  assert.match(panel, /pct === null \? '—'/, 'progress null hiện — chứ không phải 0%')
  assert.match(page, /projects=\{projects\}/, 'page truyền projects vào panel')
  assert.match(
    page,
    /\/api\/v1\/customers\/\$\{encodeURIComponent\(selected\.id\)\}\/projects/,
    'gọi endpoint dự án thật',
  )
})

test('P1-2/3: font chuẩn hoá — h1 24 ở cả hai màn, label field 14', () => {
  assert.match(page, /<h1 className="text-\[24px\] font-semibold/, 'h1 list 24px')
  assert.match(form, /<h1 className="mt-0\.5 text-\[24px\] font-semibold/, 'h1 form 24px')
  assert.match(form, /<Label className="mb-1 block text-\[14px\] font-medium/, 'label 14px')
})

test('P1-4: panel phải sticky khi cuộn', () => {
  assert.match(form, /lg:sticky lg:top-4/, 'panel dùng sticky top-4')
})

test('P1-7/8/9: bỏ cột Ngành, gộp Email+Điện thoại thành Liên hệ, thêm Ngày tạo', () => {
  // 2026-11-25: user yêu cầu GỘP Email + Điện thoại thành một cột "Liên hệ"
  // (SĐT click tel:, email click mailto:, mỗi giá trị có nút copy) — xem
  // CUSTOMERS_CONTACT_CHANNELS_STANDARD.md và tests/customer-contact-merge.test.mjs.
  const heads = [
    '#', 'Tên khách hàng', 'Người liên hệ', 'Liên hệ',
    'Dự án', 'Vòng đời', 'Ngày tạo', 'Thao tác',
  ].join("', '")
  assert.ok(page.includes(heads), 'đúng 8 tiêu đề theo thứ tự mới')
  assert.doesNotMatch(page, /'Ngành', 'Dự án'/, 'bỏ cột Ngành (PSM không cần)')
  assert.doesNotMatch(page, /'Email', 'Điện thoại'/, 'bỏ 2 cột Email/Điện thoại riêng')
})
