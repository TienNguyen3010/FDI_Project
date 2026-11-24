'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ChevronDown,
  LayoutDashboard,
  Users,
  FolderKanban,
  MapPin,
  Network,
  Server,
  ListChecks,
  Ticket,
  Wrench,
  Activity,
  FileText,
  ChartNoAxesColumn,
  Settings,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  type LucideIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { hasPermission, isRole, type Permission, type Role as V1Role } from '@/lib/rbac/policy'
import { ToastProvider } from '@/components/ui/ui'

/*
 * Project OPS — App shell theo Design Token Green v1.0.
 * Nguồn navigation: docs/02-design/assets/navigation.json (5 nhóm, thứ tự giữ nguyên).
 * Sidebar trắng, icon xanh #07872B, heading xanh #08752A, active pale-green #DDF5DC
 * + rail trái 3px #008B21. 44px target, aria-current=page, responsive drawer.
 * Ẩn menu là UX — backend (RLS/policy) vẫn là nguồn quyền chính.
 */

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  permission: Permission
}

interface NavGroup {
  label: string
  items: NavItem[]
}

/** Map icon name từ navigation.json sang Lucide component. */
const ICONS: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  users: Users,
  folder: FolderKanban,
  'map-pin': MapPin,
  network: Network,
  server: Server,
  'list-checks': ListChecks,
  ticket: Ticket,
  wrench: Wrench,
  activity: Activity,
  'file-text': FileText,
  'chart-column': ChartNoAxesColumn,
  settings: Settings,
}

/* Bám đúng navigation.json: thứ tự nhóm + nhãn + permission. */
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'TỔNG QUAN',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: ICONS['layout-dashboard'], permission: 'dashboard.read' },
    ],
  },
  {
    label: 'KHÁCH HÀNG & DỰ ÁN',
    items: [
      { label: 'Customers', href: '/customers', icon: ICONS.users, permission: 'customer.read' },
      { label: 'Projects', href: '/projects', icon: ICONS.folder, permission: 'project.read' },
      { label: 'Sites', href: '/sites', icon: ICONS['map-pin'], permission: 'site.read' },
      { label: 'Infrastructure', href: '/infrastructure', icon: ICONS.network, permission: 'diagram.read' },
      { label: 'Assets', href: '/assets', icon: ICONS.server, permission: 'asset.read' },
    ],
  },
  {
    label: 'VẬN HÀNH & DỊCH VỤ',
    items: [
      { label: 'Works', href: '/my-work', icon: ICONS['list-checks'], permission: 'task.read' },
      { label: 'Service Desk', href: '/tickets', icon: ICONS.ticket, permission: 'ticket.read' },
      { label: 'Maintenance', href: '/maintenance', icon: ICONS.wrench, permission: 'maintenance.read' },
      // navigation.json: chỉ hiện khi monitoring.read được cấu hình (feature flag).
      { label: 'Monitoring', href: '/monitoring', icon: ICONS.activity, permission: 'monitoring.read' },
    ],
  },
  {
    label: 'TÀI LIỆU & BÁO CÁO',
    items: [
      { label: 'Documents', href: '/documents', icon: ICONS['file-text'], permission: 'document.read' },
      { label: 'Reports', href: '/reports', icon: ICONS['chart-column'], permission: 'report.read' },
    ],
  },
  {
    label: 'HỆ THỐNG',
    items: [
      { label: 'Admin', href: '/admin', icon: ICONS.settings, permission: 'admin.user_manage' },
    ],
  },
]

/* Điều hướng nhanh dưới cùng trên mobile (mục đã có permission). */
const BOTTOM_NAV_HREFS = ['/dashboard', '/projects', '/tickets', '/reports']

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Quản trị hệ thống',
  director: 'Giám đốc',
  project_manager: 'Quản lý dự án',
  engineer: 'Kỹ sư',
  support: 'Hỗ trợ',
  customer_viewer: 'Khách hàng',
}

