'use client'

/**
 * Project OPS — Customer Detail Panel
 * -----------------------------------------------------------------------------
 * Mirror đúng cấu trúc màn Quản lý Lead của SoftNET CRM (`LeadDetailPanel`):
 *   slide-over bên phải, header avatar + tên + Mã + status + đóng,
 *   block "Thông tin chuyển đổi"(Lead) → KHÔNG có ở KH; thay bằng Next Action,
 *   nút hành động nhanh (Gọi / Email / Thêm hoạt động),
 *   nhóm "Thông tin chính" + "Hoạt động gần đây" + dòng audit Tạo/Cập nhật.
 *
 * Dữ liệu thật: API GET /api/v1/customers/[id]/activities + RPC do UI tự gọi.
 */
import { useMemo, useState, type ReactNode } from 'react'
import {
  X,
  Mail,
  Phone,
  MapPin,
  Building2,
  Plus,
  History,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/ui'
import { relativeTimeLabel } from '@/lib/relativeTime'
import type { Customer, Activity, CustomerProject } from './types'
import {
  normalizePhone,
  phoneDisplay,
  isEmailLike,
  emailHref,
  splitContactText,
  CopyButton,
} from '@/components/customers/contact'

type Props = {
  customer: Customer
  activities: Activity[]
  activitiesLoading: boolean
  activitiesError: string | null
  canAddActivity: boolean
  onReloadActivities: () => void
  onAddActivity: () => void
  onClose: () => void
  /** Đường dẫn sang form sửa. */
  onEdit: () => void
  /** RBAC — form sửa cần quyền. */
  canEdit: boolean
  /** Dự án gắn với khách hàng (GET /api/v1/customers/[id]/projects). */
  projects?: CustomerProject[]
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Đang hoạt động',
  inactive: 'Không hoạt động',
  archived: 'Đã lưu trữ',
}

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2)
}

/** Nhãn trạng thái dự án — không bịa, rỗng → '—'. */
function projectStatusLabel(status: string | null): string {
  switch ((status || '').toLowerCase()) {
    case 'planned': return 'Kế hoạch'
    case 'active': return 'Đang triển khai'
    case 'in_progress': return 'Đang triển khai'
    case 'deployed': return 'Đã triển khai'
    case 'completed': return 'Hoàn thành'
    case 'closed': return 'Đóng'
    default: return status || '—'
  }
}

/** `industry` có thể là chuỗi HOẶC object {name} tùy nguồn dữ liệu. */
function industryLabel(industry: Customer['industry']): string {
  if (!industry) return ''
  if (typeof industry === 'string') return industry
  return typeof industry.name === 'string' ? industry.name : ''
}

