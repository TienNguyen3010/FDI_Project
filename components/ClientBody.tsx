'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

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

export default function ClientBody({
  children,
  initialCollapsed,
}: {
  children: ReactNode
  initialCollapsed?: boolean
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState<boolean>(initialCollapsed ?? false)
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

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-border bg-secondary transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className="flex h-16 items-center justify-center border-b border-border">
          {!collapsed && (
            <span className="flex items-center gap-2 text-lg font-semibold text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FolderKanban className="h-4 w-4" />
              </span>
              FDI_Project
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          {!collapsed && user ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {user.email?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{user.email}</p>
                <p className="text-xs">Role: {role}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center text-xs text-muted-foreground">
              {collapsed ? 'Login' : 'Đăng nhập để tiếp tục'}
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-border px-4 bg-background">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <Menu size={18} /> : <X size={18} />}
            </button>
            <h1 className="text-lg font-semibold text-primary">
              {pathname === '/dashboard'
                ? 'Dashboard'
                : (allItems.find((i) => i.href === pathname)?.label ??
                  pathname.split('/').pop() ??
                  'Trang')}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <span className="hidden text-sm text-muted-foreground sm:block">
                {user.email}
              </span>
            )}
            <button
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => {
                supabase.auth.signOut().then(() => {
                  window.location.href = '/login'
                })
              }}
            >
              <LogOut size={16} />
              {!collapsed && <span>Đăng xuất</span>}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  )
}
