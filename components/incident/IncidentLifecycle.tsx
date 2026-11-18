'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Database } from '@/lib/types'
import { can, useProfile, type Role } from '@/lib/hooks/useProfile'
import {
  STATUS_ORDER,
  STATUS_LABEL,
  SLA_HOURS,
  SLA_LABEL,
  type AlertStatus,
  type Severity,
} from '@/features/alerts/schema'
import { changeAlertStatus, createWorkFromAlert } from '@/features/alerts/actions'
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/ui'
import { AlertTriangle, CheckCircle2, ListTodo } from 'lucide-react'

// Checklist §5 #3,#4,#8,#15 — Vòng đời sự cố + SLA.
// Nhận alert object (Row) từ trang chi tiết; mọi ghi DB đều qua supabase-js có kiểu.

type AlertRow = Database['public']['Tables']['alerts']['Row']

interface Transition {
  to: AlertStatus
  label: string
  roles: Role[]
  from: AlertStatus[]
}

// Chuyển trạng thái theo RBAC mềm (rbac_matrix.md:40 + yêu cầu Bản 2 §5):
// - Nhận xử lý: employee, leader
// - Đang xử lý: employee, leader, manager (người thao tác hiện trường)
// - Đã giải quyết: leader, manager
// - Đóng: manager, director
const TRANSITIONS: Transition[] = [
  { to: 'acknowledged', label: 'Nhận xử lý', roles: ['employee', 'leader'], from: ['new'] },
  {
    to: 'in_progress',
    label: 'Đang xử lý',
    roles: ['employee', 'leader', 'manager'],
    from: ['acknowledged'],
  },
  { to: 'resolved', label: 'Đã giải quyết', roles: ['leader', 'manager'], from: ['in_progress'] },
  { to: 'closed', label: 'Đóng', roles: ['manager', 'director'], from: ['resolved'] },
]

const VN_DATE = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  dateStyle: 'medium',
  timeStyle: 'short',
})

/** Đổi mili-giây thành chuỗi tiếng Việt dễ đọc, VD: "3 giờ 25 phút". */
function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const totalMinutes = Math.floor(ms / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  const parts: string[] = []
  if (days > 0) parts.push(`${days} ngày`)
  if (hours > 0) parts.push(`${hours} giờ`)
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} phút`)
  return parts.join(' ')
}

export function IncidentLifecycle({ alert }: { alert: AlertRow }) {
  const router = useRouter()
  const { profile, role } = useProfile()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const currentStatus = (STATUS_ORDER.includes(alert.status as AlertStatus)
    ? alert.status
    : 'new') as AlertStatus
  const currentIndex = STATUS_ORDER.indexOf(currentStatus)
  const severity = (['critical', 'major', 'minor'].includes(alert.severity)
    ? alert.severity
    : 'minor') as Severity

  // SLA: từ lúc tạo đến lúc giải quyết (resolved_at) hoặc đến hiện tại nếu chưa xong.
  // Date.now() là impure — chỉ đọc trong effect, render dùng state.
  const [nowMs, setNowMs] = useState(0)
  useEffect(() => {
    void Promise.resolve().then(() => setNowMs(Date.now()))
  }, [])
  const startMs = new Date(alert.created_at).getTime()
  const endMs = alert.resolved_at ? new Date(alert.resolved_at).getTime() : (nowMs || startMs)
  const elapsedMs = Number.isFinite(startMs) && Number.isFinite(endMs) ? Math.max(0, endMs - startMs) : 0
  const thresholdMs = SLA_HOURS[severity] * 60 * 60 * 1000
  const breached = elapsedMs > thresholdMs

  const changeStatus = async (transition: Transition) => {
    setBusy(transition.to)
    setMessage(null)
    const ownerId =
      transition.to === 'acknowledged' && profile?.id ? profile.id : alert.owner_id
    const result = await changeAlertStatus({ to: transition.to, alert, ownerId })
    setBusy(null)
    setMessage(result.message)
    if (result.ok) router.refresh()
  }

  const createWorkFromIncident = async () => {
    setBusy('create-work')
    setMessage(null)
    const result = await createWorkFromAlert({ alert, severity, creatorId: profile?.id ?? null })
    setBusy(null)
    setMessage(result.message)
    if (result.ok) {
      router.push('/works')
      router.refresh()
    }
  }

  const available = TRANSITIONS.filter(
    (t) => t.from.includes(currentStatus) && can(role, t.roles)
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Tiến trình xử lý sự cố
            <Badge variant={severity === 'minor' ? 'minor' : severity}>
              {SLA_LABEL[severity]}
            </Badge>
            <Badge variant={currentStatus === 'closed' ? 'active' : 'in-progress'}>
              {STATUS_LABEL[currentStatus]}
            </Badge>
          </CardTitle>
          <CardDescription>
            Trạng thái: new → acknowledged → in_progress → resolved → closed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {STATUS_ORDER.map((status, index) => {
              const done = index < currentIndex
              const active = index === currentIndex
              return (
                <li key={status} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                      done || active
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                        : 'border-[var(--border)] text-[var(--text-secondary)]'
                    }`}
                    aria-hidden="true"
                  >
                    {done ? <CheckCircle2 size={14} /> : index + 1}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        active || done ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {STATUS_LABEL[status]}
                      {active && ' — hiện tại'}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>

          {available.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
              {available.map((t) => (
                <Button
                  key={t.to}
                  type="button"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => void changeStatus(t)}
                >
                  {busy === t.to ? 'Đang xử lý...' : t.label}
                </Button>
              ))}
            </div>
          )}
          {available.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              Không có thao tác phù hợp với vai trò của bạn ở trạng thái này.
            </p>
          )}
          {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle size={18} /> SLA xử lý
          </CardTitle>
          <CardDescription>
            Tính từ lúc phát hiện đến lúc giải quyết (hoặc đến hiện tại nếu chưa xong).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-foreground">
            Thời gian đã trôi: <strong>{formatDuration(elapsedMs)}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Ngưỡng {SLA_LABEL[severity]}: {SLA_HOURS[severity]} giờ
          </p>
          <p className="text-sm text-muted-foreground">
            Bắt đầu: {VN_DATE.format(new Date(alert.created_at))}
          </p>
          {alert.resolved_at && (
            <p className="text-sm text-muted-foreground">
              Giải quyết: {VN_DATE.format(new Date(alert.resolved_at))}
            </p>
          )}
          {breached ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
              ⚠️ Đã vượt ngưỡng SLA {SLA_HOURS[severity]} giờ. Cần escalate ngay.
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500">
              ✓ Còn trong ngưỡng SLA.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo size={18} /> Công việc liên quan
          </CardTitle>
          <CardDescription>Checklist §5 #3 — tạo công việc trực tiếp từ sự cố.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            disabled={busy !== null}
            onClick={() => void createWorkFromIncident()}
          >
            {busy === 'create-work' ? 'Đang tạo...' : 'Tạo việc từ sự cố'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