export default function ClientBody({
  children,
  initialCollapsed,
}: {
  children: ReactNode
  initialCollapsed?: boolean
}) {
  const pathname = usePathname()
  /*
   * 2026-11-24: các màn hình TẠO/SỬA (full page) tự có breadcrumb + h1 trong
   * nội dung, nên topbar toàn cục ("Customers" / email admin@fdi.local) bị
   * trùng lặp và chiếm chỗ. Danh sách ĐỊNH DANH để tránh vỡ layout 24 route
   * khác (shell chỉ thay nhánh render, không đổi padding/chiều cao main).
   */
  /** Route full-page tự có breadcrumb/h1 → bỏ topbar trùng lặp. */
  const showTopbar = !(
    pathname === '/customers/new' ||
    (pathname.startsWith('/customers/') && pathname !== '/customers')
  )
  const router = useRouter()
  const [collapsed, setCollapsed] = useState<boolean>(initialCollapsed ?? false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [role, setRole] = useState<V1Role | null>(null)
  const [user, setUser] = useState<{ email: string; fullName?: string } | null>(null)
  const drawerNavRef = useRef<HTMLElement | null>(null)
  const [moreBelow, setMoreBelow] = useState(false)

  /** Cập nhật mũi tên "cuộn xem thêm" trong drawer mobile. */
  const updateMoreBelow = useCallback(() => {
    const el = drawerNavRef.current
    if (!el) {
      setMoreBelow(false)
      return
    }
    setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 8)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadProfile(userId: string, email?: string) {
      // Role lấy từ auth JWT app_metadata (nguồn cứng); fallback bảng users cho
      // session cũ. Backend vẫn enforce RBAC — UI chỉ ẩn theo policy v1.0.
      // refreshSession() để lấy app_metadata mới nhất sau khi admin đổi role —
      // getUser() có thể trả claims cũ từ cache local storage.
      await supabase.auth.refreshSession().catch(() => {})
      const { data: authData } = await supabase.auth.getUser()
      const jwtRole = authData.user?.app_metadata?.role
      const { data } = await supabase
        .from('users')
        .select('email, role')
        .eq('id', userId)
        .maybeSingle()
      if (cancelled) return
      setUser({ email: data?.email ?? email ?? '' })
      const candidate = isRole(jwtRole) ? jwtRole : data?.role
      setRole(isRole(candidate) ? candidate : null)
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user) loadProfile(data.user.id, data.user.email)
      else if (!cancelled) setRole(null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) void loadProfile(session.user.id, session.user.email)
      else if (!cancelled) {
        setUser(null)
        setRole(null)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  /** Lọc theo policy v1.0: deny-by-default, super_admin thấy tất cả. */
  const can = useCallback(
    (permission: Permission) => hasPermission(role, permission),
    [role],
  )

  const visibleGroups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => can(item.permission)),
      })).filter((group) => group.items.length > 0),
    [can],
  )

  const bottomItems = useMemo(
    () =>
      visibleGroups
        .flatMap((group) => group.items)
        .filter((item) => BOTTOM_NAV_HREFS.includes(item.href)),
    [visibleGroups],
  )

  // Đóng drawer khi chuyển trang (microtask tránh cascade render).
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) setMobileOpen(false)
    })
    return () => {
      cancelled = true
    }
  }, [pathname])

  // Escape + khoá cuộn nền khi drawer mở.
  useEffect(() => {
    if (!mobileOpen) return
    // Đo sau khi drawer mount — scrollHeight lúc đầu bằng clientHeight.
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(updateMoreBelow)
    })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [mobileOpen, updateMoreBelow])

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  const handleLogout = useCallback(() => {
    void (async () => {
      // Xoá HttpOnly cookie TRƯỚC khi chuyển hướng: proxy.ts đọc cookie này,
      // nếu còn sẽ redirect /login → /dashboard (vòng lặp sau logout).
      try {
        await supabase.auth.signOut()
      } catch {
        // Token có thể đã hết hạn; vẫn tiếp tục xoá cookie phía server.
      }
      try {
        await fetch('/api/auth/logout', { method: 'POST' })
      } catch {
        // Network lỗi vẫn chuyển /login; cookie sẽ hết hạn tự nhiên.
      }
      router.replace('/login')
      router.refresh()
    })()
  }, [router])

  const isActive = useCallback(
    (href: string) => pathname === href || pathname.startsWith(`${href}/`),
    [pathname],
  )

  const pageTitle = useMemo(() => {
    const all = NAV_GROUPS.flatMap((g) => g.items)
    return all.find((i) => isActive(i.href))?.label ?? pathname.split('/').pop() ?? 'Trang'
  }, [isActive, pathname])

  /* Sidebar content dùng chung cho desktop + drawer (giữ geometry). */
  const renderSidebarContent = (
    compact: boolean,
    onNavigate?: () => void,
    isDrawer = false,
  ) => (
    <>
      <div className={`flex h-[58px] shrink-0 items-center border-b border-border ${compact ? 'justify-center px-2' : 'gap-2 px-4'}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground" aria-hidden="true">
          P
        </span>
        {!compact && (
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold tracking-wide text-sidebar-heading">PROJECT OPS</span>
            <span className="block truncate text-[11px] text-muted-foreground">Management Platform</span>
          </span>
        )}
      </div>

      <nav
        ref={isDrawer ? drawerNavRef : undefined}
        onScroll={isDrawer ? updateMoreBelow : undefined}
        className={`sidebar-nav min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 ${
          isDrawer ? 'space-y-2 scrollbar-gutter-stable' : 'space-y-4'
        }`}
        aria-label="Điều hướng chính"
      >
        {visibleGroups.length === 0 ? (
          <p className="px-2 text-xs text-muted-foreground">Không có mục được phép truy cập.</p>
        ) : (
          <>
            {visibleGroups.map((group) => (
              <div key={group.label}>
                {!compact && (
                  <p className="mb-1.5 px-2 text-section font-semibold uppercase tracking-wider text-sidebar-heading">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.href)
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? 'page' : undefined}
                        title={compact ? item.label : undefined}
                        className={`tap-target flex items-center gap-3 rounded-md border-l-[3px] px-3 py-2 text-sidebarItem transition-colors ${
                          active
                            ? 'border-sidebar-active-border bg-sidebar-active font-medium text-sidebar-heading'
                            : 'border-transparent text-muted-foreground hover:bg-sidebar-group hover:text-sidebar-heading'
                        }`}
                      >
                        <Icon size={18} className="shrink-0 text-sidebar-icon" aria-hidden="true" />
                        {!compact && <span className="min-w-0 truncate text-left">{item.label}</span>}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
            {isDrawer && moreBelow && (
              <button
                type="button"
                onClick={() =>
                  drawerNavRef.current?.scrollBy({ top: 240, behavior: 'smooth' })
                }
                className="sticky bottom-0 left-1/2 z-10 mt-2 flex w-full -translate-x-1/2 items-center justify-center gap-1 rounded-full border border-border bg-surface/95 py-1.5 text-xs font-medium text-sidebar-heading shadow-sm"
                aria-label="Cuộn xem thêm menu"
              >
                <span>Cuộn xem thêm</span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>
            )}
          </>
        )}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        {user ? (
          <div className={`flex items-center gap-3 ${compact ? 'justify-center' : ''}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground" aria-hidden="true">
              {(user.fullName ?? user.email ?? '?').charAt(0).toUpperCase()}
            </span>
            {!compact && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {user.fullName || user.email}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {role ? (ROLE_LABEL[role] ?? role) : 'Đang xác thực…'}
                </span>
              </span>
            )}
            {compact && (
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Đăng xuất"
                className="tap-target rounded-md text-muted-foreground hover:text-foreground"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        ) : (
          <p className={`truncate text-xs text-muted-foreground ${compact ? 'text-center' : ''}`}>
            {compact ? 'Đăng nhập' : 'Đăng nhập để tiếp tục'}
          </p>
        )}
        {!compact && user && (
          <button
            type="button"
            onClick={handleLogout}
            className="tap-target mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-group hover:text-foreground"
            aria-label="Đăng xuất"
          >
            <LogOut size={16} aria-hidden="true" />
            <span>Đăng xuất</span>
          </button>
        )}
      </div>
    </>
  )

  return (
    <ToastProvider>
      <div className="flex h-dvh bg-canvas text-foreground">
        {/* Sidebar desktop — 280px expanded / 72px collapsed */}
        <aside
          className={`hidden h-dvh shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-normal md:flex ${
            collapsed ? 'w-[72px]' : 'w-[280px]'
          }`}
          aria-label="Thanh điều hướng"
        >
          {renderSidebarContent(collapsed)}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* 2026-11-24: BỎ topbar ("Customers" + admin@fdi.local) theo yêu cầu user.
              Mỗi màn hình tự có breadcrumb/h1 ngay trong nội dung (mirror Add Lead
              SoftNET CRM), nên thanh tiêu đề toàn cục chỉ làm hình, nhất là khi
              trùng tên màn hình. `hideMobileNav` (chỉ set ở 2 route form khách
              hàng) giữ lại nút mở drawer mobile. */}
          {showTopbar ? (
          <header className="flex h-[58px] shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="tap-target rounded-md text-muted-foreground transition-colors hover:bg-sidebar-group hover:text-foreground md:hidden"
                aria-label="Mở menu điều hướng"
              >
                <Menu size={20} />
              </button>
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className="tap-target hidden rounded-md text-muted-foreground transition-colors hover:bg-sidebar-group hover:text-foreground md:flex"
                aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              >
                {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>
              <span className="min-w-0 truncate text-sm font-semibold text-sidebar-heading sm:text-base" aria-hidden="true">
                {pageTitle}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {user && (
                <span className="hidden truncate text-sm text-muted-foreground sm:block">{user.email}</span>
              )}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-active text-xs font-semibold text-sidebar-heading" aria-hidden="true">
                {(user?.email ?? '?').charAt(0).toUpperCase()}
              </span>
            </div>
          </header>
          ) : (
            /* Chế độ không topbar: chỉ còn nút mở drawer ở mobile, góc trên trái. */
            <div className="flex h-12 shrink-0 items-center px-3 md:hidden">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="tap-target rounded-md text-muted-foreground transition-colors hover:bg-sidebar-group hover:text-foreground"
                aria-label="Mở menu điều hướng"
              >
                <Menu size={20} />
              </button>
            </div>
          )}

          {/* pb-20 trên mobile để bottom nav không che nội dung; md trở lại bình thường.
              Thêm pb-[calc(4.75rem+env(safe-area-inset-bottom))] để footer form (sticky)
              KHÔNG bị bottom-nav chồng lên khi cuộn tới cuối trang. */}
          <main className="min-h-0 flex-1 overflow-auto p-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:p-[30px] md:pb-[30px]">
            {children}
          </main>
        </div>

        {/* Drawer mobile */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu điều hướng">
            <div className="absolute inset-0 bg-foreground/40" onClick={closeMobile} aria-hidden="true" />
            <aside
              className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85%] flex-col border-r border-border bg-sidebar"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="absolute right-2 top-2 z-10">
                <button
                  type="button"
                  onClick={closeMobile}
                  className="tap-target rounded-md text-muted-foreground transition-colors hover:bg-sidebar-group hover:text-foreground"
                  aria-label="Đóng menu điều hướng"
                >
                  <X size={20} />
                </button>
              </div>
              {renderSidebarContent(false, closeMobile, true)}
            </aside>
          </div>
        )}

        {/* Bottom nav mobile */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
          aria-label="Điều hướng nhanh"
        >
          {bottomItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
                className={`tap-target flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors ${
                  active
                    ? 'border-t-[3px] border-sidebar-active-border bg-sidebar-active text-sidebar-heading'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={18} className="text-sidebar-icon" aria-hidden="true" />
                <span className="w-full truncate text-center">{item.label}</span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="tap-target flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Mở menu điều hướng"
          >
            <Menu size={18} aria-hidden="true" />
            <span className="w-full truncate text-center">Menu</span>
          </button>
        </nav>
      </div>
    </ToastProvider>
  )
}
