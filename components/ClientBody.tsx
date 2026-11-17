'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Cpu,
  AlertTriangle,
  Camera,
  FileBarChart,
  Settings,
  LogOut,
  Menu,
  Plus,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ToastProvider } from '@/components/ui/ui'

type Role = 'employee' | 'leader' | 'manager' | 'director'
type Scope = Role[]

interface NavItem {
  label: string
  href: string
  icon: ReactNode
  scope: Scope
}

// RBAC mềm (UI): Manager & Director thấy Quản trị.
// Quyết định Dev Director 2026-11-17: theo rbac_matrix.md:40 + product.md:381
// (Manager thêm user/team của mình); database_schema.sql:158 đã được sửa cho khớp.
const allItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} />, scope: ['employee', 'leader', 'manager', 'director'] },
  { label: 'Khách hàng', href: '/customers', icon: <Users size={18} />, scope: ['employee', 'leader', 'manager', 'director'] },
  { label: 'Dự án', href: '/projects', icon: <FolderKanban size={18} />, scope: ['employee', 'leader', 'manager', 'director'] },
  { label: 'Thiết bị', href: '/devices', icon: <Cpu size={18} />, scope: ['employee', 'leader', 'manager', 'director'] },
  { label: 'Cảnh báo', href: '/alerts', icon: <AlertTriangle size={18} />, scope: ['employee', 'leader', 'manager', 'director'] },
  { label: 'Bảo trì', href: '/maintenance', icon: <Camera size={18} />, scope: ['employee', 'leader', 'manager', 'director'] },
  { label: 'Báo cáo', href: '/reports', icon: <FileBarChart size={18} />, scope: ['employee', 'leader', 'manager', 'director'] },
  { label: 'Quản trị', href: '/admin', icon: <Settings size={18} />, scope: ['manager', 'director'] },
]

// Mục trên thanh điều hướng dưới cùng (mobile) — checklist §2 #10, ui_ux_spec §4.2.
const bottomNavHrefs = ['/dashboard', '/projects', '/alerts', '/reports']

