// Regression 2026-11-24 (PSM tiếp): duplicate check THẬT + sort bằm tiêu đề cột.
// Dữ liệu thật: DB có 2 KH 'SoftNET' trùng SĐT 0976995641 (CUS-2026-002/007)
// và 2 KH trùng SĐT 0912345678 (003/004).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const root = new URL('..', import.meta.url).pathname
const form = readFileSync(root + 'components/customers/CreateCustomerForm.tsx', 'utf8')
const page = readFileSync(root + 'app/(workspace)/customers/page.tsx', 'utf8')
const dupApi = readFileSync(root + 'app/api/v1/customers/duplicates/route.ts', 'utf8')
const mig = existsSync(root + 'migrations/016_customer_duplicate_lookup.sql')
  ? readFileSync(root + 'migrations/016_customer_duplicate_lookup.sql', 'utf8')
  : ''

test('P0-4: RPC tra trùng cheo phạm vi fdi_can_read, không lộ KH ngoài scope', () => {
  assert.ok(mig.length > 500, 'có migration 016')
  assert.match(mig, /fdi_find_customer_duplicates/, 'có hàm tra cứu')
  assert.match(
    mig,
    /fdi_can_read\(NULL::uuid, c\.id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid\)/,
    'PHẢI rào theo fdi_can_read',
  )
  // Không nhập gì thì trả về rỗng — không báo cảnh giả.
  assert.match(mig, /IF v_email = '' AND v_phone = '' AND v_tax = '' THEN\s+RETURN;/,
               'input rỗng → return sớm')
})

test('P0-4: RPC chỉ đọc, KHÔNG sửa dữ liệu', () => {
  assert.match(mig, /STABLE SECURITY DEFINER/, 'hàm STABLE')
  assert.doesNotMatch(mig, /\b(UPDATE|DELETE|INSERT)\s+(INTO\s+)?public\.customers\b/i,
                      'không được ghi vào customers')
})

test('P0-4: endpoint API có authorize customer.read', () => {
  assert.match(dupApi, /authorize\('customer.read'\)/, 'phải authorize')
  assert.match(dupApi, /return Response\.json\(\{ data: \[\] \}\)/, 'rỗng → data rỗng')
  // exclude_id sai định dạng không được lỗi 500
  assert.match(dupApi, /isUuid/, 'validate UUID trước khi gửi xuống DB')
})

test('P0-4: form gọi endpoint + hiển thị danh sách trùng thật', () => {
  assert.match(form, /\/api\/v1\/customers\/duplicates\?/, 'gọi đúng endpoint')
  assert.match(form, /setTimeout\(\s*async/, 'debounce, không gọi mỗi phím')
  assert.match(form, /Tìm thấy \{duplicates\.length\} khách hàng trùng/, 'hiện số KH trùng')
  assert.match(form, /matchOnLabel/, 'nói rõ lý do trùng')
  // chế độ sửa phải loại trừ chính bản ghi
  assert.match(form, /if \(initial\?\.id\) q\.set\('exclude_id', initial\.id\)/,
               'sửa thì exclude_id = id hiện tại')
  // lỗi mạng không được cảnh báo giả
  assert.match(form, /catch \{\s*if \(!cancelled\) setDuplicates\(\[\]\)/, 'lỗi → bỏ qua')
})

test('P1-9: bấm tiêu đề cột để sort, có aria-sort', () => {
  assert.match(page, /aria-sort=\{active/, 'th có aria-sort')
  assert.match(page, /toggleSort\(col\)/, 'header gọi toggleSort')
  assert.match(page, /setSortRaw\(next\)/, 'cập nhật sort state')
  // Cột không sort được phải giữ thường (không phải button)
  assert.match(page, /if \(!col\) \{[\s\S]{0,120}?<th/, 'cột không sort giữ thẻ th')
})

test('P1-9: sort state đẩy vào query tới API', () => {
  assert.match(page, /sort: sortRaw/, 'fetch gửi param sort thật')
})
