// FDI_Project — Tạo PDF Site Report (SERVER-ONLY)
//
// ⚠️  SERVER-ONLY: file này dùng `node:fs/promises` để đọc font TTF nhúng.
//     Chỉ import từ API route (app/api/**). KHÔNG import từ component/client —
//     pdf-lib + fs là mã chạy trên server. (Gói `server-only` không có trong
//     node_modules nên không dùng import đó; comment này là ranh giới rõ ràng.)
//
// Tiếng Việt: pdf-lib font chuẩn (Helvetica...) KHÔNG có dấu tiếng Việt.
// Mọi lời gọi drawText ở đây đều dùng font Inter được embedFont() từ file TTF,
// nên Render đúng dấu ∪/━/? v.v. Không dùng drawText mặc định.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { Database, Json } from './types'

type Report = Database['public']['Tables']['reports']['Row']
type Project = Database['public']['Tables']['projects']['Row']
type User = Database['public']['Tables']['users']['Row']

export type ReportPeriod = 'week' | 'month'

export interface SummaryRow {
  type: Report['type']
  count: number
  percent: number
}

export const TYPE_LABELS: Record<Report['type'], string> = {
  survey: 'Khảo sát',
  deployment: 'Triển khai',
  maintenance: 'Bảo trì',
}

/* -------------------------------------------------------------------------- */
/*  Font — đọc từ assets/fonts (có sẵn, magic bytes 00010000 = TTF hợp lệ)     */
/* -------------------------------------------------------------------------- */

const REGULAR_FILE = 'Inter-Regular.ttf'
const BOLD_FILE = 'Inter-Bold.ttf'
async function readFont(fileName: string): Promise<Uint8Array> {
  // turbopackIgnore: chỉ đọc 1 file TTF cụ thể lúc runtime, KHÔNG trace toàn bộ project
  // (nếu không có comment này, Turbopack traced hổ cả node_modules -> OOM khi build).
  const filePath = join(process.cwd(), 'assets', 'fonts', fileName)
  return await readFile(/* turbopackIgnore: true */ filePath)
}

/* -------------------------------------------------------------------------- */
/*  Layout cơ bản: A4, xuống dòng & ngắt trang                                */
/* -------------------------------------------------------------------------- */

const A4: [number, number] = [595.28, 841.89]
const MARGIN = 48
const BOTTOM = 56
const LINE = 15

const INK = rgb(0.12, 0.16, 0.2)
const MUTED = rgb(0.42, 0.46, 0.52)
const ACCENT = rgb(0.05, 0.35, 0.45)

interface Canvas {
  doc: PDFDocument
  page: PDFPage
  y: number
  regular: PDFFont
  bold: PDFFont
}

function addPage(canvas: Canvas): void {
  canvas.page = canvas.doc.addPage(A4)
  canvas.y = A4[1] - MARGIN
}

function ensureSpace(canvas: Canvas, needed: number): void {
  if (canvas.y - needed < BOTTOM) addPage(canvas)
}

/** Xuống dòng theo từ; nếu một từ dài quá dòng thì cắt theo ký tự. */
function wrapLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const result: string[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    const words = rawLine.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      result.push('')
      continue
    }
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate
        continue
      }
      if (current) result.push(current)
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        let chunk = ''
        for (const char of word) {
          if (chunk && font.widthOfTextAtSize(chunk + char, size) > maxWidth) {
            result.push(chunk)
            chunk = char
          } else {
            chunk += char
          }
        }
        current = chunk
      } else {
        current = word
      }
    }
    if (current) result.push(current)
  }
  return result.length > 0 ? result : ['']
}

interface WriteOptions {
  font?: PDFFont
  size?: number
  color?: ReturnType<typeof rgb>
  gap?: number
  indent?: number
}

function write(canvas: Canvas, text: string, options: WriteOptions = {}): void {
  const size = options.size ?? 10
  const font = options.font ?? canvas.regular
  const color = options.color ?? INK
  const indent = options.indent ?? 0
  const maxWidth = A4[0] - MARGIN * 2 - indent
  for (const line of wrapLines(text, font, size, maxWidth)) {
    ensureSpace(canvas, LINE)
    canvas.page.drawText(line, {
      x: MARGIN + indent,
      y: canvas.y,
      font,
      size,
      color,
    })
    canvas.y -= options.gap ?? LINE
  }
}

