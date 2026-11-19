'use client'

/**
 * Project OPS — Customers List (spec 01_CUSTOMERS_LIST_UI_SPEC.md v1.0).
 * Standalone page: KHÔNG dùng CrudPage. Mọi số liệu lấy từ
 * GET /api/v1/customers — không hardcode KPI/CSAT/delta.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Select,
  Skeleton,
  buttonVariants,
  useToast,
} from '@/components/ui/ui'
import {
  AlertCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Inbox,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Smile,
  Ticket,
  Trash2,
  Users,
} from 'lucide-react'
import { useProfile } from '@/lib/hooks/useProfile'
import { hasPermission } from '@/lib/rbac/policy'

/* -------------------------------------------------------------------------- */
/*  Types — khớp contract GET /api/v1/customers                                */
/* -------------------------------------------------------------------------- */

type CustomerStatus = 'active' | 'inactive' | 'archived' | (string & {})

interface Customer {
  id: string
  code?: string | null
  name: string
  phone?: string | null
  email?: string | null
  industry?: string | { name?: string | null } | null
  tax_id?: string | null
  primary_contact_name?: string | null
  project_count?: number | null
  open_ticket_count?: number | null
  status?: CustomerStatus | null
  created_at?: string | null
}

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

const STATUS_META: Record<string, { label: string; variant: 'active' | 'inactive' | 'default' }> = {
  active: { label: 'Đang hoạt động', variant: 'active' },
  inactive: { label: 'Không hoạt động', variant: 'inactive' },
  archived: { label: 'Đã lưu trữ', variant: 'default' },
}

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

