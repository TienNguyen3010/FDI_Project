'use client'

/**
 * Project OPS — Customers List (spec 01_CUSTOMERS_LIST_UI_SPEC.md v1.0).
 * Standalone page: KHÔNG dùng CrudPage. Mọi số liệu lấy từ
 * GET /api/v1/customers — không hardcode KPI/CSAT/delta.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Select,
  Skeleton,
  Textarea,
  buttonVariants,
  useToast,
} from '@/components/ui/ui'
import {
  AlertCircle,
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Inbox,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Smile,
  Ticket,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import CustomerDetailPanel from '@/components/customers/CustomerDetailPanel'
import { useProfile } from '@/lib/hooks/useProfile'
import type { Customer, Activity, CustomerProject } from '@/components/customers/types'
import { hasPermission } from '@/lib/rbac/policy'

/* -------------------------------------------------------------------------- */
/*  Types — khớp contract GET /api/v1/customers                                */
/* -------------------------------------------------------------------------- */

/* Customer / Activity: dùng type chung ở components/customers/types.ts */

interface Comparison {
  total_customers?: number | null
  with_projects?: number | null
  open_tickets?: number | null
  csat?: number | null
}

interface Summary {
  total_customers?: number | null
  with_projects?: number | null
  open_tickets?: number | null
  /** PSM: đếm theo vòng đời vận hành (migration 015). */
  by_lifecycle_stage?: Record<string, number> | null
  csat?: number | null
  comparison?: Comparison | null
}

interface Pagination {
  page?: number
  page_size?: number
  total?: number
}

interface CustomersResponse {
  data: {
    items: Customer[]
    pagination: Pagination
    summary: Summary
  }
  as_of?: string | null
  data_quality?: string | null
  comparison?: Comparison | null
}

type DataState = {
  items: Customer[]
  pagination: Pagination
  summary: Summary
  asOf: string | null
  dataQuality: string | null
  comparison: Comparison | null
}

const EMPTY_DATA: DataState = {
  items: [],
  pagination: {},
  summary: {},
  asOf: null,
  dataQuality: null,
  comparison: null,
}

const DEFAULT_PAGE_SIZE = 20
const SORT = '-created_at'

/** Vòng đời vận hành (PSM — migration 015). Đồng bộ với API LIFECYCLE_STAGES. */
const LIFECYCLE_META: Record<string, { label: string; variant: 'active' | 'inactive' | 'planned' | 'ended' }> = {
  prospect:     { label: 'Tiềm năng',       variant: 'inactive' },
  implementing: { label: 'Đang triển khai', variant: 'planned' },
  operating:    { label: 'Đang vận hành',   variant: 'active' },
  maintenance:  { label: 'Bảo trì',         variant: 'ended' },
  stopped:      { label: 'Ngừng',           variant: 'inactive' },
}
const LIFECYCLE_OPTIONS = Object.entries(LIFECYCLE_META).map(([value, m]) => ({ value, label: m.label }))

function industryName(industry: Customer['industry']): string {
  if (!industry) return ''
  if (typeof industry === 'string') return industry
  return typeof industry.name === 'string' ? industry.name : ''
}

function formatNumber(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '—'
}

function asOfLabel(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString('vi-VN')
}

/* -------------------------------------------------------------------------- */
/*  KPI                                                                        */
/* -------------------------------------------------------------------------- */

function Delta({ current, previous }: { current?: number | null; previous?: number | null }) {
  // comparison null → KHÔNG render delta giả.
  if (
    typeof current !== 'number' || !Number.isFinite(current) ||
    typeof previous !== 'number' || !Number.isFinite(previous)
  ) {
    return null
  }
  const diff = current - previous
  const tone = diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--danger)' : 'var(--muted)'
  return (
    <p className="mt-2 text-xs" style={{ color: tone }}>
      {diff === 0
        ? 'Không đổi so với kỳ trước'
        : `${diff > 0 ? '+' : '−'}${Math.abs(diff)} so với kỳ trước`}
    </p>
  )
}

/** Smart view (scope) — mirror LeadManagementShell §A/§B nhưng dùng DỮ LIỆU THẬT.
 *  `customers` KHÔNG có cột owner (đã verify trên DB), nên KHÔNG làm tab
 *  "của tôi / tất cả" (sẽ là số bịa). Thay bằng view theo project + ticket. */
const SMART_VIEWS = [
  { key: 'all', label: 'Tất cả khách hàng', hasProject: '', minOpenTickets: 0 },
  { key: 'with_projects', label: 'Có dự án', hasProject: 'true', minOpenTickets: 0 },
  { key: 'open_tickets', label: 'Đang có ticket mở', hasProject: '', minOpenTickets: 1 },
] as const