export default function CustomerDetailPanel({
  customer,
  activities,
  activitiesLoading,
  activitiesError,
  canAddActivity,
  onReloadActivities,
  onAddActivity,
  onClose,
  onEdit,
  canEdit,
  projects = [],
}: Props) {
  const statusLabel = STATUS_LABEL[customer.status || ''] ?? customer.status ?? '—'
  const fullName = customer.name?.trim() || '—'
  /** Cả 3 kênh liên hệ bổ sung đều trống → hiện empty state thay vì 3 dòng "—". */
  const hasExtraContact = Boolean(
    customer.contact_technical?.trim() ||
      customer.contact_commercial?.trim() ||
      customer.contact_emergency?.trim(),
  )
  const [showAllActivities, setShowAllActivities] = useState(false)

  const shownActivities = useMemo(
    () => (showAllActivities ? activities : activities.slice(0, 5)),
    [activities, showAllActivities],
  )

  const activityKey = (a: Activity, i: number) =>
    a.id ?? `${a.activity_type}-${a.occurred_at ?? a.created_at ?? i}`

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      {/* Backdrop — click để đóng (mirror LeadDetailPanel) */}
      <button
        type="button"
        aria-label="Đóng thông tin khách hàng"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết khách hàng ${fullName}`}
        className="relative flex h-full w-full max-w-[480px] flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-xl xl:max-w-[560px]"
      >
        {/* (1) Header: avatar + tên + Mã + status + đóng — mirror LeadDetailPanel */}
        <div className="flex items-start justify-between border-b border-[var(--border)] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--sidebar-group)] text-base font-semibold text-[var(--sidebar-heading)]">
              {initialsOf(fullName)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-[var(--text)]">{fullName}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant={customer.status === 'active' ? 'active' : 'default'}>{statusLabel}</Badge>
                {customer.code && <span className="font-mono text-xs text-[var(--muted)]">{customer.code}</span>}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--sidebar-group)] hover:text-[var(--text)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {/* (2) Quick actions — mirror Lead: Gọi / Email / Thêm hoạt động / Sửa */}
          <div className="flex flex-wrap gap-2">
            {customer.phone && (
              <a href={`tel:${customer.phone}`}>
                <Button size="sm" variant="outline">
                  <Phone className="mr-1 h-4 w-4" /> Gọi
                </Button>
              </a>
            )}
            {customer.email && (
              <a href={`mailto:${customer.email}`}>
                <Button size="sm" variant="outline">
                  <Mail className="mr-1 h-4 w-4" /> Email
                </Button>
              </a>
            )}
            {canAddActivity && (
              <Button type="button" size="sm" variant="outline" onClick={onAddActivity}>
                <Plus className="mr-1 h-4 w-4" /> Thêm hoạt động
              </Button>
            )}
            {canEdit && (
              <Button type="button" size="sm" className="ml-auto" onClick={onEdit}>
                Sửa khách hàng
              </Button>
            )}
          </div>

          {/* (3) Thông tin chính — heading kiểu uppercase của LeadDetailPanel */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Thông tin chính
            </h3>
            <div className="space-y-3 text-sm text-[var(--text)]">
              <Row icon={<Building2 className="h-4 w-4" />} label="Tên khách hàng" value={customer.name} />
              <Row icon={<MapPin className="h-4 w-4" />} label="Địa chỉ trụ sở" value={customer.headquarters_address} />
              <Row
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={customer.email}
                actions={
                  isEmailLike(customer.email) ? (
                    <CopyButton text={customer.email ?? ''} label={`Sao chép email của ${fullName}`} />
                  ) : undefined
                }
                valueNode={
                  isEmailLike(customer.email) ? (
                    <a
                      href={emailHref(customer.email)}
                      className="text-[var(--primary)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                    >
                      {customer.email?.trim()}
                    </a>
                  ) : undefined
                }
              />
              <Row
                icon={<Phone className="h-4 w-4" />}
                label="Điện thoại"
                value={customer.phone}
                actions={
                  normalizePhone(customer.phone) ? (
                    <CopyButton
                      text={normalizePhone(customer.phone)}
                      label={`Sao chép số điện thoại của ${fullName}`}
                    />
                  ) : undefined
                }
                valueNode={
                  normalizePhone(customer.phone) ? (
                    <a
                      href={`tel:${normalizePhone(customer.phone)}`}
                      className="text-[var(--primary)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                    >
                      {phoneDisplay(customer.phone)}
                    </a>
                  ) : undefined
                }
              />
              <Row icon={<Building2 className="h-4 w-4" />} label="Mã số thuế" value={customer.tax_id} />
              <Row icon={<Building2 className="h-4 w-4" />} label="Ngành nghề" value={industryLabel(customer.industry)} />
              <Row
                icon={<Building2 className="h-4 w-4" />}
                label="Người liên hệ"
                value={customer.primary_contact_name}
              />
              <Row icon={<History className="h-4 w-4" />} label="Dự án" value={String(customer.project_count ?? 0)} />
              <Row icon={<History className="h-4 w-4" />} label="Ticket đang mở" value={String(customer.open_ticket_count ?? 0)} />
            </div>
          </div>

          {/* (3a) LIÊN HỆ BỔ SUNG — contact_technical / contact_commercial /
              contact_emergency: giá trị user nhập tự do ("tên + số", email,
              hoặc SĐT) nên PHẢI parse bằng splitContactText, không in thẳng. */}
          <section aria-label="Liên hệ bổ sung">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Liên hệ bổ sung
            </h3>
            {!customer.contact_technical?.trim() &&
            !customer.contact_commercial?.trim() &&
            !customer.contact_emergency?.trim() ? (
              <div className="rounded-lg border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted)]">
                Chưa có thông tin liên hệ bổ sung.
              </div>
            ) : (
              <div className="space-y-3 text-sm text-[var(--text)]">
                <ExtraContactRow
                  icon={<Phone className="h-4 w-4" />}
                  label="Liên hệ kỹ thuật"
                  raw={customer.contact_technical}
                />
                <ExtraContactRow
                  icon={<Mail className="h-4 w-4" />}
                  label="Liên hệ thương mại"
                  raw={customer.contact_commercial}
                />
                <ExtraContactRow
                  icon={<AlertCircle className="h-4 w-4" />}
                  label="Liên hệ khẩn cấp"
                  raw={customer.contact_emergency}
                />
              </div>
            )}
          </section>

          {/* (3b) DỰ ÁN CỦA KHÁCH HÀNG — PSM: ý nghĩa cốt lõi là theo dõi dự án
              đang triển khai / đã triển khai. Dữ liệu thật từ API, progress null
              → '—', KHÔNG bịa 0%. */}
          <section aria-label="Dự án của khách hàng">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Dự án của khách hàng
            </h3>
            {projects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted)]">
                Chưa có dự án nào.
              </div>
            ) : (
              <ul className="space-y-2">
                {projects.map((p) => {
                  const pct = typeof p.progress === 'number' ? Math.round(p.progress) : null
                  return (
                    <li key={p.id} className="rounded-md border border-[var(--border)] px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{p.name || '—'}</span>
                        <Badge variant="default">{projectStatusLabel(p.status)}</Badge>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div
                          className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--sidebar-group)]"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={pct ?? undefined}
                          aria-label={`Tiến độ ${p.name ?? 'dự án'}`}
                        >
                          <div
                            className="h-full rounded-full bg-[var(--kpi-progress)]"
                            style={{ width: `${Math.min(100, Math.max(0, pct ?? 0))}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-xs tabular-nums text-[var(--muted)]">
                          {pct === null ? '—' : `${pct}%`}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* (4) Hoạt động gần đây — đúng khung card của Lead */}
          <section aria-label="Lịch sử hoạt động">
            <Card className="border border-[var(--border)] bg-[var(--surface)]">
              <CardHeader className="flex-row items-center justify-between gap-2 px-5 py-3 space-y-0">
                <CardTitle className="flex items-center gap-2 text-[15px]">
                  <History className="h-4 w-4 text-[var(--muted)]" /> Hoạt động gần đây
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 py-3">
                {activitiesLoading && activities.length === 0 ? (
                  <div className="space-y-2" aria-hidden="true">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : activitiesError ? (
                  <div className="flex flex-col items-start gap-2">
                    <p className="flex items-center gap-2 text-sm text-[var(--danger)]">
                      <AlertCircle size={16} /> Lỗi tải hoạt động.
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={onReloadActivities}>
                      Thử lại
                    </Button>
                  </div>
                ) : activities.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">Chưa có hoạt động nào được ghi nhận.</p>
                ) : (
                  <ul className="space-y-2">
                    {shownActivities.map((a, i) => (
                      <li key={activityKey(a, i)} className="rounded-md border border-[var(--border)] px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">
                            {a.subject || a.activity_type || 'Hoạt động'}
                          </span>
                          <span className="shrink-0 text-xs text-[var(--muted)]">
                            {a.occurred_at ? relativeTimeLabel(a.occurred_at) : ''}
                          </span>
                        </div>
                        {(a.activity_type || a.channel) && (
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--muted)]">
                            {a.activity_type && <span>{a.activity_type}</span>}
                            {a.channel && (
                              <>
                                <span aria-hidden>·</span>
                                <span>{a.channel}</span>
                              </>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            {activities.length > 5 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setShowAllActivities((v) => !v)}
              >
                {showAllActivities ? 'Thu gọn' : `Xem tất cả ${activities.length} hoạt động`}
              </Button>
            )}
          </section>

          {/* (5) Audit — mirror LeadDetailPanel: Tạo lúc / Cập nhật */}
          <div className="space-y-1 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
            <div>Tạo lúc: {fmtDateTime(customer.created_at)}</div>
            <div>Mã khách hàng: {customer.code || '—'}</div>
          </div>
        </div>
      </aside>
    </div>
  )
}

function Row({
  icon,
  label,
  value,
  actions,
  valueNode,
}: {
  icon: ReactNode
  label: string
  value?: string | null
  /** Nút hành động (vd CopyButton) — chèn cùng dòng, giữ hit-area h-7/h-8. */
  actions?: ReactNode
  /** Hiển thị thay cho `value` khi có link (tel:/mailto:) — optional. */
  valueNode?: ReactNode
}) {
  const text = value?.trim()
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-[var(--muted)]" aria-hidden>{icon}</span>
      <div className="min-w-0">
        <span className="text-[var(--muted)]">{label}: </span>
        {valueNode ?? <span className={text ? '' : 'text-[var(--muted)]'}>{text || '—'}</span>}
        {actions && <span className="ml-1.5 inline-flex shrink-0 align-middle">{actions}</span>}
      </div>
    </div>
  )
}

const LINK_CLASS =
  'text-[var(--primary)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]'

/** Link tel:/mailto: có thể bấm được; không bịa khi rỗng. */
function ContactLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className={LINK_CLASS}>
      {children}
    </a>
  )
}