function KpiCard({ label, value, icon: Icon, tone, loading, delta }: {
  label: string
  value: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  /** Token CSS var — KHÔNG hardcode hex. */
  tone: string
  loading: boolean
  delta?: ReactNode
}) {
  return (
    <Card className="border-[var(--border)] bg-[var(--surface)]">
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
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function CustomersPage() {
  const { role } = useProfile()
  const toast = useToast()
  const canCreate = hasPermission(role, 'customer.create')

  const [hydrated, setHydrated] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [industry, setIndustry] = useState('')
  const [status, setStatus] = useState('')
  const [hasProject, setHasProject] = useState('')
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
    setStatus(p.get('status') ?? '')
    setHasProject(p.get('has_project') ?? '')
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
    if (status) p.set('status', status)
    if (hasProject) p.set('has_project', hasProject)
    if (page !== 1) p.set('page', String(page))
    if (pageSize !== DEFAULT_PAGE_SIZE) p.set('page_size', String(pageSize))
    const qs = p.toString()
    window.history.replaceState(
      null,
      '',
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    )
  }, [hydrated, debouncedSearch, industry, status, hasProject, page, pageSize])

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
    if (status) params.set('status', status)
    if (hasProject) params.set('has_project', hasProject)

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

      const items = Array.isArray(json?.data?.items) ? json.data.items : []
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
  }, [debouncedSearch, industry, status, hasProject, page, pageSize, refreshTick, toast])

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
    setStatus('')
    setHasProject('')
    setPage(1)
  }

  const hasFilters = Boolean(debouncedSearch || industry || status || hasProject)

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
          <h1 className="text-[30px] font-semibold text-[var(--text)]">Khách hàng</h1>
          <p className="text-sm text-[var(--muted)]">
            Quản lý hồ sơ khách hàng, thông tin liên hệ, dự án và hỗ trợ dịch vụ.
          </p>
        </div>
      </header>

      {/* KPI row — 4 thẻ theo thứ tự green / blue / orange / info */}
      <section aria-label="Chỉ số khách hàng" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Tổng khách hàng"
          value={formatNumber(summary.total_customers)}
          icon={Users}
          tone="var(--primary)"
          loading={loading && summary.total_customers == null}
          delta={<Delta current={summary.total_customers ?? null} previous={comparison?.total_customers} />}
        />
        <KpiCard
          label="Khách hàng có dự án"
          value={formatNumber(summary.with_projects)}
          icon={FolderKanban}
          tone="var(--kpi-projects)"
          loading={loading && summary.with_projects == null}
          delta={<Delta current={summary.with_projects ?? null} previous={comparison?.with_projects} />}
        />
        <KpiCard
          label="Ticket đang mở"
          value={formatNumber(summary.open_tickets)}
          icon={Ticket}
          tone="var(--kpi-tickets)"
          loading={loading && summary.open_tickets == null}
          delta={<Delta current={summary.open_tickets ?? null} previous={comparison?.open_tickets} />}
        />
        <KpiCard
          label="Mức độ hài lòng (CSAT)"
          value={csatValue}
          icon={Smile}
          tone="var(--info)"
          loading={loading && summary.csat == null}
          delta={<Delta current={summary.csat ?? null} previous={comparison?.csat} />}
        />
      </section>

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
          aria-label="Lọc theo trạng thái"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="min-w-[180px]"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Không hoạt động</option>
          <option value="archived">Đã lưu trữ</option>
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

      {/* Table */}
      <Card className="overflow-hidden border-[var(--border)] bg-[var(--surface)]">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm text-[var(--text)]">
              <thead className="bg-[var(--sidebar-group)] text-xs text-[var(--muted)]">
                <tr>
                  {['#', 'Tên khách hàng', 'Liên hệ chính', 'Ngành', 'Dự án', 'Ticket mở', 'Trạng thái', 'Thao tác'].map((head) => (
                    <th key={head} scope="col" className="h-11 whitespace-nowrap px-4 text-left font-medium">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-[var(--surface)]">
                {loading && !items.length && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-b border-[var(--border)]">
                    {Array.from({ length: 8 }).map((__, c) => (
                      <td key={c} className="h-14 px-4"><Skeleton className="h-4 w-full max-w-[120px]" /></td>
                    ))}
                  </tr>
                ))}

                {!loading && !error && items.map((item, index) => {
                  const name = item.name || '—'
                  const code = item.code || '—'
                  const contactName = item.primary_contact_name || '—'
                  const contactLines = [item.email, item.phone].filter((v): v is string => Boolean(v))
                  const industryLabel = industryName(item.industry) || '—'
                  const statusKey = item.status || ''
                  const statusMeta = STATUS_META[statusKey] ?? {
                    label: statusKey || '—',
                    variant: 'default' as const,
                  }
                  return (
                    <tr key={item.id} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--sidebar-group)]">
                      <td className="h-14 whitespace-nowrap px-4 text-[var(--muted)]">
                        {(currentPage - 1) * effectivePageSize + index + 1}
                      </td>
                      <td className="h-14 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 size={18} className="shrink-0 text-[var(--muted)]" aria-hidden />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{name}</p>
                            <p className="text-xs text-[var(--muted)]">Mã: {code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="h-14 px-4">
                        <p className="whitespace-nowrap">{contactName}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {contactLines.length ? contactLines.join(' · ') : '—'}
                        </p>
                      </td>
                      <td className="h-14 px-4"><Badge variant="default">{industryLabel}</Badge></td>
                      <td className="h-14 px-4 tabular-nums">{formatNumber(item.project_count)}</td>
                      <td className="h-14 px-4 tabular-nums">{formatNumber(item.open_ticket_count)}</td>
                      <td className="h-14 px-4"><Badge variant={statusMeta.variant}>{statusMeta.label}</Badge></td>
                      <td className="h-14 whitespace-nowrap px-4">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Sẽ hỗ trợ ở bản sau"
                            aria-label="Sửa (sẽ hỗ trợ ở bản sau)"
                            aria-disabled="true"
                            className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-md text-[var(--muted)] opacity-50"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            title="Sẽ hỗ trợ ở bản sau"
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
    </div>
  )
}
