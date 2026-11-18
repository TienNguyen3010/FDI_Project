'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Download, Loader2 } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Spinner,
  useToast,
} from '@/components/ui/ui'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/lib/types'

const TYPE_LABELS: Record<string, string> = {
  survey: 'Khảo sát',
  deployment: 'Triển khai',
  maintenance: 'Bảo trì',
}

function formatGMT7(iso: string | null | undefined): string {
  if (!iso) return '—'
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

type Report = {
  id: string
  project_id: string
  user_id: string
  type: 'survey' | 'deployment' | 'maintenance'
  content: string | null
  progress: Json | null
  signature: string | null
  created_at: string
}

function renderJson(value: Json | null): string {
  if (value == null) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const toast = useToast()

  const [report, setReport] = useState<Report | null>(null)
  const [projectName, setProjectName] = useState<string>('')
  const [author, setAuthor] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('id', id)
          .maybeSingle()
        if (cancelled) return
        if (error || !data) {
          toast.error({ title: 'Không tải được báo cáo', description: error?.message })
          setLoading(false)
          return
        }
        setReport(data as Report)

        const [projectRes, userRes] = await Promise.all([
          supabase.from('projects').select('name').eq('id', data.project_id).maybeSingle(),
          supabase.from('users').select('email').eq('id', data.user_id).maybeSingle(),
        ])
        if (cancelled) return
        setProjectName(projectRes.data?.name ?? data.project_id)
        setAuthor(userRes.data?.email ?? data.user_id)
      } catch {
        if (!cancelled) toast.error({ title: 'Không tải được báo cáo' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id, toast])

  const exportPdf = useCallback(async () => {
    if (!id) return
    setExporting(true)
    try {
      const response = await fetch(`/api/reports/${id}/pdf`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `bao-cao-${id.slice(0, 8)}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      toast.success({ title: 'Đã xuất PDF báo cáo' })
    } catch {
      toast.error({ title: 'Xuất PDF thất bại', description: 'Vui lòng thử lại.' })
    } finally {
      setExporting(false)
    }
  }, [id, toast])

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-[var(--text-secondary)]">
        <Spinner label="Đang tải báo cáo" /> Đang tải báo cáo...
      </div>
    )
  }

  if (!report) {
    return (
      <Card className="p-6">
        <p className="text-sm text-[var(--text-secondary)]">Không tìm thấy báo cáo.</p>
        <Link href="/reports" className="mt-3 inline-block text-sm text-[var(--accent)]">
          ← Quay lại danh sách
        </Link>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)]"
        >
          <ArrowLeft size={16} /> Quay lại danh sách
        </Link>
        <Button onClick={exportPdf} disabled={exporting}>
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {exporting ? 'Đang xuất...' : 'Xuất PDF'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Báo cáo hiện trường
            <Badge variant={report.type === 'maintenance' ? 'paused' : 'in-progress'}>
              {TYPE_LABELS[report.type] ?? report.type}
            </Badge>
          </CardTitle>
          <CardDescription>Mã báo cáo: {report.id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[var(--text-secondary)]">Dự án</dt>
              <dd className="text-sm font-medium">{projectName || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-secondary)]">Người lập</dt>
              <dd className="text-sm font-medium">{author || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-secondary)]">Ngày lập</dt>
              <dd className="text-sm font-medium">{formatGMT7(report.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-secondary)]">Chữ ký</dt>
              <dd className="text-sm font-medium">{report.signature || '—'}</dd>
            </div>
          </dl>

          <div>
            <p className="mb-1 text-xs text-[var(--text-secondary)]">Nội dung</p>
            <p className="whitespace-pre-wrap text-sm">{report.content || '(Không có nội dung)'}</p>
          </div>

          {report.progress != null && (
            <div>
              <p className="mb-1 text-xs text-[var(--text-secondary)]">Tiến độ</p>
              <p className="whitespace-pre-wrap text-sm">{renderJson(report.progress)}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
