// FDI_Project — Admin RBAC: AppShell + KpiCard + FilterBar + AccessDenied
// Shared primitives cho 4 màn quản trị (ADM-01..04).
// Client-only; server-side re-authorize đây.

'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useProfile } from '@/lib/hooks/useProfile'
import { hasPermission } from '@/lib/rbac/policy'
import { ROLES as RBAC_ROLES } from '@/lib/rbac/policy'
import { Badge } from '@/components/ui/ui'

/* ─────────────────────────── sticky shell ─────────────────────────── */

export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  const { role, loading: profileLoading } = useProfile()
  const roleBadge = useMemo(() => {
    const map: Record<string, string> = {
      super_admin: 'SYS_ADMIN',
      director: 'DIRECTOR',
      project_manager: 'PM',
      engineer: 'ENGINEER',
      support: 'SUPPORT',
      customer_viewer: 'CUSTOMER_VIEWER',
    }
    return role ? (map[role] ?? role.toUpperCase()) : ''
  }, [role])

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-canvas px-4">
        <Link href="/admin" className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded bg-primary text-white">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <rect x="1" y="3" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="9" cy="9" r="2.5" fill="currentColor" />
              <path d="M9 11.5V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <span className="hidden sm:inline">{title}</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {actions}
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-sidebar-group">
            <span className="text-xs font-semibold text-foreground">{roleBadge[0] ?? ''}</span>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}

/* ─────────────────────────── KPI cards ─────────────────────────── */

export function KpiCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}) {
  const tones = {
    default: 'bg-card border-border',
    success: 'bg-[var(--success)]/10 border-[var(--success)]/30',
    warning: 'bg-[var(--warning)]/10 border-[var(--warning)]/30',
    danger: 'bg-[var(--danger)]/10 border-[var(--danger)]/30',
    info: 'bg-[var(--info)]/10 border-[var(--info)]/30',
  }
  return (
    <div className={`rounded-lg border border-border bg-card p-4 ${tones[tone]}`}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/* ─────────────────────────── filter bar ─────────────────────────── */

export function FilterBar({
  values,
  onChange,
  defaultValues,
}: {
  values: Record<string, string[]>
  onChange: (k: string, v: string[]) => void
  defaultValues?: Record<string, string[]>
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }))
  return (
    <div className="flex flex-wrap items-center gap-3">
      {Object.entries(values).map(([key, opts]) => {
        const selected = (defaultValues?.[key] ?? []).filter((v) => opts.includes(v))
        return (
          <div key={key} className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => toggle(key)}
              className="flex items-center gap-2 text-sm font-medium text-foreground"
            >
              <span className="truncate max-w-[140px] text-left">{key}</span>
              <span className="inline-flex shrink-0 items-center gap-1">
                {selected.length > 0 && <span className="text-muted-foreground text-xs">{selected.join(', ')}</span>}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M5 2v10M3 6h8M3 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
            </button>
            {open[key] && (
              <div className="flex flex-wrap gap-1.5">
                {opts.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      const next = selected.includes(opt)
                        ? selected.filter((v) => v !== opt)
                        : [...selected, opt]
                      onChange(key, next)
                      setOpen((o) => ({ ...o, [key]: false }))
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      selected.includes(opt)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-sidebar-group text-foreground hover:bg-sidebar-active'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────── AccessDenied ─────────────────────────── */

export function AccessDenied({ message = 'Bạn không đủ quyền truy cập' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="rounded-full bg-red-500/10 p-4">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
          <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 7v10M11 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-foreground">Không có quyền truy cập</h2>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Link
        href="/admin/roles"
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
      >
        Quay lại quản trị
      </Link>
    </div>
  )
}