function heading(canvas: Canvas, text: string): void {
  ensureSpace(canvas, LINE * 3)
  canvas.y -= 6
  write(canvas, text, { font: canvas.bold, size: 12, color: ACCENT, gap: 18 })
  ensureSpace(canvas, 4)
  canvas.page.drawLine({
    start: { x: MARGIN, y: canvas.y + 6 },
    end: { x: A4[0] - MARGIN, y: canvas.y + 6 },
    thickness: 0.7,
    color: ACCENT,
  })
  canvas.y -= 4
}

function field(canvas: Canvas, label: string, value: string): void {
  const labelText = `${label}:`
  const size = 10
  const labelWidth = canvas.bold.widthOfTextAtSize(labelText, size) + 8
  const valueLines = wrapLines(value || '—', canvas.regular, size, A4[0] - MARGIN * 2 - labelWidth)
  valueLines.forEach((line, index) => {
    ensureSpace(canvas, LINE)
    if (index === 0) {
      canvas.page.drawText(labelText, {
        x: MARGIN,
        y: canvas.y,
        font: canvas.bold,
        size,
        color: INK,
      })
    }
    canvas.page.drawText(line, {
      x: MARGIN + labelWidth,
      y: canvas.y,
      font: canvas.regular,
      size,
      color: INK,
    })
    canvas.y -= LINE
  })
}

function tableRow(canvas: Canvas, cells: [string, string, string], strong = false): void {
  ensureSpace(canvas, LINE + 6)
  const font = strong ? canvas.bold : canvas.regular
  const xs = [MARGIN, MARGIN + 260, MARGIN + 390]
  cells.forEach((cell, index) => {
    canvas.page.drawText(cell, { x: xs[index], y: canvas.y, font, size: 10, color: INK })
  })
  canvas.page.drawLine({
    start: { x: MARGIN, y: canvas.y - 4 },
    end: { x: A4[0] - MARGIN, y: canvas.y - 4 },
    thickness: 0.5,
    color: MUTED,
  })
  canvas.y -= LINE + 6
}

async function finish(canvas: Canvas): Promise<Uint8Array> {
  const footerLeft = 'FDI_Project — Báo cáo hiện trường'
  const total = canvas.doc.getPageCount()
  canvas.doc.getPages().forEach((page, index) => {
    page.drawText(footerLeft, { x: MARGIN, y: 28, font: canvas.regular, size: 8, color: MUTED })
    const pageLabel = `Trang ${index + 1}/${total}`
    page.drawText(pageLabel, {
      x: A4[0] - MARGIN - canvas.regular.widthOfTextAtSize(pageLabel, 8),
      y: 28,
      font: canvas.regular,
      size: 8,
      color: MUTED,
    })
  })
  return canvas.doc.save()
}

async function createCanvas(): Promise<Canvas> {
  const doc = await PDFDocument.create()
  // pdf-lib không embed TTF tùy chỉnh khi chưa đăng ký fontkit (@pdf-lib/fontkit).
  doc.registerFontkit(fontkit as Parameters<typeof doc.registerFontkit>[0])
  const [regularBytes, boldBytes] = await Promise.all([readFont(REGULAR_FILE), readFont(BOLD_FILE)])
  // embedFont với TTF → có glyph tiếng Việt. subset=true giảm dung lượng file.
  const regular = await doc.embedFont(regularBytes, { subset: true })
  const bold = await doc.embedFont(boldBytes, { subset: true })
  const canvas: Canvas = {
    doc,
    page: undefined as unknown as PDFPage,
    y: 0,
    regular,
    bold,
  }
  addPage(canvas)
  return canvas
}

/* -------------------------------------------------------------------------- */
/*  Tiện ích thời gian GMT+7 (Asia/Ho_Chi_Minh)                                */
/* -------------------------------------------------------------------------- */

/** Định dạng thời gian theo GMT+7; trả '—' nếu rỗng/không hợp lệ. */
export function formatGMT7(iso: string | null | undefined, withTime = true): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  }).format(date)
}

/** Mốc bắt đầu kỳ, tính theo giờ GMT+7 (0h00 ngày cutoff). */
export function periodCutoff(period: ReportPeriod, now = new Date()): string {
  const offsetMs = 7 * 60 * 60 * 1000
  const shifted = new Date(now.getTime() + offsetMs) // đồng hồ "giờ Việt Nam"
  if (period === 'week') shifted.setUTCDate(shifted.getUTCDate() - 7)
  else shifted.setUTCMonth(shifted.getUTCMonth() - 1)
  shifted.setUTCHours(0, 0, 0, 0)
  return new Date(shifted.getTime() - offsetMs).toISOString() // đổi lại sang UTC
}

