// Regression: bấm vào khách hàng trong list phải mở right detail drawer
// (role=dialog, aria-modal, data từ item — KHÔNG fetch giả / KHÔNG bịa số).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const root = new URL('..', import.meta.url).pathname
const page = readFileSync(root + 'app/(workspace)/customers/page.tsx', 'utf8')

test('Customers list có detail drawer (dialog + aria-modal)', () => {
  assert.match(page, /function CustomerDetailDrawer/, 'phải có component drawer')
  assert.match(page, /role="dialog"/, 'drawer phải có role dialog')
  assert.match(page, /aria-modal="true"/, 'drawer phải aria-modal')
})

test('Row click mở drawer, action cell stopPropagation', () => {
  assert.match(page, /onClick=\{\(\) => setSelected\(item\)\}/, 'row click phải setSelected')
  assert.match(page, /onClick=\{\(e\) => e\.stopPropagation\(\)\}/, 'action cell không được mở drawer')
})

test('Drawer hiển thị field thật từ API, không bịa', () => {
  for (const field of ['tax_id', 'headquarters_address', 'primary_contact_name', 'project_count', 'open_ticket_count', 'created_at']) {
    assert.ok(page.includes(`customer.${field}`), `drawer phải hiện ${field}`)
  }
  assert.match(page, /Escape/, 'đóng bằng Escape')
})
