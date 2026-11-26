// FDI_Project — Admin RBAC: PermissionMatrix (ADM-02 / ADM-03)
// Row = resource/permission, Column = role; tri-state checkbox, scope selector.
// Logic server-side (RBAC core) + display-only client-side matrix.

import { useMemo, useState } from 'react'
import { Label } from '@/components/ui/ui'
import { Badge } from '@/components/ui/ui'
import { useProfile } from '@/lib/hooks/useProfile'
import { hasPermission } from '@/lib/rbac/policy'
import type { Permission, Role } from '@/lib/rbac/policy'

export interface PermissionRow {
  id: string
  action: string
  label: string
  enabled: boolean
  scope: 'global' | 'customer' | 'project' | 'team'
}

export interface PermissionColumn {
  role: Role
  rows: PermissionRow[]
  grants: string[]
}

export interface PermissionMatrixProps {
  /** Resource rows: { id: 'customer.create', action: 'create', label: 'Thêm khách hàng' } */
  permissionRows: PermissionRow[]
  /** role => grants (effective) */
  grants: Record<Role, string[]>
  /** optional scope */
  scope?: 'global' | 'customer' | 'project' | 'team'
  /** show grants count */
  showGrantCount?: boolean
  /** name used in heading / aria */
  label?: string
}

/**
 * Hiển thị quyền theo kiểu checkbox checkbox xếp hàng.
 * - checked = có grant; half = không rõ (server-side chờ xác minh).
 * - Chỉ dùng để hiển thị, không tự động đổi DB (client hard RBAC ở route).
 */
export function PermissionMatrix({
  permissionRows,
  grants,
  scope = 'global',
  showGrantCount = true,
  label = 'Quyền truy cập',
}: PermissionMatrixProps) {
  const { role } = useProfile()
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  const columns = useMemo(() => {
    // Role order: SYS_ADMIN > DIRECTOR > ENGINEER > SUPPORT > CUSTOMER_VIEWER
    const order: Role[] = [
      'super_admin',
      'director',
      'project_manager',
      'engineer',
      'support',
      'customer_viewer',
    ]
    const ordered: PermissionColumn[] = []
    for (const r of order) {
      const rows = permissionRows.filter((row) => {
        if (hasPermission(r, row.id)) return false
        const rowGrants = grants[r] ?? []
        return !rowGrants.includes(row.id)
      })
      const allGrants = new Set<string>()
      for (const row of rows) {
        const rowGrants = grants[r] ?? []
        for (const g of rowGrants) allGrants.add(g)
      }
      ordered.push({
        role: r,
        rows,
        grants: [...allGrants],
      })
    }
    return ordered
  }, [permissionRows, grants])

  const columnCount = columns.length
  const rowCount = permissionRows.length

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="permission-action">{label}</Label>
        <div className="flex flex-wrap gap-1.5">
          {columns.map((c) => (
            <div
              key={c.role}
              className="flex flex-col gap-1"
            >
              <span className="text-xs font-medium text-muted-foreground">{c.role}</span>
              <div className="flex flex-wrap gap-1.5">
                {c.rows.map((row) => {
                  const grant = grants[c.role] ?? []
                  const has = grant.includes(row.id)
                  const checked = selected[row.id] ?? has
                  const display = has && !checked ? 'default' : (checked ? 'default' : 'inactive')
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() =>
                        setSelected((s) => ({ ...s, [row.id]: !s[row.id] }))
                      }
                      aria-label={`${row.label} - ${c.role}: ${checked ? 'Bật' : 'Tắt'}`}
                      className={`inline-flex min-h-10 min-w-12 items-center justify-center rounded-md border text-xs font-medium transition-colors ${
                        checked
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-surface text-muted hover:border-sidebar-group'
                      }`}
                    >
                      {row.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Tri-state: '{hasPermission(role, 'admin.user_manage') ? 'checked' : 'unchecked'}"</span>
        <span>Default deny.</span>
      </div>
    </div>
  )
}

export default PermissionMatrix