export default function ClientBody({
  children,
  initialCollapsed,
}: {
  children: ReactNode
  initialCollapsed?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState<boolean>(initialCollapsed ?? false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [role, setRole] = useState<Role>('employee')
  const [user, setUser] = useState<{ email: string } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadProfile(userId: string) {
      const { data } = await supabase
        .from('users')
        .select('email, role')
        .eq('id', userId)
        .maybeSingle()
      if (cancelled || !data) return
      setUser({ email: data.email })
      if (
        data.role === 'employee' ||
        data.role === 'leader' ||
        data.role === 'manager' ||
        data.role === 'director'
      ) {
        setRole(data.role)
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user) loadProfile(data.user.id)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadProfile(session.user.id)
      else if (!cancelled) {
        setUser(null)
        setRole('employee')
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const visibleItems = allItems.filter((item) => item.scope.includes(role))
  const bottomItems = visibleItems.filter((item) => bottomNavHrefs.includes(item.href))

  // Đóng drawer khi chuyển trang (đẩy vào microtask để tránh cascade render).
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) setMobileOpen(false)
    })
    return () => {
      cancelled = true
    }
  }, [pathname])

  // Đóng drawer bằng Escape + khoá cuộn nền khi drawer mở (tránh click-trap).
  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [mobileOpen])

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  const handleLogout = useCallback(() => {
    void supabase.auth.signOut().then(() => {
      router.push('/login')
    })
  }, [router])

  const renderNavItems = (compact: boolean, onNavigate?: () => void) =>
    visibleItems.map((item) => {
      const active = pathname === item.href
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? 'page' : undefined}
          title={compact ? item.label : undefined}
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
            active
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
          }`}
        >
          <span className="flex shrink-0 items-center">{item.icon}</span>
          {!compact && <span className="min-w-0 break-words text-left">{item.label}</span>}
        </Link>
      )
    })

  const pageTitle =
    pathname === '/dashboard'
      ? 'Dashboard'
      : (allItems.find((i) => i.href === pathname)?.label ??
        pathname.split('/').pop() ??
        'Trang')

  const logoutButton = (showLabel: boolean) => (
    <button
      type="button"
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
      onClick={() => {
        closeMobile()
        handleLogout()
      }}
      aria-label="Đăng xuất"
    >
      <LogOut size={16} />
      {showLabel && <span>Đăng xuất</span>}
    </button>
  )

  return (
    <ToastProvider>
      <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {/* Sidebar desktop (ẩn dưới 768px) — giữ nguyên chế độ thu gọn */}
        <aside
          className={`hidden h-screen shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)] transition-[width] duration-[var(--duration-normal)] md:flex ${
            collapsed ? 'w-16' : 'w-60'
          }`}
        >
          <div className="flex h-16 shrink-0 items-center justify-center border-b border-[var(--border)]">
            {!collapsed && (
              <span className="flex items-center gap-2 text-lg font-semibold text-[var(--accent)]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
                  <FolderKanban className="h-4 w-4" />
                </span>
                FDI_Project
              </span>
            )}
          </div>

          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
            {renderNavItems(collapsed)}
          </nav>

          <div className="shrink-0 border-t border-[var(--border)] p-3">
            {!collapsed && user ? (
              <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white">
                  {user.email?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--text-primary)]">{user.email}</p>
                  <p className="text-xs">Vai trò: {role}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center truncate text-xs text-[var(--text-secondary)]">
                {collapsed ? 'Đăng nhập' : 'Đăng nhập để tiếp tục'}
              </div>
            )}
            {collapsed && user && (
              <div className="mt-2 flex justify-center">{logoutButton(false)}</div>
            )}
          </div>
        </aside>

        {/* Nội dung chính */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg-primary)] px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              {/* Nút mở drawer — chỉ mobile */}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-md p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] md:hidden"
                aria-label="Mở menu điều hướng"
              >
                <Menu size={20} />
              </button>
              {/* Nút thu gọn sidebar — chỉ desktop */}
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className="hidden rounded-md p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] md:block"
                aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              >
                {collapsed ? <Menu size={18} /> : <X size={18} />}
              </button>
              <h1 className="truncate text-base font-semibold text-[var(--accent)] sm:text-lg">
                {pageTitle}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {user && (
                <span className="hidden truncate text-sm text-[var(--text-secondary)] sm:block">
                  {user.email}
                </span>
              )}
              <span className="hidden sm:inline">{logoutButton(false)}</span>
              <span className="sm:hidden">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
                  aria-label="Đăng xuất"
                >
                  <LogOut size={18} />
                </button>
              </span>
            </div>
          </header>

          {/* pb-20 trên mobile để bottom nav không che nội dung */}
          <main className="min-h-0 flex-1 overflow-auto p-4 pb-20 md:pb-4">{children}</main>
        </div>

        {/* Drawer mobile (overlay) */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-50 md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu điều hướng"
          >
            {/* Backdrop — click ngoài đóng drawer */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={closeMobile}
              aria-hidden="true"
            />
            <aside
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] px-4">
                <span className="flex items-center gap-2 text-lg font-semibold text-[var(--accent)]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
                    <FolderKanban className="h-4 w-4" />
                  </span>
                  FDI_Project
                </span>
                <button
                  type="button"
                  onClick={closeMobile}
                  className="rounded-md p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
                  aria-label="Đóng menu điều hướng"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-3">
                {renderNavItems(false, closeMobile)}
              </nav>

              <div className="shrink-0 border-t border-[var(--border)] p-3">
                {user ? (
                  <div className="mb-2 flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white">
                      {user.email?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--text-primary)]">{user.email}</p>
                      <p className="text-xs">Vai trò: {role}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mb-2 text-xs text-[var(--text-secondary)]">Đăng nhập để tiếp tục</p>
                )}
                {logoutButton(true)}
              </div>
            </aside>
          </div>
        )}

        {/* Bottom nav cố định trên mobile */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-[var(--border)] bg-[var(--bg-secondary)] pb-[env(safe-area-inset-bottom)] md:hidden"
          aria-label="Điều hướng nhanh"
        >
          {bottomItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors ${
                  active
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="flex items-center">{item.icon}</span>
                <span className="w-full truncate text-center">{item.label}</span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            aria-label="Thêm — mở menu điều hướng"
          >
            <span className="flex items-center">
              <Plus size={18} />
            </span>
            <span className="w-full truncate text-center">Thêm</span>
          </button>
        </nav>
      </div>
    </ToastProvider>
  )
}