type SmartViewKey = (typeof SMART_VIEWS)[number]['key']

function KpiCard({ label, value, icon: Icon, tone, loading, delta, active, onClick }: {
  label: string
  value: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  /** Token CSS var — KHÔNG hardcode hex. */
  tone: string
  loading: boolean
  delta?: ReactNode
  /** KPI bấm được để chọn smart view (mirror LeadKpiCards). */
  active?: boolean
  onClick?: () => void
}) {
  const interactive = typeof onClick === 'function'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      aria-pressed={active}
      title={interactive ? `${label} — bấm để lọc` : label}
      className={`rounded-card border text-left transition-all ${
        interactive ? 'cursor-pointer hover:-translate-y-px' : 'cursor-default'
      } ${active ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/30' : 'border-[var(--border)]'} bg-[var(--surface)]`}
    >
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-9 w-20" />
          ) : (
            <p
              className={`mt-1 leading-none ${value.length > 10 ? 'text-lg font-semibold' : 'text-[34px] font-semibold'}`}
              style={{ color: tone }}
            >
              {value}
            </p>
          )}
          {delta}
        </div>
        <span className="shrink-0 rounded-lg bg-[var(--sidebar-group)] p-2" style={{ color: tone }}>
          <Icon size={20} />
        </span>
      </CardContent>
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/*  Hoạt động / Activities (migration 013 — bảng đa hình entity_type/entity_id) */
/* -------------------------------------------------------------------------- */

type ActivityStatus = 'planned' | 'done' | 'failed' | 'no_answer'

/** Lookup `activity_types` của migration 013 (seed): call/email/meeting/note/task/other. */
const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call: 'Gọi điện',
  email: 'Email',
  meeting: 'Gặp mặt',
  note: 'Ghi chú',
  task: 'Công việc',
  other: 'Khác',
}

/**
 * Lựa chọn UI giữ đúng nhãn tiếng Việt yêu cầu; `message` và `demo` KHÔNG có
 * trong lookup `activity_types` của 013 (chỉ call/email/meeting/note/task/other)
 * → khi ghi map về note/other, giữ lại lựa chọn gốc ở `metadata.ui_type`
 * (giống section Next Action của form Thêm KH).
 */
const ACTIVITY_TYPE_OPTIONS = [
  { value: 'call', label: 'Gọi điện', uiType: null },
  { value: 'email', label: 'Email', uiType: null },
  { value: 'message', label: 'Nhắn tin', uiType: 'message' },
  { value: 'meeting', label: 'Gặp mặt', uiType: null },
  { value: 'demo', label: 'Demo', uiType: 'demo' },
  { value: 'task', label: 'Công việc', uiType: null },
] as const

/** `activity_type` gửi cho DB: message → note, demo → other (đúng lookup 013). */
function dbActivityType(uiType: string): string {
  if (uiType === 'message') return 'note'
  if (uiType === 'demo') return 'other'
  return uiType
}

/** Nhãn hiển thị: ưu tiên lựa chọn gốc (metadata.ui_type) → lookup 013 → code thô. */
function activityTypeLabel(a: Activity): string {
  const uiType = a.metadata?.ui_type
  if (typeof uiType === 'string' && uiType) {
    const opt = ACTIVITY_TYPE_OPTIONS.find((o) => o.uiType === uiType)
    if (opt) return opt.label
  }
  const code = typeof a.activity_type === 'string' ? a.activity_type : ''
  return ACTIVITY_TYPE_LABELS[code] ?? code ?? 'Hoạt động'
}

/** Trạng thái ∈ {planned, done, failed, no_answer} — CHECK của bảng 013. */
const ACTIVITY_STATUS_META: Record<
  string,
  { label: string; variant: 'active' | 'inactive' | 'planned' | 'ended' | 'critical' }
> = {
  planned: { label: 'Đã lên kế hoạch', variant: 'planned' },
  done: { label: 'Đã hoàn thành', variant: 'active' },
  failed: { label: 'Thất bại', variant: 'critical' },
  no_answer: { label: 'Không bắt máy', variant: 'ended' },
}

function activityStatusMeta(status: string | null | undefined) {
  const key = typeof status === 'string' ? status : ''
  return ACTIVITY_STATUS_META[key] ?? { label: key || '—', variant: 'inactive' as const }
}

/** Mốc thời gian hiển thị: occurred_at → scheduled_at → done_at → created_at. */
function activityTimestamp(a: Activity): string | null {
  return asOfLabel(a.occurred_at ?? a.scheduled_at ?? a.done_at ?? a.created_at ?? null)
}

