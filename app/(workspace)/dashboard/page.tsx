'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/types'
import { useProfile } from '@/lib/hooks/useProfile'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Select,
  buttonVariants,
} from '@/components/ui/ui'
import {
  Users,
  FolderKanban,
  Cpu,
  AlertTriangle,
  Camera,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
} from 'lucide-react'

// SELECT chỉ lấy một số cột → dùng Pick<> khớp danh sách cột thay vì Row đầy đủ.
type ProjectRow = Pick<
  Database['public']['Tables']['projects']['Row'],
  'id' | 'customer_id' | 'name' | 'status' | 'progress' | 'pm_id' | 'created_at' | 'end_date'
>
type AlertRow = Pick<
  Database['public']['Tables']['alerts']['Row'],
  'id' | 'project_id' | 'severity' | 'status' | 'priority' | 'owner_id' | 'description' | 'created_at'
>
type MaintenanceRow = Pick<
  Database['public']['Tables']['maintenances']['Row'],
  'id' | 'project_id' | 'type' | 'due_date' | 'status'
>

// Cố định danh sách cột dạng literal để supabase-js generic infer đúng kiểu row.
const PROJECT_COLS = 'id, customer_id, name, status, progress, pm_id, created_at, end_date' as const
const ALERT_COLS = 'id, project_id, severity, status, priority, owner_id, description, created_at' as const
const MAINT_COLS = 'id, project_id, type, due_date, status' as const

const VN_TZ = 'Asia/Ho_Chi_Minh'
const OPEN_ALERT_STATUSES = ['new', 'acknowledged', 'in_progress']
// `status` của maintenances là TEXT tự do — dùng bộ nhãn hoàn thành thông dụng.
const DONE_MAINTENANCE_STATUSES = ['completed', 'done', 'finished', 'hoàn thành']

type SeverityFilter = 'all' | 'critical' | 'major' | 'minor'

interface Stats {
  customers: number
  runningProjects: number
  activeDevices: number
  openCriticalMajor: number
  overduePct: number
  overdueCount: number
  newProjectsWeek: number
  maintenanceCompletionPct: number
  slaRisk: number
}

interface DashboardData {
  projects: ProjectRow[]
  alerts: AlertRow[]
  maintenances: MaintenanceRow[]
  stats: Stats
}

const EMPTY_STATS: Stats = {
  customers: 0,
  runningProjects: 0,
  activeDevices: 0,
  openCriticalMajor: 0,
  overduePct: 0,
  overdueCount: 0,
  newProjectsWeek: 0,
  maintenanceCompletionPct: 0,
  slaRisk: 0,
}

const EMPTY_DATA: DashboardData = {
  projects: [],
  alerts: [],
  maintenances: [],
  stats: EMPTY_STATS,
}

/** Ngày hôm nay theo GMT+7, trả về dạng YYYY-MM-DD để so với cột DATE. */
function todayVN(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VN_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VN_TZ,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusLabel(status: ProjectRow['status']): string {
  switch (status) {
    case 'deployed':
      return 'Đã triển khai'
    case 'planned':
      return 'Đã lên lịch'
    case 'paused':
      return 'Tạm dừng'
    case 'ended':
      return 'Đã kết thúc'
    default:
      return 'Đang chạy'
  }
}

function statusColor(status: ProjectRow['status']): string {
  switch (status) {
    case 'deployed':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    case 'planned':
      return 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
    case 'paused':
      return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
    case 'ended':
      return 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
    default:
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
  }
}

function LoadingBlock() {
  return (
    <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
      Đang tải...
    </div>
  )
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
      {message}
    </div>
  )
}

