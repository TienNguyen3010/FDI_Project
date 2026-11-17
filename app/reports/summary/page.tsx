'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Download, Loader2 } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@/components/ui/ui'
import { supabase } from '@/lib/supabase'

type Period = 'week' | 'month'
const TYPES = ['survey', 'deployment', 'maintenance'] as const
type ReportType = (typeof TYPES)[number]

const TYPE_LABELS: Record<ReportType, string> = {
  survey: 'Khảo sát',
  deployment: 'Triển khai',
  maintenance: 'Bảo trì',
}

interface SummaryRow {
  type: ReportType
  count: number
  percent: number
}

function formatGMT7(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

/** Mốc bắt đầu kỳ theo giờ GMT+7 (khớp lib/pdf.ts). */
function periodCutoff(period: Period, now = new Date()): string {
  const offsetMs = 7 * 60 * 60 * 1000
  const shifted = new Date(now.getTime() + offsetMs)
  if (period === 'week') shifted.setUTCDate(shifted.getUTCDate() - 7)
  else shifted.setUTCMonth(shifted.getUTCMonth() - 1)
  shifted.setUTCHours(0, 0, 0, 0)
  return new Date(shifted.getTime() - offsetMs).toISOString()
}

function SummaryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const raw = searchParams.get('period')
  const period: Period = raw === 'month' ? 'month' : 'week'
  const toast = useToast()

  const [rows, setRows] = useState<SummaryRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('type, created_at')
          .gte('created_at', periodCutoff(period))
        if (cancelled) return
        if (error) {
          toast.error({ title: 'Không tải được tổng hợp', description: error.message })
          setLoading(false)
          return
        }
        const reports = data ?? []
        const next: SummaryRow[] = TYPES.map((type) => {
          const count = reports.filter((report) => report.type === type).length
          return {
            type,
            count,
            percent: reports.length ? (count / reports.length) * 100 : 0,
          }
        })
        setRows(next)
        setTotal(reports.length)
      } catch {
        if (!cancelled) toast.error({ title: 'Không tải được tổng hợp' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [period, toast])

  const changePeriod = useCallback(
    (value: string) => {
      router.replace(`/reports/summary?period=${value}`)
    },
    [router]
  )

  const exportPdf = useCallback(async () => {
    setExporting(true)
    try {
      const response = await fetch(`/api/reports/summary/pdf?period=${period}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `tong-hop-bao-cao-${period}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      toast.success({ title: 'Đã xuất PDF tổng hợp' })
    } catch {
      toast.error({ title: 'Xuất PDF thất bại', description: 'Vui lòng thử lại.' })
    } finally {
      setExporting(false)
    }
  }, [period, toast])

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Tổng hợp báo cáo hiện trường
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Thống kê số lượng và tỉ lệ theo loại báo cáo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            aria-label="Chu kỳ tổng hợp"
            value={period}
            onChange={(event) => changePeriod(event.target.value)}
            className="w-32"
          >
            <option value="week">Tuần</option>
            <option value="month">Tháng</option>
          </Select>
          <Button onClick={exportPdf} disabled={exporting}>
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {exporting ? 'Đang xuất...' : 'Xuất PDF'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Báo cáo theo loại</CardTitle>
          <CardDescription>
            Kỳ {period === 'week' ? 'tuần' : 'tháng'} · từ{' '}
            {formatGMT7(periodCutoff(period))} · tổng {total} báo cáo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-[var(--text-secondary)]">
              <Spinner label="Đang tải" /> Đang tải...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loại báo cáo</TableHead>
                  <TableHead>Số lượng</TableHead>
                  <TableHead>Tỉ lệ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.type}>
                    <TableCell>
                      <Badge variant={row.type === 'maintenance' ? 'paused' : 'in-progress'}>
                        {TYPE_LABELS[row.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.count}</TableCell>
                    <TableCell>{row.percent.toFixed(1).replace('.', ',')}%</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-medium">Tổng</TableCell>
                  <TableCell className="font-medium">{total}</TableCell>
                  <TableCell className="font-medium">{total ? '100,0' : '0,0'}%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ReportSummaryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 p-8 text-[var(--text-secondary)]">
          <Spinner label="Đang tải" /> Đang tải...
        </div>
      }
    >
      <SummaryContent />
    </Suspense>
  )
}