/** Nhãn khoảng thời gian hiển thị trong PDF tổng hợp. */
export function periodRangeLabel(period: ReportPeriod, now = new Date()): string {
  return `${formatGMT7(periodCutoff(period, now), false)} – ${formatGMT7(now.toISOString(), false)}`
}

/* -------------------------------------------------------------------------- */
/*  PDF báo cáo chi tiết                                                      */
/* -------------------------------------------------------------------------- */

function stringifyValue(value: Json | null | undefined): string {
  if (value == null) return ''
  if (typeof value === 'object') {
    if (Array.isArray(value)) return value.map(stringifyValue).join('; ')
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${stringifyValue(item)}`)
      .join('\n')
  }
  return String(value)
}

/** Tạo PDF cho một Site Report. Trả về bytes của file PDF. */
export async function generateReportPdf(
  report: Report,
  project: Project | null,
  user: User | null
): Promise<Uint8Array> {
  const canvas = await createCanvas()

  write(canvas, 'BÁO CÁO HIỆN TRƯỜNG', {
    font: canvas.bold,
    size: 18,
    color: ACCENT,
    gap: 24,
  })
  write(canvas, 'FDI_Project — Báo cáo khảo sát / triển khai / bảo trì', {
    size: 9,
    color: MUTED,
    gap: 14,
  })

  heading(canvas, 'THÔNG TIN CHUNG')
  field(canvas, 'Mã báo cáo', report.id)
  field(canvas, 'Dự án', project?.name ?? report.project_id)
  field(canvas, 'Loại báo cáo', TYPE_LABELS[report.type] ?? report.type)
  field(canvas, 'Người lập', user?.email ?? report.user_id)
  field(canvas, 'Ngày lập', formatGMT7(report.created_at))
  if (project) {
    field(canvas, 'Trạng thái dự án', project.status)
    field(canvas, 'Tiến độ dự án', `${project.progress}%`)
  }

  heading(canvas, 'NỘI DUNG BÁO CÁO')
  write(canvas, report.content?.trim() || '(Không có nội dung)', {
    color: report.content?.trim() ? INK : MUTED,
  })

  if (report.progress != null) {
    heading(canvas, 'TIẾN ĐỘ')
    write(canvas, stringifyValue(report.progress) || '—')
  }

  heading(canvas, 'XÁC NHẬN')
  field(canvas, 'Chữ ký', report.signature?.trim() || '—')
  write(canvas, 'Ký tên xác nhận nội dung báo cáo trên.', { size: 9, color: MUTED })

  return finish(canvas)
}

/* -------------------------------------------------------------------------- */
/*  PDF tổng hợp tuần / tháng                                                 */
/* -------------------------------------------------------------------------- */

/** Tạo PDF tổng hợp số lượng + tỉ lệ theo loại báo cáo. Trả về bytes PDF. */
export async function generateSummaryPdf(
  rows: SummaryRow[],
  period: ReportPeriod,
  rangeLabel?: string
): Promise<Uint8Array> {
  const canvas = await createCanvas()

  write(canvas, 'TỔNG HỢP BÁO CÁO HIỆN TRƯỜNG', {
    font: canvas.bold,
    size: 16,
    color: ACCENT,
    gap: 22,
  })
  write(canvas, `Chu kỳ: ${period === 'week' ? 'Tuần' : 'Tháng'}${rangeLabel ? ` (${rangeLabel})` : ''}`, {
    size: 10,
    color: MUTED,
    gap: 14,
  })
  write(canvas, `Ngày xuất: ${formatGMT7(new Date().toISOString())}`, {
    size: 9,
    color: MUTED,
    gap: 16,
  })

  heading(canvas, 'BÁO CÁO THEO LOẠI')
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  tableRow(canvas, ['Loại báo cáo', 'Số lượng', 'Tỉ lệ'], true)
  for (const row of rows) {
    tableRow(canvas, [
      TYPE_LABELS[row.type] ?? row.type,
      String(row.count),
      `${row.percent.toFixed(1).replace('.', ',')}%`,
    ])
  }
  tableRow(canvas, ['Tổng', String(total), `${total ? '100,0' : '0,0'}%`], true)
  if (total === 0) {
    write(canvas, 'Không có báo cáo nào trong kỳ này.', { color: MUTED })
  }

  return finish(canvas)
}
