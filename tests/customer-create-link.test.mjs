// Regression: nút "+ Thêm khách hàng" trên Customers list phải điều hướng tới /customers/new
// (CUS-L07). Sau khi rewrite sang standalone page, contract là Link trực tiếp
// thay vì CrudConfig.createHref. Giữ nguyên ý định test: CTA phải tới đúng route.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const root = new URL('..', import.meta.url).pathname
const page = readFileSync(root + 'app/(workspace)/customers/page.tsx', 'utf8')

test('Customers list có CTA link tới /customers/new', () => {
  assert.match(page, /href=["'{][^"}]*\/customers\/new/, 'phải có Link tới /customers/new')
  assert.match(page, /Thêm khách hàng/, 'nhãn CTA phải đúng spec')
})

test('Customers list KHÔNG dùng CrudPage (đã rewrite standalone)', () => {
  assert.doesNotMatch(page, /from ['"]@\/components\/crud\/CrudPage['"]/, 'không import CrudPage')
})

test('Customers list không bịa KPI/CSAT/delta', () => {
  assert.match(page, /Chưa có dữ liệu/, 'CSAT null phải hiện "Chưa có dữ liệu"')
  assert.doesNotMatch(page, /value=\{?(36|28|47|98)\b/, 'không hardcode số từ mockup')
})