export default function DashboardPage() {
  const { profile, role, loading: profileLoading } = useProfile()
  const [data, setData] = useState<DashboardData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    // Chờ useProfile xong mới áp scope — nếu không sẽ query với role mặc định 'employee'.
    if (profileLoading) return

    let cancelled = false
    const today = todayVN()
    const userId = profile?.id ?? null
    const team = profile?.team ?? null

    async function load() {
      setLoading(true)
      setError(null)

      try {
        let scopedProjects: ProjectRow[] = []

        // ---- 1) Scope projects theo role (RBAC matrix §2) ----
        if (role === 'director') {
          // Toàn công ty — không filter.
          const { data: rows, error: e } = await supabase
            .from('projects')
            .select(PROJECT_COLS)
            .order('created_at', { ascending: false })
          if (cancelled) return
          if (e) throw e
          scopedProjects = rows ?? []
        } else if (role === 'employee') {
          // Chỉ dự án liên quan mình: PM của mình hoặc dự án có alert/works gán cho mình.
          if (userId) {
            const [
              { data: pmProjects, error: e1 },
              { data: ownAlerts, error: e2 },
              { data: ownWorks, error: e3 },
            ] = await Promise.all([
              supabase.from('projects').select(PROJECT_COLS).eq('pm_id', userId),
              supabase.from('alerts').select('project_id').eq('owner_id', userId),
              supabase.from('works').select('project_id').eq('assignee_id', userId),
            ])
            if (cancelled) return
            if (e1) throw e1
            if (e2) throw e2
            if (e3) throw e3

            const ids = new Set<string>((pmProjects ?? []).map((p) => p.id))
            ;(ownAlerts ?? []).forEach((a) => ids.add(a.project_id))
            ;(ownWorks ?? []).forEach((w) => ids.add(w.project_id))
            const idList = Array.from(ids)

            if (idList.length) {
              const { data: rows, error: e } = await supabase
                .from('projects')
                .select(PROJECT_COLS)
                .in('id', idList)
                .order('created_at', { ascending: false })
              if (cancelled) return
              if (e) throw e
              scopedProjects = rows ?? []
            }
          }
        } else {
          // leader / manager: dự án của team — join users.team qua projects.pm_id.
          if (team) {
            const { data: members, error: e } = await supabase
              .from('users')
              .select('id')
              .eq('team', team)
            if (cancelled) return
            if (e) throw e
            const memberIds = (members ?? []).map((m) => m.id)

            if (memberIds.length) {
              const { data: rows, error: e2 } = await supabase
                .from('projects')
                .select(PROJECT_COLS)
                .in('pm_id', memberIds)
                .order('created_at', { ascending: false })
              if (cancelled) return
              if (e2) throw e2
              scopedProjects = rows ?? []
            }
          } else if (role === 'manager') {
            // Manager không có team → toàn phòng (= tất cả dự án).
            const { data: rows, error: e } = await supabase
              .from('projects')
              .select(PROJECT_COLS)
              .order('created_at', { ascending: false })
            if (cancelled) return
            if (e) throw e
            scopedProjects = rows ?? []
          } else if (userId) {
            // Leader không có team → fallback an toàn: chỉ dự án mình PM.
            const { data: rows, error: e } = await supabase
              .from('projects')
              .select(PROJECT_COLS)
              .eq('pm_id', userId)
              .order('created_at', { ascending: false })
            if (cancelled) return
            if (e) throw e
            scopedProjects = rows ?? []
          }
        }

        const ids = scopedProjects.map((p) => p.id)
        if (!ids.length) {
          if (!cancelled) {
            setData(EMPTY_DATA)
            setLoading(false)
          }
          return
        }

        // ---- 2) Mọi bảng con lọc qua danh sách project_id trong scope ----
        const [
          { data: alerts, error: ea },
          { data: maintenances, error: em },
          { data: devices, error: ed },
        ] = await Promise.all([
          supabase
            .from('alerts')
            .select(ALERT_COLS)
            .in('project_id', ids)
            .order('created_at', { ascending: false }),
          supabase
            .from('maintenances')
            .select(MAINT_COLS)
            .in('project_id', ids)
            .order('due_date', { ascending: true }),
          supabase.from('devices').select('id, status').in('project_id', ids),
        ])
        if (cancelled) return
        if (ea) throw ea
        if (em) throw em
        if (ed) throw ed

        const allAlerts = alerts ?? []
        const allMaintenances = maintenances ?? []
        const allDevices = devices ?? []

        // Customers: không có cột team → director thấy tất cả, các role khác
        // chỉ thấy khách hàng có dự án nằm trong scope.
        let customerCount = 0
        if (role === 'director') {
          const { data: customers, error: e } = await supabase.from('customers').select('id')
          if (cancelled) return
          if (e) throw e
          customerCount = customers?.length ?? 0
        } else {
          const customerIds = Array.from(new Set(scopedProjects.map((p) => p.customer_id)))
          if (customerIds.length) {
            const { data: customers, error: e } = await supabase
              .from('customers')
              .select('id')
              .in('id', customerIds)
            if (cancelled) return
            if (e) throw e
            customerCount = customers?.length ?? 0
          }
        }
        if (cancelled) return

        // ---- 3) Thống kê tính từ dữ liệu thật (không hardcode) ----
        const openAlerts = allAlerts.filter((a) => OPEN_ALERT_STATUSES.includes(a.status))
        const runningProjects = scopedProjects.filter((p) => p.status === 'in_progress')
        const overdue = scopedProjects.filter(
          (p) => !!p.end_date && p.end_date < today && p.status !== 'deployed' && p.status !== 'ended'
        )
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const newProjectsWeek = scopedProjects.filter((p) => p.created_at >= weekAgo)
        const doneMaintenances = allMaintenances.filter((m) =>
          DONE_MAINTENANCE_STATUSES.includes((m.status ?? '').toLowerCase())
        )

        const stats: Stats = {
          customers: customerCount,
          runningProjects: runningProjects.length,
          activeDevices: allDevices.filter((d) => d.status === 'active').length,
          openCriticalMajor: openAlerts.filter(
            (a) => a.severity === 'critical' || a.severity === 'major'
          ).length,
          overduePct: scopedProjects.length
            ? Math.round((overdue.length / scopedProjects.length) * 100)
            : 0,
          overdueCount: overdue.length,
          newProjectsWeek: newProjectsWeek.length,
          maintenanceCompletionPct: allMaintenances.length
            ? Math.round((doneMaintenances.length / allMaintenances.length) * 100)
            : 0,
          // Không có cột SLA trong schema → dùng alert mở có priority cao làm xấp xỉ.
          slaRisk: openAlerts.filter((a) => a.priority === 'high' || a.priority === 'critical').length,
        }

        setData({ projects: scopedProjects, alerts: allAlerts, maintenances: allMaintenances, stats })
        setLoading(false)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu dashboard')
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [profileLoading, profile?.id, profile?.team, role, refreshKey])

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>()
    data.projects.forEach((p) => map.set(p.id, p.name))
    return map
  }, [data.projects])

  const openAlerts = useMemo(
    () => data.alerts.filter((a) => OPEN_ALERT_STATUSES.includes(a.status)),
    [data.alerts]
  )
  const visibleAlerts = useMemo(() => {
    const filtered =
      severityFilter === 'all' ? openAlerts : openAlerts.filter((a) => a.severity === severityFilter)
    return filtered.slice(0, 5)
  }, [openAlerts, severityFilter])

  const today = todayVN()
  const maintenanceToday = useMemo(
    () => data.maintenances.filter((m) => m.due_date === today).slice(0, 5),
    [data.maintenances, today]
  )
  const recentProjects = useMemo(() => data.projects.slice(0, 5), [data.projects])

  const cards = [
    {
      label: 'Khách hàng',
      value: data.stats.customers,
      icon: Users,
      color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      subtitle: 'Trong phạm vi của bạn',
    },
    {
      label: 'Dự án',
      value: data.stats.runningProjects,
      icon: FolderKanban,
      color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      subtitle: 'Đang chạy',
    },
    {
      label: 'Thiết bị',
      value: data.stats.activeDevices,
      icon: Cpu,
      color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      subtitle: 'Đang hoạt động',
    },
    {
      label: 'Sự cố',
      value: data.stats.openCriticalMajor,
      icon: AlertTriangle,
      color: 'bg-red-500/10 text-red-500 border-red-500/20',
      subtitle: 'Critical & Major đang mở',
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Tổng quan theo phạm vi: {role === 'director' ? 'toàn công ty' : role === 'manager' ? 'toàn phòng' : role === 'leader' ? 'theo team' : 'việc của bạn'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" aria-hidden />
          <Select
            aria-label="Lọc sự cố theo mức độ"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
            className="h-9 w-36"
          >
            <option value="all">Tất cả</option>
            <option value="critical">Critical</option>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
          </Select>
          <Button
            variant="outline"
            size="icon"
            aria-label="Tải lại dữ liệu"
            title="Tải lại"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>Không thể tải dữ liệu: {error}</span>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw className="h-4 w-4" /> Thử lại
          </Button>
        </div>
      )}

      {!profileLoading && !profile && !error && (
        <div className="mb-6 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Bạn chưa đăng nhập. Dữ liệu hiển thị có thể bị RLS chặn.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg border ${card.color}`}>
                  <card.icon className="h-6 w-6" />
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {loading ? '—' : card.value}
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{card.label}</p>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Raised incidents */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle>Sự cố đang mở</CardTitle>
            <CardDescription>Critical / Major chưa xử lý · lọc theo mức độ</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingBlock />
            ) : visibleAlerts.length === 0 ? (
              <EmptyBlock message="Không có sự cố đang mở trong phạm vi của bạn" />
            ) : (
              <div className="space-y-3">
                {visibleAlerts.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{a.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {projectNameById.get(a.project_id) ?? 'Dự án'} · {formatDateTime(a.created_at)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium ${
                        a.severity === 'critical'
                          ? 'text-red-500'
                          : a.severity === 'major'
                            ? 'text-orange-500'
                            : 'text-yellow-500'
                      }`}
                    >
                      {a.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Link href="/alerts" className={`${buttonVariants({ variant: 'link' })} mt-3 w-full`}>
              Xem tất cả sự cố
            </Link>
          </CardContent>
        </Card>

        {/* Maintenance */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle>Bảo trì hôm nay</CardTitle>
            <CardDescription>Lịch bảo trì theo dự án · ngày GMT+7</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingBlock />
            ) : maintenanceToday.length === 0 ? (
              <EmptyBlock message="Không có lịch bảo trì hôm nay trong phạm vi của bạn" />
            ) : (
              <div className="space-y-3">
                {maintenanceToday.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <Camera className="h-4 w-4 shrink-0 text-blue-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {projectNameById.get(m.project_id) ?? 'Dự án'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(m.due_date)} · {m.type === 'emergency' ? 'Đột xuất' : 'Định kỳ'} · {m.status}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-blue-500">Hôm nay</span>
                  </div>
                ))}
              </div>
            )}
            <Link href="/maintenance" className={`${buttonVariants({ variant: 'link' })} mt-3 w-full`}>
              Xem tất cả bảo trì
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Dự án gần đây</CardTitle>
            <CardDescription>Danh sách dự án theo tiến độ (mới nhất trước)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingBlock />
            ) : recentProjects.length === 0 ? (
              <EmptyBlock message="Không có dự án trong phạm vi của bạn" />
            ) : (
              <div className="space-y-3">
                {recentProjects.map((p) => (
                  <div key={p.id}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="truncate text-sm text-foreground">{p.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(p.status)}`}>
                        {statusLabel(p.status)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/50">
                      <div
                        className={`h-2 rounded-full ${
                          p.status === 'deployed'
                            ? 'bg-emerald-500'
                            : p.status === 'planned'
                              ? 'bg-gray-400'
                              : 'bg-blue-500'
                        }`}
                        style={{ width: `${Number(p.progress) || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle>Thống kê nhanh</CardTitle>
            <CardDescription>Tính từ dữ liệu thực trong phạm vi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {loading ? '—' : `${data.stats.overduePct}%`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Dự án trễ hạn ({loading ? '—' : data.stats.overdueCount})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {loading ? '—' : `+${data.stats.newProjectsWeek}`}
                </p>
                <p className="text-xs text-muted-foreground">Dự án mới tuần này</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {loading ? '—' : `${data.stats.maintenanceCompletionPct}%`}
                </p>
                <p className="text-xs text-muted-foreground">Tỷ lệ hoàn thành bảo trì</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {loading ? '—' : data.stats.slaRisk}
                </p>
                <p className="text-xs text-muted-foreground">Cảnh báo ưu tiên cao đang mở</p>
              </div>
            </div>
            <Link href="/reports" className={`${buttonVariants({ variant: 'link' })} w-full`}>
              Xem tất cả báo cáo
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