/** Thời gian tương đối (chênh), vd "3 ngày trước". null khi không parse được. */
function relativeTimeLabel(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const diffMs = Date.now() - date.getTime()
  const abs = Math.abs(diffMs)
  const minutes = Math.round(abs / 60000)
  const hours = Math.round(abs / 3600000)
  const days = Math.round(abs / 86400000)
  const months = Math.round(abs / (86400000 * 30))
  const years = Math.round(abs / (86400000 * 365))
  const span =
    minutes < 1 ? 'vừa xong'
      : minutes < 60 ? `${minutes} phút`
        : hours < 24 ? `${hours} giờ`
          : days < 30 ? `${days} ngày`
            : months < 12 ? `${months} tháng`
              : `${years} năm`
  return diffMs >= 0 ? `${span} trước` : `sau ${span}`
}

/** Bóc thông điệp lỗi API thành chữ đọc được; KHÔNG bịa thành công. */
function describeActivityError(payload: unknown, status: number): string {
  if (payload && typeof payload === 'object') {
    const err = (payload as { error?: { message?: string } }).error
    if (typeof err?.message === 'string' && err.message.trim()) return err.message
  }
  if (status === 401) return 'Phiên đăng nhập đã hết hạn — vui lòng đăng nhập lại.'
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  if (status === 404) return 'Không tìm thấy khách hàng trong phạm vi của bạn.'
  return `Lỗi máy chủ (${status}).`
}

/** API trả `data` là mảng hoặc `{ items }` — chuẩn hoá về mảng. */
function normalizeActivities(payload: unknown): Activity[] {
  if (Array.isArray(payload)) return payload as Activity[]
  if (payload && typeof payload === 'object') {
    const items = (payload as { items?: unknown }).items
    if (Array.isArray(items)) return items as Activity[]
  }
  return []
}

/** Sắp xếp dòng thời gian: mốc thời gian mới nhất lên đầu. */
function sortActivities(list: Activity[]): Activity[] {
  const ts = (a: Activity): number => {
    const n = Date.parse(a.occurred_at ?? a.scheduled_at ?? a.done_at ?? a.created_at ?? '')
    return Number.isFinite(n) ? n : 0
  }
  return [...list].sort((a, b) => ts(b) - ts(a))
}

function ActivityIcon({ activity }: { activity: Activity }) {
  const uiType = activity.metadata?.ui_type
  const type = uiType ?? activity.activity_type ?? ''
  const iconProps = { size: 14, className: 'shrink-0' }
  switch (type) {
    case 'call':
      return <Phone {...iconProps} />
    case 'message':
      return <Inbox {...iconProps} />
    case 'meeting':
      return <Users {...iconProps} />
    case 'task':
      return <CalendarClock {...iconProps} />
    default:
      return <FolderKanban {...iconProps} />
  }
}

function ActivityTimelineItem({ activity }: { activity: Activity }) {
  const time = activityTimestamp(activity)
  const relative = relativeTimeLabel(
    activity.occurred_at ?? activity.scheduled_at ?? activity.done_at ?? activity.created_at ?? null,
  )
  const statusMeta = activityStatusMeta(activity.status)
  const subject = activity.subject?.trim()
  const body = activity.body?.trim()
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--sidebar-group)] text-[var(--muted)]">
        <ActivityIcon activity={activity} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--text)]">{activityTypeLabel(activity)}</span>
          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          {time && (
            <span className="text-xs text-[var(--muted)]">
              {time}{relative ? ` · ${relative}` : ''}
            </span>
          )}
        </div>
        {subject && <p className="mt-0.5 break-words text-sm text-[var(--text)]">{subject}</p>}
        {body && <p className="mt-0.5 break-words text-xs text-[var(--muted)]">{body}</p>}
      </div>
    </li>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Right detail drawer — bấm vào khách hàng để xem thông tin                  */
/* -------------------------------------------------------------------------- */

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-[var(--border)] py-2.5 last:border-b-0">
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="break-words text-sm text-[var(--text)]">{value || '—'}</dd>
    </div>
  )
}

