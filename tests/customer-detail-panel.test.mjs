// Regression: bấm vào khách hàng trong list phải mở right detail panel
// (role=dialog, aria-modal, dữ liệu từ API thật — KHÔNG fetch giả / KHÔNG bịa số).
// 2026-11-24: drawer cũ đã được thay bằng `CustomerDetailPanel` mirror
// LeadDetailPanel của SoftNET CRM; type dùng chung ở components/customers/types.ts.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const root = new URL('..', import.meta.url).pathname
const page = readFileSync(root + 'app/(workspace)/customers/page.tsx', 'utf8')
const panel = readFileSync(root + 'components/customers/CustomerDetailPanel.tsx', 'utf8')

test('Customers list có detail panel (dialog + aria-modal)', () => {
  assert.match(page, /CustomerDetailPanel/, 'page phải mount CustomerDetailPanel')
  assert.match(page, /customer=\{selected\}/, 'panel nhận khách hàng đang chọn')
  assert.match(panel, /role="dialog"/, 'panel phải có role dialog')
  assert.match(panel, /aria-modal="true"/, 'panel phải aria-modal')
})

test('Row click mở panel, action cell stopPropagation', () => {
  assert.match(page, /onClick=\{\(\) => setSelected\(item\)\}/, 'row click phải setSelected')
  assert.match(page, /onClick=\{\(e\) => e\.stopPropagation\(\)\}/, 'action cell không được mở panel')
})

test('Drawer hiển thị field thật từ API, không bịa', () => {
  for (const field of ['tax_id', 'headquarters_address', 'primary_contact_name', 'project_count', 'open_ticket_count', 'created_at']) {
    assert.ok(panel.includes(`customer.${field}`), `panel phải hiện ${field}`)
  }
  assert.match(panel, /Tạo lúc: \{fmtDateTime\(/, 'panel hiện thời điểm tạo thật')
})

test('Panel có nút Sửa chỉ khi có quyền customer.update (RBAC)', () => {
  assert.match(page, /canEdit=\{canEdit\}/, 'panel nhận canEdit')
  assert.match(panel, /canEdit && \(/, 'nút Sửa gate theo canEdit')
  assert.match(panel, /Sửa khách hàng/, 'nhãn nút Sửa')
})

test('Panel gọi API hoạt động thật (không bịa lịch sử)', () => {
  assert.match(
    page,
    /fetch\(`\/api\/v1\/customers\/\$\{encodeURIComponent\(selected\.id\)\}\/activities`/,
    'gọi đúng endpoint hoạt động',
  )
  assert.match(panel, /relativeTimeLabel/, 'dùng hàm format thật, không hardcode')
})
