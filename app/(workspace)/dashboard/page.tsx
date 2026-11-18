'use client'

/**
 * Project OPS v1.0 — Operations Dashboard.
 * - Không hardcode 24/86/12/03 (DESIGN_BASELINE.md:9).
 * - Không dùng bảng alerts/maintenances/project.progress cũ.
 * - SLA risk KHÔNG phải bucket donut (tokens.json:53, baseline:17).
 * - Progress thiếu baseline -> "Chưa đủ dữ liệu" (baseline:19).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui/ui'
import { RefreshCw, FolderKanban, Activity, Ticket, AlertTriangle, ArrowUpRight } from 'lucide-react'

type DataQuality = 'complete' | 'partial' | 'stale' | 'insufficient_baseline'
interface Envelope {
  as_of: string
  effective_scope: { requested_customer_id: string | null; customer_ids: string[] | null; role: string }
  data_quality: DataQuality
}
interface SummaryData {
  active_projects: number
  weighted_progress: number | null
  open_tickets: number
  sla_at_risk_count: number | null
  sla_breached: number | null
  progress_coverage: number | null
}
interface TicketStatusData {
  buckets: { in_progress: number; waiting: number; new: number; other?: number }
  total_open: number
}
interface Incident {
  id: string; code: string; priority: string; status: string; created_at: string
}
interface TrendPoint { date: string; created: number }

type State<T> = { data: T | null; loading: boolean; error: string | null }

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-store' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

function useDashboard() {
  const [summary, setSummary] = useState<State<Envelope & { data: SummaryData }>>({ data: null, loading: true, error: null })
  const [status, setStatus] = useState<State<Envelope & { data: TicketStatusData }>>({ data: null, loading: true, error: null })
  const [incidents, setIncidents] = useState<State<Envelope & { data: { items: Incident[] } }>>({ data: null, loading: true, error: null })
  const [trend, setTrend] = useState<State<Envelope & { data: { series: TrendPoint[] } }>>({ data: null, loading: true, error: null })

  const load = useCallback(async () => {
    const mark = <T,>(setter: React.Dispatch<React.SetStateAction<State<T>>>) =>
      setter((s) => ({ ...s, loading: true, error: null }))
    mark(setSummary); mark(setStatus); mark(setIncidents); mark(setTrend)
    const params = typeof window !== 'undefined' ? window.location.search : ''
    const base = '/api/v1/dashboard'
    const jobs = [
      fetchJson<Envelope & { data: SummaryData }>(`${base}/summary${params}`).then((d) => setSummary({ data: d, loading: false, error: null })).catch((e: Error) => setSummary((s) => ({ ...s, loading: false, error: e.message }))),
      fetchJson<Envelope & { data: TicketStatusData }>(`${base}/ticket-status${params}`).then((d) => setStatus({ data: d, loading: false, error: null })).catch((e: Error) => setStatus((s) => ({ ...s, loading: false, error: e.message }))),
      fetchJson<Envelope & { data: { items: Incident[] } }>(`${base}/incidents${params}`).then((d) => setIncidents({ data: d, loading: false, error: null })).catch((e: Error) => setIncidents((s) => ({ ...s, loading: false, error: e.message }))),
      fetchJson<Envelope & { data: { series: TrendPoint[] } }>(`${base}/ticket-trend${params}`).then((d) => setTrend({ data: d, loading: false, error: null })).catch((e: Error) => setTrend((s) => ({ ...s, loading: false, error: e.message }))),
    ]
    await Promise.allSettled(jobs)
  }, [])

  useEffect(() => { void load() }, [load])
  return { summary, status, incidents, trend, reload: load }
}

function KpiCard({ label, value, sub, icon: Icon, tone }: {
  label: string; value: string; sub?: string; icon: React.ComponentType<{ size?: number; className?: string }>; tone: string
}) {
  return (
    <Card className="overflow-hidden border-[var(--border)] bg-[var(--surface)]">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
          <p className="mt-1 text-[34px] font-semibold leading-none" style={{ color: tone }}>{value}</p>
          {sub && <p className="mt-2 text-xs text-[var(--muted)]">{sub}</p>}
        </div>
        <span className="rounded-lg p-2" style={{ backgroundColor: `${tone}1A`, color: tone }}><Icon size={20} /></span>
      </CardContent>
    </Card>
  )
}

function InfoBar({ env }: { env?: Envelope }) {
  if (!env) return <div className="h-6" aria-hidden />
  const scope = env.effective_scope.customer_ids
  const label = scope === null ? 'Toàn hệ thống' : scope.length === 1 ? `Khách hàng: ${scope[0]}` : `${scope.length} khách hàng`
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs text-[var(--muted)]">
      <span>Cập nhật: <time dateTime={env.as_of}>{new Date(env.as_of).toLocaleString('vi-VN')}</time></span>
      <span aria-hidden>·</span><span>Phạm vi: <strong className="text-[var(--text)]">{label}</strong></span>
      <span aria-hidden>·</span><span>Chất liệuệu: <Badge variant="default">{env.data_quality}</Badge></span>
    </div>
  )
}

export default function DashboardPage() {
  const { summary, status, incidents, trend, reload } = useDashboard()
  const s = summary.data?.data
  const buckets = status.data?.data?.buckets
  const donutTotal = status.data?.data?.total_open ?? 0
  const progress = s?.weighted_progress == null ? '—' : `${Math.round(s.weighted_progress)}%`

  const donut = useMemo(() => {
    const parts = [
      { key: 'in_progress', value: buckets?.in_progress ?? 0, color: 'var(--ticket-in-progress)' },
      { key: 'waiting', value: buckets?.waiting ?? 0, color: 'var(--ticket-waiting)' },
      { key: 'new', value: buckets?.new ?? 0, color: 'var(--ticket-new)' },
    ]
    if (buckets?.other) parts.push({ key: 'other', value: buckets.other, color: 'var(--muted)' })
    return parts
  }, [buckets])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[30px] font-semibold text-[var(--text)]">Operations Dashboard</h1>
          <p className="text-sm text-[var(--muted)]">Tổng quan vận hành theo phạm vi được phép</p>
        </div>
        <button type="button" onClick={() => void reload()} className="inline-flex h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text)] transition hover:border-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]">
          <RefreshCw size={16} /> Làm mới
        </button>
      </header>

      <InfoBar env={summary.data ?? status.data ?? incidents.data ?? trend.data ?? undefined} />

      {summary.error && <p role="alert" className="rounded-lg border border-[var(--risk)] bg-[var(--surface)] p-3 text-sm text-[var(--risk)]">{summary.error}</p>}

      <section aria-label="Chỉ số chính" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Dự án hoạt động" value={summary.loading && !s ? '…' : String(s?.active_projects ?? 0)} icon={FolderKanban} tone="var(--kpi-projects)" />
        <KpiCard label="Tiến độ tổng" value={summary.loading && !s ? '…' : progress} sub={s?.weighted_progress == null ? 'Chưa đủ dữ liệu' : undefined} icon={Activity} tone="var(--kpi-progress)" />
        <KpiCard label="Ticket mở" value={summary.loading && !s ? '…' : String(s?.open_tickets ?? 0)} icon={Ticket} tone="var(--kpi-tickets)" />
        <KpiCard label="SLA sắp vi phạm" value={s?.sla_at_risk_count == null ? '—' : String(s.sla_at_risk_count)} sub={s?.sla_breached != null ? `Đã vi phạm: ${s.sla_breached}` : 'Chưa đủ dữ liệu SLA'} icon={AlertTriangle} tone="var(--kpi-sla)" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Tiến độ và trạng thái ticket">
        <Card className="border-[var(--border)] bg-[var(--surface)]">
          <CardHeader><CardTitle>Tiến độ dự án</CardTitle></CardHeader>
          <CardContent>
            {summary.loading && !s ? <p className="text-sm text-[var(--muted)]">Đang tải…</p>
              : s?.weighted_progress == null
                ? <p className="text-sm text-[var(--muted)]">Chưa đủ dữ liệu baseline để tính tiến độ trọng số.</p>
                : <div className="space-y-2">
                    <div className="h-3 rounded-full bg-[var(--canvas)]"><div className="h-3 rounded-full" style={{ width: `${Math.min(100, Math.max(0, s.weighted_progress))}%`, backgroundColor: 'var(--kpi-progress)' }} /></div>
                    <p className="text-xs text-[var(--muted)]">Trọng số đã duyệt · độ phủ {s.progress_coverage ?? 0} dự án</p>
                  </div>}
          </CardContent>
        </Card>

        <Card className="border-[var(--border)] bg-[var(--surface)]">
          <CardHeader><CardTitle>Trạng thái ticket</CardTitle></CardHeader>
          <CardContent>
            {status.loading && !buckets ? <p className="text-sm text-[var(--muted)]">Đang tải…</p> : (
              <div className="flex items-center gap-6">
                <div role="img" aria-label={`Phân bổ ticket: ${donut.map((d) => `${d.key} ${d.value}`).join(', ')}`} className="h-32 w-32 shrink-0 rounded-full" style={{ background: `conic-gradient(${donut.length ? donut.map((d) => `${d.color} 0 ${(d.value / Math.max(1, donutTotal)) * 100}%`).join(',') : 'var(--border) 0 100%'})` }} />
                <ul className="space-y-1 text-sm">{donut.map((d) => (
                  <li key={d.key} className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: d.color }} aria-hidden /> <span className="capitalize text-[var(--muted)]">{d.key}</span> <strong className="text-[var(--text)]">{d.value}</strong></li>
                ))}</ul>
              </div>
            )}
            <p className="mt-3 text-xs text-[var(--muted)]">Tổng ticket mở: {donutTotal} · SLA risk không nằm trong biểu đồ này.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Sự cố và xu hướng">
        <Card className="border-[var(--border)] bg-[var(--surface)]">
          <CardHeader><CardTitle>Sự cố ưu tiên</CardTitle></CardHeader>
          <CardContent>
            {incidents.data?.data?.items?.length ? (
              <ul className="divide-y divide-[var(--border)] text-sm">
                {incidents.data.data.items.slice(0, 6).map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                    <a href={`/tickets/${t.id}`} className="truncate font-medium text-[var(--text)] hover:underline">{t.code} <ArrowUpRight size={13} className="inline" /></a>
                    <Badge variant="critical">{t.priority}</Badge>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-[var(--muted)]">{incidents.loading ? 'Đang tải…' : 'Không có sự cố mở trong phạm vi.'}</p>}
          </CardContent>
        </Card>

        <Card className="border-[var(--border)] bg-[var(--surface)]">
          <CardHeader><CardTitle>Xu hướng ticket tạo mới · 7 ngày</CardTitle></CardHeader>
          <CardContent>
            <ul className="flex items-end gap-2" aria-label="Biểu đồ cột xu hướng ticket">
              {(trend.data?.data?.series ?? []).map((p) => (
                <li key={p.date} className="flex flex-1 flex-col items-center gap-1" title={`${p.date}: ${p.created}`}>
                  <span className="w-full rounded-t" style={{ height: `${Math.max(4, p.created * 8)}px`, backgroundColor: 'var(--primary)' }} aria-hidden />
                  <span className="text-[10px] text-[var(--muted)]">{p.date.slice(5)}</span>
                </li>
              ))}
            </ul>
            {!trend.data && <p className="text-sm text-[var(--muted)]">{trend.loading ? 'Đang tải…' : 'Không có dữ liệu xu hướng.'}</p>}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