function ActivityForm({ customerId, onDone, onCancel }: {
  customerId: string
  onDone: () => void
  onCancel: () => void
}) {
  const toast = useToast()
  const [type, setType] = useState('')
  const [at, setAt] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<'planned' | 'done'>('planned')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    if (!type.trim()) {
      setError('Vui lòng chọn loại hoạt động.')
      return
    }
    setSaving(true)
    setError(null)
    const payload = {
      activity_type: dbActivityType(type.trim()),
      status,
      subject: body.trim() || null,
      scheduled_at: at ? new Date(at).toISOString() : null,
      metadata: JSON.stringify({
        ui_type: ACTIVITY_TYPE_OPTIONS.find((o) => o.value === type)?.uiType ?? null,
      }),
    }
    try {
      const res = await fetch(`/api/v1/customers/${customerId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as unknown
        setError(describeActivityError(json, res.status))
        setSaving(false)
        return
      }
      toast.success({ title: 'Đã thêm hoạt động', description: 'Lịch sử hoạt động đã được cập nhật.' })
      setSaving(false)
      onDone()
    } catch {
      setError('Không gọi được máy chủ — vui lòng thử lại.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="f-activity-type" className="mb-1 block text-[12px] font-semibold text-foreground">
            Loại hoạt động <span className="text-destructive">*</span>
          </label>
          <Select
            id="f-activity-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-invalid={Boolean(error && !type)}
            className={error && !type ? 'border-destructive' : undefined}
          >
            <option value="">Chọn loại</option>
            {ACTIVITY_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="f-activity-at" className="mb-1 block text-[12px] font-semibold text-foreground">
            Ngày &amp; giờ
          </label>
          <Input
            id="f-activity-at"
            type="datetime-local"
            value={at}
            onChange={(e) => setAt(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label htmlFor="f-activity-body" className="mb-1 block text-[12px] font-semibold text-foreground">
          Nội dung
        </label>
        <Textarea
          id="f-activity-body"
          rows={3}
          maxLength={500}
          placeholder="Nhập nội dung hoạt động (ví dụ: Gọi xác nhận nhu cầu SIP Trunk)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="f-activity-status" className="mb-1 block text-[12px] font-semibold text-foreground">
          Trạng thái
        </label>
        <Select
          id="f-activity-status"
          value={status}
          onChange={(e) => setStatus(e.target.value === 'done' ? 'done' : 'planned')}
        >
          <option value="planned">Đã lên kế hoạch</option>
          <option value="done">Đã hoàn thành</option>
        </Select>
      </div>
      {error && (
        <p role="alert" className="rounded-md border border-[var(--danger)] bg-[var(--surface)] p-2 text-xs text-[var(--danger)]">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving} className="min-w-[80px]">
          Hủy
        </Button>
        <Button type="submit" disabled={saving} className="min-w-[130px]">
          {saving ? 'Đang lưu...' : 'Thêm hoạt động'}
        </Button>
      </div>
    </form>
  )
}

// (CustomerDetailDrawer đã thay bằng component CustomerDetailPanel — mirror LeadDetailPanel)

export default function CustomersPage() {
  const { role } = useProfile()
  const toast = useToast()
  const canCreate = hasPermission(role, 'customer.create')
  const canEdit = hasPermission(role, 'customer.update')
  /** POST hoạt động cần quyền ĐỌC khách hàng (RLS đọc theo fdi_can_read). */
  const canAddActivity = hasPermission(role, 'customer.read')

  const [selected, setSelected] = useState<Customer | null>(null)

  /* --- Lịch sử hoạt động của khách hàng đang mở panel (right sidebar) ---------
     Dữ liệu thật: GET /api/v1/customers/[id]/activities. */
  const [activities, setActivities] = useState<Activity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [activitiesError, setActivitiesError] = useState<string | null>(null)
  const [showActivityForm, setShowActivityForm] = useState(false)
  /** Dự án gắn với KH đang mở panel (PSM). */
  const [projects, setProjects] = useState<CustomerProject[]>([])

  const reloadActivities = useCallback(async () => {
    if (!selected) return
    setActivitiesLoading(true)
    setActivitiesError(null)
    try {
      const [actRes, prjRes] = await Promise.all([
        fetch(`/api/v1/customers/${encodeURIComponent(selected.id)}/activities`, { cache: 'no-store' }),
        fetch(`/api/v1/customers/${encodeURIComponent(selected.id)}/projects`, { cache: 'no-store' }),
      ])
      if (!actRes.ok) throw new Error(`Lỗi máy chủ (${actRes.status}).`)
      const actJson = (await actRes.json()) as { data?: Activity[]; error?: { message?: string } }
      setActivities(Array.isArray(actJson.data) ? actJson.data : [])
      // Dự án lỗi thì bỏ qua (không chặn luồng hoạt động).
      if (prjRes.ok) {
        const prjJson = (await prjRes.json()) as { data?: CustomerProject[] }
        setProjects(Array.isArray(prjJson.data) ? prjJson.data : [])
      } else {
        setProjects([])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không tải được lịch sử hoạt động.'
      setActivitiesError(message)
      toast.error({ title: 'Tải lịch sử hoạt động thất bại', description: message })
    } finally {
      setActivitiesLoading(false)
    }
  }, [selected, toast])

  // Tải lại khi đổi khách hàng đang chọn.
  useEffect(() => {
    if (!selected) { setActivities([]); setActivitiesError(null); setProjects([]); return }
    void reloadActivities()
  }, [selected, reloadActivities])

  const [hydrated, setHydrated] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [industry, setIndustry] = useState('')
  const [lifecycleStage, setLifecycleStage] = useState('')
  const [hasProject, setHasProject] = useState('')
  /** Smart view (scope) — mirror Lead §B. Đọc từ ?view= để back/refresh giữ lại. */
  const [smartView, setSmartView] = useState<SmartViewKey>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [refreshTick, setRefreshTick] = useState(0)
  const [industryOptions, setIndustryOptions] = useState<string[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DataState>(EMPTY_DATA)
  const searchEdited = useRef(false)

  /* --- Khôi phục state từ URL (page, page_size, filters, sort) ------------- */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const readInt = (key: string, fallback: number) => {
      const n = Number(p.get(key))
      return Number.isInteger(n) && n > 0 ? n : fallback
    }
    const s = p.get('search') ?? ''
    setSearch(s)
    setDebouncedSearch(s.trim())
    setIndustry(p.get('industry') ?? '')
    setLifecycleStage(p.get('lifecycle_stage') ?? '')
    setHasProject(p.get('has_project') ?? '')
    const v = p.get('view') ?? ''
    setSmartView((SMART_VIEWS.some((x) => x.key === v) ? v : 'all') as SmartViewKey)
    setPage(readInt('page', 1))
    setPageSize(readInt('page_size', DEFAULT_PAGE_SIZE))
    setHydrated(true)
  }, [])

  /* --- Debounce search 300ms ---------------------------------------------- */
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = search.trim()
      if (next !== debouncedSearch) {
        setDebouncedSearch(next)
        if (searchEdited.current) setPage(1)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [search, debouncedSearch])

  /* --- Ghi state lên URL -------------------------------------------------- */
  useEffect(() => {
    if (!hydrated) return
    const p = new URLSearchParams()
    if (debouncedSearch) p.set('search', debouncedSearch)
    if (industry) p.set('industry', industry)
    if (lifecycleStage) p.set('lifecycle_stage', lifecycleStage)
    if (hasProject) p.set('has_project', hasProject)
    if (smartView !== 'all') p.set('view', smartView)
    if (page !== 1) p.set('page', String(page))
    if (pageSize !== DEFAULT_PAGE_SIZE) p.set('page_size', String(pageSize))
    const qs = p.toString()
    window.history.replaceState(
      null,
      '',
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    )
  }, [hydrated, debouncedSearch, industry, lifecycleStage, hasProject, smartView, page, pageSize])

  /* --- Fetch -------------------------------------------------------------- */
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      sort: SORT,
    })
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (industry) params.set('industry', industry)
    if (lifecycleStage) params.set('lifecycle_stage', lifecycleStage)

    // Smart view (mirror Lead §B): chỉ đẩy filter khi KHÔNG phải view mặc định.
    // `all` = không thêm gì; `with_projects` = has_project=true;
    // `open_tickets` = server không lọc được ticket → giữ nguyên, client lọc tiếp.
    if (smartView === 'with_projects') {
      params.set('has_project', 'true')
    } else if (hasProject) {
      params.set('has_project', hasProject)
    }
    const onlyOpenTickets = smartView === 'open_tickets'

    try {
      const res = await fetch(`/api/v1/customers?${params.toString()}`, {
        cache: 'no-store',
        signal,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
      }
      const json = (await res.json()) as CustomersResponse
      if (signal?.aborted) return

      const rawItems = Array.isArray(json?.data?.items) ? json.data.items : []
      // View "Đang có ticket mở": API không lọc theo ticket → lọc client-side
      // trên đúng dữ liệu `open_ticket_count` (không bịa).
      const items = onlyOpenTickets
        ? rawItems.filter((item) => (item.open_ticket_count ?? 0) > 0)
        : rawItems
      setData({
        items,
        pagination: json?.data?.pagination ?? {},
        summary: json?.data?.summary ?? {},
        asOf: json?.as_of ?? null,
        dataQuality: json?.data_quality ?? null,
        comparison: json?.data?.summary?.comparison ?? json?.comparison ?? null,
      })

      // Options ngành được suy từ dữ liệu thật (không bịa danh sách ngành).
      const seen = items.map((item) => industryName(item.industry)).filter((v) => v.length > 0)
      if (seen.length) {
        setIndustryOptions((prev) => Array.from(new Set([...prev, ...seen])).sort((a, b) => a.localeCompare(b, 'vi')))
      }
    } catch (err) {
      if (signal?.aborted) return
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách khách hàng'
      setError(message)
      setData(EMPTY_DATA)
      toast.error({ title: 'Tải danh sách khách hàng thất bại', description: message })
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [debouncedSearch, industry, lifecycleStage, hasProject, smartView, page, pageSize, refreshTick, toast])

  useEffect(() => {
    if (!hydrated) return
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [hydrated, load])

  const handleRefresh = () => {
    toast.info({ title: 'Đang làm mới dữ liệu…', duration: 2000 })
    setRefreshTick((tick) => tick + 1)
  }

  const clearFilters = () => {
    searchEdited.current = false
    setSearch('')
    setDebouncedSearch('')
    setIndustry('')
    setLifecycleStage('')
    setHasProject('')
    setPage(1)
  }

  const hasFilters = Boolean(debouncedSearch || industry || lifecycleStage || hasProject)

  /* --- Điều hướng sang form sửa (id trong URL; form tự fetch qua API) --------- */
  const router = useRouter()
  const editCustomer = useCallback((id: string) => {
    setSelected(null)
    router.push(`/customers/${encodeURIComponent(id)}`)
  }, [router])

  /* --- Derived ------------------------------------------------------------ */
  const { items, pagination, summary, asOf, dataQuality, comparison } = data
  const total = typeof pagination.total === 'number' && Number.isFinite(pagination.total)
    ? pagination.total
    : items.length
  const currentPage = typeof pagination.page === 'number' && pagination.page > 0 ? pagination.page : page
  const effectivePageSize = typeof pagination.page_size === 'number' && pagination.page_size > 0
    ? pagination.page_size
    : pageSize
  const totalPages = Math.max(1, Math.ceil(total / effectivePageSize))
  const start = total === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1
  const end = Math.min(currentPage * effectivePageSize, total)

  const csatValue = typeof summary.csat === 'number' && Number.isFinite(summary.csat)
    ? `${summary.csat}%`
    : 'Chưa có dữ liệu'

  const asOfText = useMemo(() => asOfLabel(asOf), [asOf])

  /* --- Render ------------------------------------------------------------- */
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold text-[var(--text)]">Khách hàng</h1>
          <p className="text-sm text-[var(--muted)]">
            Quản lý hồ sơ khách hàng, thông tin liên hệ, dự án và hỗ trợ dịch vụ.
          </p>
        </div>
      </header>

      {/* KPI row — 4 thẻ, BẤM ĐƯỢC để chọn smart view (mirror LeadKpiCards) */}
      <section aria-label="Chỉ số khách hàng" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Tổng khách hàng"
          value={formatNumber(summary.total_customers)}
          icon={Users}
          tone="var(--primary)"
          loading={loading && summary.total_customers == null}
          delta={<Delta current={summary.total_customers ?? null} previous={comparison?.total_customers} />}
          active={smartView === 'all'}
          onClick={() => { setSmartView('all'); setPage(1) }}
        />
        <KpiCard
          label="Khách hàng có dự án"
          value={formatNumber(summary.with_projects)}
          icon={FolderKanban}
          tone="var(--kpi-projects)"
          loading={loading && summary.with_projects == null}
          delta={<Delta current={summary.with_projects ?? null} previous={comparison?.with_projects} />}
          active={smartView === 'with_projects'}
          onClick={() => { setSmartView((v) => (v === 'with_projects' ? 'all' : 'with_projects')); setPage(1) }}
        />
        <KpiCard
          label="Ticket mở (toàn hệ thống)"
          value={formatNumber(summary.open_tickets)}
          icon={Ticket}
          tone="var(--kpi-tickets)"
          loading={loading && summary.open_tickets == null}
          delta={<Delta current={summary.open_tickets ?? null} previous={comparison?.open_tickets} />}
          active={smartView === 'open_tickets'}
          onClick={() => { setSmartView((v) => (v === 'open_tickets' ? 'all' : 'open_tickets')); setPage(1) }}
        />
        {/* CSAT: schema không có bảng survey/CSAT → không cho bấm (không lọc được). */}
        <KpiCard
          label="Mức độ hài lòng (CSAT)"
          value={csatValue}
          icon={Smile}
          tone="var(--info)"
          loading={loading && summary.csat == null}
          delta={<Delta current={summary.csat ?? null} previous={comparison?.csat} />}
        />
      </section>

      {/* Smart-view tabs — underline tabs ĐẶT DƯỚI KPI, đúng chuẩn Lead §B.
          Tên tab lấy từ SMART_VIEWS (single source) nên không lệch nhãn. */}
      <div className="flex flex-wrap items-end gap-4 border-b border-[var(--border)]" role="tablist" aria-label="Phạm vi khách hàng">
        {SMART_VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={smartView === v.key}
            onClick={() => { setSmartView(v.key); setPage(1) }}
            className={`relative -mb-px border-b-2 px-1 pb-2 text-sm font-semibold transition-colors ${
              smartView === v.key
                ? 'border-[var(--sidebar-active-border)] text-[var(--sidebar-heading)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Toolbar: 3 select + search + refresh + CTA */}
      <section className="flex flex-wrap items-center gap-3" aria-label="Bộ lọc khách hàng">
        <Select
          aria-label="Lọc theo ngành"
          value={industry}
          onChange={(e) => { setIndustry(e.target.value); setPage(1) }}
          className="min-w-[170px]"
        >
          <option value="">Tất cả ngành</option>
          {industryOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </Select>

        <Select
          aria-label="Lọc theo vòng đời vận hành"
          value={lifecycleStage}
          onChange={(e) => { setLifecycleStage(e.target.value); setPage(1) }}
          className="min-w-[180px]"
        >
          <option value="">Tất cả vòng đời</option>
          {LIFECYCLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>

        <Select
          aria-label="Lọc theo dự án"
          value={hasProject}
          onChange={(e) => { setHasProject(e.target.value); setPage(1) }}
          className="min-w-[190px]"
        >
          <option value="">Có/không có dự án</option>
          <option value="true">Có dự án</option>
          <option value="false">Không có dự án</option>
        </Select>

        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-hidden />
          <Input
            aria-label="Tìm kiếm khách hàng"
            placeholder="Tìm kiếm khách hàng..."
            value={search}
            onChange={(e) => { searchEdited.current = true; setSearch(e.target.value) }}
            className="pl-9"
          />
        </div>

        <Button type="button" variant="outline" onClick={handleRefresh} aria-label="Làm mới dữ liệu">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span className="sr-only sm:not-sr-only">Làm mới</span>
        </Button>

        {canCreate && (
          <Link
            href="/customers/new"
            className={buttonVariants({ variant: 'default' })}
          >
            <Plus size={16} />
            Thêm khách hàng
          </Link>
        )}
      </section>

      {(asOfText || dataQuality) && (
        <p className="text-xs text-[var(--muted)]">
          {asOfText && <>Cập nhật: <time dateTime={asOf ?? undefined}>{asOfText}</time></>}
          {asOfText && dataQuality && <span aria-hidden> · </span>}
          {dataQuality && <>Chất lượng dữ liệu: <Badge variant="default">{dataQuality}</Badge></>}
        </p>
      )}

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--danger)] bg-[var(--surface)] p-4 text-sm text-[var(--danger)]">
          <span className="inline-flex items-center gap-2"><AlertCircle size={16} /> {error}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw size={14} /> Thử lại
          </Button>
        </div>
      )}

      {/* Table — tiêu đề theo smart view, đúng chuẩn Lead §B */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--text)]">
          {SMART_VIEWS.find((v) => v.key === smartView)?.label ?? 'Khách hàng'}
        </h2>
        <span className="text-xs text-[var(--muted)]">
          Hiển thị {start}–{end} / {total} khách hàng
        </span>
      </div>

      {/* Table */}
      <Card className="overflow-hidden border-[var(--border)] bg-[var(--surface)]">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm text-[var(--text)]">
              <thead className="bg-[var(--sidebar-group)] text-xs text-[var(--muted)]">
                <tr>
                  {['#', 'Tên khách hàng', 'Người liên hệ', 'Email', 'Điện thoại', 'Dự án', 'Vòng đời', 'Ngày tạo', 'Thao tác'].map((head) => (
                    <th key={head} scope="col" className="h-11 whitespace-nowrap px-4 text-left font-medium">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-[var(--surface)]">
                {loading && !items.length && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-b border-[var(--border)]">
                    {Array.from({ length: 9 }).map((__, c) => (
                      <td key={c} className="h-14 px-4"><Skeleton className="h-4 w-full max-w-[120px]" /></td>
                    ))}
                  </tr>
                ))}

                {!loading && !error && items.map((item, index) => {
                  const name = item.name || '—'
                  const code = item.code || '—'
                  const contactName = item.primary_contact_name || '—'
                  // PSM: vòng đời vận hành thật (migration 015), không còn status='active' giả.
                  const lifecycleKey = item.lifecycle_stage || 'prospect'
                  const lifecycleMeta = LIFECYCLE_META[lifecycleKey] ?? {
                    label: lifecycleKey || '—',
                    variant: 'inactive' as const,
                  }
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelected(item)}
                      className="cursor-pointer border-b border-[var(--border)] transition-colors hover:bg-[var(--sidebar-group)]"
                    >
                      <td className="h-14 whitespace-nowrap px-4 text-[var(--muted)]">
                        {(currentPage - 1) * effectivePageSize + index + 1}
                      </td>
                      <td className="h-14 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 size={18} className="shrink-0 text-[var(--muted)]" aria-hidden />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{name}</p>
                            {/* Mã do DB sinh (migration 010). null/'' → '—', KHÔNG suy từ tax_id. */}
                            <p className="text-xs text-[var(--muted)]">
                              {code === '—' ? 'Mã: —' : <span className="font-mono">{code}</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* P1-8: tách Liên hệ / Email / Điện thoại thành 3 cột để copy & sort được */}
                      <td className="h-14 px-4">
                        <span className="whitespace-nowrap">{contactName}</span>
                      </td>
                      <td className="h-14 px-4">
                        <span className="block max-w-[190px] truncate text-[var(--muted)]" title={item.email ?? undefined}>
                          {item.email || '—'}
                        </span>
                      </td>
                      <td className="h-14 px-4">
                        <span className="whitespace-nowrap text-[var(--muted)]">{item.phone || '—'}</span>
                      </td>
                      <td className="h-14 px-4 tabular-nums">{formatNumber(item.project_count)}</td>
                      <td className="h-14 px-4"><Badge variant={lifecycleMeta.variant}>{lifecycleMeta.label}</Badge></td>
                      <td className="h-14 whitespace-nowrap px-4 text-[var(--muted)]">
                        {item.created_at ? asOfLabel(item.created_at) ?? '—' : '—'}
                      </td>
                      <td className="h-14 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <button
                              type="button"
                              title="Sửa khách hàng"
                              aria-label={`Sửa ${name}`}
                              onClick={() => editCustomer(item.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--sidebar-group)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          {/* Archive cần soft-delete (`deleted_at`) + policy DELETE — chưa có,
                              nên giữ disabled thay vì giả affordance. */}
                          <button
                            type="button"
                            title="Lưu trữ (cần bổ sung soft delete)"
                            aria-label="Lưu trữ (sẽ hỗ trợ ở bản sau)"
                            aria-disabled="true"
                            className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-md text-[var(--muted)] opacity-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!loading && !error && items.length === 0 && (
            <EmptyState
              icon={<Inbox size={32} strokeWidth={1.5} />}
              title={hasFilters ? 'Không có kết quả phù hợp' : 'Chưa có khách hàng nào'}
              description={hasFilters
                ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
                : 'Danh sách khách hàng trong phạm vi của bạn đang trống.'}
              action={hasFilters
                ? <Button type="button" variant="outline" size="sm" onClick={clearFilters}>Xóa bộ lọc</Button>
                : canCreate
                  ? (
                    <Link href="/customers/new" className={buttonVariants({ variant: 'default', size: 'sm' })}>
                      <Plus size={14} /> Thêm khách hàng
                    </Link>
                  )
                  : undefined}
            />
          )}
        </CardContent>

        {/* Footer + pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-3 text-sm text-[var(--muted)]">
          <span>
            Hiển thị <strong className="font-medium text-[var(--text)]">{start}–{end}</strong> trên{' '}
            <strong className="font-medium text-[var(--text)]">{total}</strong>
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2">
              <span className="text-xs">Số dòng / trang</span>
              <Select
                aria-label="Số dòng mỗi trang"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                className="h-9 w-[76px]"
              >
                {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </label>
            <span className="text-xs">Trang {currentPage} / {totalPages}</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Trang trước"
              >
                <ChevronLeft size={16} /> <span className="hidden sm:inline">Trước</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Trang sau"
              >
                <span className="hidden sm:inline">Sau</span> <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Right sidebar — mirror LeadDetailPanel (SoftNET CRM): avatar + Mã + status,
          nút Gọi/Email/Thêm hoạt động/Sửa, "Thông tin chính", "Hoạt động gần đây",
          dòng audit. Component tách riêng để page gọn. */}
      {selected && (
        <CustomerDetailPanel
          customer={selected}
          activities={activities}
          activitiesLoading={activitiesLoading}
          activitiesError={activitiesError}
          canAddActivity={canAddActivity}
          onReloadActivities={() => void reloadActivities()}
          onAddActivity={() => setShowActivityForm(true)}
          onClose={() => setSelected(null)}
          onEdit={() => editCustomer(selected.id)}
          canEdit={canEdit}
          projects={projects}
        />
      )}
    </div>
  )
}
