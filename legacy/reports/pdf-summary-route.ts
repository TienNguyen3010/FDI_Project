// GET /api/reports/summary/pdf?period=week|month — xuất PDF tổng hợp.
// SERVER-ONLY: dùng fs để nhúng font Inter (xem lib/pdf.ts).
import { getSupabaseClient } from '@/lib/supabase/server'
import {
  generateSummaryPdf,
  periodCutoff,
  periodRangeLabel,
  type ReportPeriod,
  type SummaryRow,
} from '@/lib/pdf'
import type { Database } from '@/lib/types'

// Không khai báo runtime='nodejs': xung đột nextConfig.cacheComponents.
// API route mặc định chạy Node runtime; lib/pdf.ts dùng node:fs ở server.


type ReportRow = Database['public']['Tables']['reports']['Row']

const TYPES: ReportRow['type'][] = ['survey', 'deployment', 'maintenance']

function parsePeriod(value: string | null): ReportPeriod | null {
  return value === 'week' || value === 'month' ? value : null
}

export async function GET(request: Request) {
  try {
    const period = parsePeriod(new URL(request.url).searchParams.get('period'))
    if (!period) {
      return new Response('period phải là week hoặc month', { status: 400 })
    }

    const supabase = getSupabaseClient()
    const cutoff = periodCutoff(period)

    const { data, error } = await supabase
      .from('reports')
      .select('type, created_at')
      .gte('created_at', cutoff)

    if (error) {
      console.error('summary pdf: lỗi query reports', error.message)
      return new Response('Lỗi khi tải báo cáo', { status: 500 })
    }

    const reports = data ?? []
    const rows: SummaryRow[] = TYPES.map((type) => {
      const count = reports.filter((report) => report.type === type).length
      return {
        type,
        count,
        percent: reports.length ? (count / reports.length) * 100 : 0,
      }
    })

    const pdfBytes = await generateSummaryPdf(rows, period, periodRangeLabel(period))
    const body = new Uint8Array(pdfBytes)
    const filename = `tong-hop-bao-cao-${period}.pdf`

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('summary pdf: lỗi tạo PDF', error)
    return new Response('Lỗi khi tạo PDF', { status: 500 })
  }
}