/**
 * Một dòng "Liên hệ bổ sung": nhãn + tên (dòng chính) + SĐT/email (dòng phụ
 * text-xs muted, dạng link + copy). Rỗng hết → '—'.
 */
function ExtraContactRow({
  icon,
  label,
  raw,
}: {
  icon: ReactNode
  label: string
  raw?: string | null
}) {
  const parsed = splitContactText(raw)
  const phone = normalizePhone(parsed.phone)
  const email = isEmailLike(parsed.email) ? parsed.email.trim() : ''
  const name = parsed.name.trim()
  if (!raw?.trim()) {
    return (
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 text-[var(--muted)]" aria-hidden>{icon}</span>
        <div className="min-w-0">
          <span className="text-[var(--muted)]">{label}: </span>
          <span className="text-[var(--muted)]">—</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-[var(--muted)]" aria-hidden>{icon}</span>
      <div className="min-w-0">
        <span className="text-[var(--muted)]">{label}: </span>
        {/* Raw chỉ là SĐT/email (không có tên) → đẩy giá trị lên dòng chính,
            không để "—" trong khi dòng phụ lại có số. */}
        <span>{name || phoneDisplay(parsed.phone) || email || '—'}</span>
        {(phone || email) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
            {phone && (
              <>
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" aria-hidden />
                  <ContactLink href={`tel:${phone}`}>{phoneDisplay(parsed.phone)}</ContactLink>
                </span>
                <CopyButton text={phone} label={`Sao chép số điện thoại (${label})`} />
              </>
            )}
            {email && (
              <>
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" aria-hidden />
                  <ContactLink href={emailHref(email)}>{email}</ContactLink>
                </span>
                <CopyButton text={email} label={`Sao chép email (${label})`} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
