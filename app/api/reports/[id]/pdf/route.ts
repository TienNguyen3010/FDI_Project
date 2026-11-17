// GET /api/reports/[id]/pdf — xuất PDF cho một Site Report.
// SERVER-ONLY: dùng fs để nhúng font Inter (xem lib/pdf.ts).
import { getSupabaseClient } from '@/lib/supabase/server'
import { generateReportPdf } from '@/lib/pdf'


export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return new Response('Thiếu mã báo cáo', { status: 400 })
    }

    const supabase = getSupabaseClient()

    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (reportError) {
      console.error('report pdf: lỗi query report', reportError.message)
      return new Response('Lỗi khi tải báo cáo', { status: 500 })
    }
    if (!report) {
      return new Response('Không tìm thấy báo cáo', { status: 404 })
    }

    const [projectRes, userRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', report.project_id).maybeSingle(),
      supabase.from('users').select('*').eq('id', report.user_id).maybeSingle(),
    ])

    const pdfBytes = await generateReportPdf(
      report,
      projectRes.data ?? null,
      userRes.data ?? null
    )
    const body = new Uint8Array(pdfBytes)

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bao-cao-${id.slice(0, 8)}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    // Không lộ stack/message chi tiết cho client.
    console.error('report pdf: lỗi tạo PDF', error)
    return new Response('Lỗi khi tạo PDF', { status: 500 })
  }
}
