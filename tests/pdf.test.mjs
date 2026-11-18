// Unit test cho Bản 3 — Site Report PDF (pdf-lib + Inter nhúng).
// Không import TS trực tiếp (Node không chạy TS): kiểm tra cấu trúc thật trên đĩa.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const read = (rel) => readFileSync(resolve(root, rel), 'utf-8')
// Route group (workspace) từ 2026-11-18: thử path mới trước, fallback path cũ.
const readPage = (rel) => {
  const grouped = `app/(workspace)/${rel}`
  const path = existsSync(resolve(root, grouped)) ? grouped : rel
  return read(path)
}

const FONTS = ['assets/fonts/Inter-Regular.ttf', 'assets/fonts/Inter-Bold.ttf']

test('file font Inter tồn tại và có magic bytes TTF 00010000', () => {
  for (const rel of FONTS) {
    assert.ok(existsSync(resolve(root, rel)), `thiếu file font ${rel}`)
    const magic = readFileSync(resolve(root, rel)).subarray(0, 4).toString('hex')
    assert.equal(magic, '00010000', `${rel} không phải TTF hợp lệ (magic=${magic})`)
  }
})

test('lib/pdf.ts dùng PDFDocument.create + embedFont Inter (không dùng font chuẩn)', () => {
  const src = read('lib/pdf.ts')
  assert.ok(src.includes('PDFDocument.create'), 'thiếu PDFDocument.create()')
  assert.ok(src.includes('Inter-Regular.ttf'), 'thiếu tên file Inter-Regular.ttf')
  assert.ok(src.includes('Inter-Bold.ttf'), 'thiếu tên file Inter-Bold.ttf')
  assert.ok(src.includes('embedFont'), 'thiếu embedFont() — pdf-lib font chuẩn không có dấu tiếng Việt')
  assert.ok(src.includes('async function generateReportPdf'), 'thiếu generateReportPdf()')
  assert.ok(src.includes('async function generateSummaryPdf'), 'thiếu generateSummaryPdf()')
  assert.ok(src.includes('Asia/Ho_Chi_Minh'), 'thiếu múi giờ GMT+7')
})

test('các route API PDF tồn tại và trả application/pdf', () => {
  const detail = read('app/api/reports/[id]/pdf/route.ts')
  const summary = read('app/api/reports/summary/pdf/route.ts')
  for (const [name, src] of [['detail', detail], ['summary', summary]]) {
    assert.ok(src.includes("'application/pdf'"), `${name}: thiếu Content-Type application/pdf`)
    assert.ok(src.includes('Content-Disposition'), `${name}: thiếu Content-Disposition`)
  }
  assert.ok(detail.includes('bao-cao-'), 'detail: tên file phải có prefix bao-cao-')
  assert.ok(detail.includes('status: 404'), 'detail: thiếu xử lý 404')
  assert.ok(detail.includes('status: 500'), 'detail: thiếu xử lý 500')
})

test('trang chi tiết & tổng hợp tồn tại, gọi API PDF và dùng Toast', () => {
  const detailPage = readPage('reports/[id]/page.tsx')
  const summaryPage = readPage('reports/summary/page.tsx')
  assert.ok(detailPage.includes('/api/reports/${id}/pdf'), 'detail: thiếu fetch API PDF')
  assert.ok(detailPage.includes('Xuất PDF'), 'detail: thiếu nút Xuất PDF')
  assert.ok(summaryPage.includes('/api/reports/summary/pdf?period='), 'summary: thiếu fetch API PDF')
  assert.ok(summaryPage.includes('period=week|month') || summaryPage.includes("'week'") && summaryPage.includes("'month'"), 'summary: thiếu filter week|month')
  assert.ok(detailPage.includes('useToast') && summaryPage.includes('useToast'), 'thiếu Toast success/error')
})
