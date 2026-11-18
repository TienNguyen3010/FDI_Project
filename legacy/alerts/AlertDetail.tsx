'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/types'
import {
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Spinner,
  EmptyState,
  useToast,
} from '@/components/ui/ui'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { IncidentLifecycle } from '@/components/incident/IncidentLifecycle'

type AlertRow = Database['public']['Tables']['alerts']['Row']

const VN_DATE = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  dateStyle: 'medium',
  timeStyle: 'short',
})

/**
 * Client child: nhận params promise từ server page (React `use`), fetch alert
 * theo id qua supabase browser client để request mang session user (RLS đúng).
 */
export function AlertDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const toast = useToast()
  const [alert, setAlert] = useState<AlertRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      const { data, error } = await supabase.from('alerts').select('*').eq('id', id).maybeSingle()
      if (cancelled) return
      if (error) {
        toast.error({ title: 'Không tải được sự cố', description: error.message })
      } else if (!data) {
        toast.info({ title: 'Không tìm thấy sự cố', description: `Mã: ${id}` })
      } else {
        setAlert(data as AlertRow)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [id, toast])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/alerts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> Quay lại cảnh báo
        </Link>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-10 text-muted-foreground">
            <Spinner label="Đang tải sự cố" /> Đang tải chi tiết sự cố...
          </CardContent>
        </Card>
      ) : !alert ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<AlertTriangle size={32} />}
              title="Không tìm thấy sự cố"
              description="Sự cố có thể đã bị xoá hoặc bạn không có quyền xem."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                Chi tiết sự cố
                <Badge variant={alert.severity === 'minor' ? 'minor' : alert.severity}>
                  {alert.severity}
                </Badge>
                <Badge variant="default">{alert.status}</Badge>
              </CardTitle>
              <CardDescription>{alert.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Mã sự cố</dt>
                  <dd className="break-all font-medium text-foreground">{alert.id}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Dự án</dt>
                  <dd className="break-all font-medium text-foreground">{alert.project_id}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Mức độ / Ưu tiên</dt>
                  <dd className="font-medium text-foreground">
                    {alert.severity} / {alert.priority}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Nguồn</dt>
                  <dd className="font-medium text-foreground">{alert.source ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Người xử lý</dt>
                  <dd className="break-all font-medium text-foreground">{alert.owner_id ?? 'Chưa nhận'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tạo lúc</dt>
                  <dd className="font-medium text-foreground">
                    {VN_DATE.format(new Date(alert.created_at))}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <IncidentLifecycle alert={alert} />
        </>
      )}
    </div>
  )
}
