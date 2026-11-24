// Regression 2026-11-24: màn quản lý khách hàng lấy chuẩn UI Lead (SoftNET CRM)
//   - KPI card BẤM ĐƯỢC chọn smart view
//   - underline tabs dưới KPI (đúng vị trí LeadManagementShell §B)
//   - topbar toàn cục bị ở cả /customers (danh sách)
// Không bịa scope "của tôi/tất cả": customers KHÔNG có cột owner (verify DB).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const root = new URL('..', import.meta.url).pathname
const page = readFileSync(root + 'app/(workspace)/customers/page.tsx', 'utf8')
const shell = readFileSync(root + 'components/ClientBody.tsx', 'utf8')

test('P0: topbar bị ở cả màn danh sách /customers', () => {
  assert.match(shell, /showTopbar \? \(/, 'topbar phải nằm trong nhánh showTopbar')
  assert.match(shell, /pathname === '\/customers' \|\|/, 'ẩn topbar ở danh sách')
  assert.match(shell, /pathname === '\/customers\/new'/, 'ẩn topbar ở form thêm')
})

test('P0: KPI card bấm được để chọn smart view', () => {
  assert.match(page, /aria-pressed=\{active\}/, 'KPI có aria-pressed (bấm được)')
  assert.match(page, /interactive = typeof onClick === 'function'/, 'không cho bấm khi thiếu handler')
  // 3 KPI có handler; CSAT KHÔNG (schema không có dữ liệu survey).
  const onClickCount = (page.match(/onClick=\{\(\) => \{ setSmartView/g) || []).length
  assert.ok(onClickCount >= 3, `ít nhất 3 KPI gắn handler, hiện có ${onClickCount}`)
  assert.match(page, /CSAT: schema không có bảng survey/, 'ghi chú lý do CSAT không bấm')
})

test('P0: underline tabs đặt DƯỚI KPI (đúng Lead §B)', () => {
  const kpiIdx = page.indexOf('Chỉ số khách hàng')
  const tabIdx = page.indexOf('role="tablist"')
  const toolbarIdx = page.indexOf('Bộ lọc khách hàng')
  assert.ok(kpiIdx !== -1 && tabIdx !== -1, 'tìm thấy KPI và tabs')
  assert.ok(tabIdx > kpiIdx, 'tabs phải nằm sau KPI')
  assert.ok(toolbarIdx === -1 || tabIdx < toolbarIdx, 'tabs phải nằm TRƯỚC toolbar')
  assert.match(page, /border-b-2/, 'dùng underline tab')
  assert.match(page, /aria-selected=\{smartView === v\.key\}/, 'tab có aria-selected')
})

test('P1: tab single-source — nhãn lấy từ SMART_VIEWS, không hardcode', () => {
  assert.match(page, /SMART_VIEWS\.map\(\(v\)/, 'render tabs từ SMART_VIEWS')
  assert.match(
    page,
    /SMART_VIEWS\.find\(\(v\) => v\.key === smartView\)\?\.label/,
    'tiêu đề bảng lấy từ SMART_VIEWS',
  )
})

test('P0: KHÔNG bịa scope owner (customers không có cột owner)', () => {
  // Nếu có tab "của tôi" mà không có cột owner → là bịa.
  assert.doesNotMatch(page, /Khách hàng của tôi/, 'KHÔNG có tab "của tôi" vô nghĩa')
  assert.match(
    page,
    /KHÔNG có cột owner \(đã verify trên DB\)/,
    'có ghi chú lý do không làm scope owner',
  )
})

test('P1: view open_tickets lọc trên dữ liệu thật, không bịa số', () => {
  assert.match(
    page,
    /rawItems\.filter\(\(item\) => \(item\.open_ticket_count \?\? 0\) > 0\)/,
    'lọc theo open_ticket_count thật',
  )
  assert.match(page, /params\.set\('has_project', 'true'\)/, 'view with_projects đẩy filter thật')
})
