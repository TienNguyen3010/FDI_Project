// Project OPS v1.0 — RBAC core logic (runtime-agnostic, no TS syntax).
// Used by both lib/rbac/policy.ts and node:test. Deny by default.

export const ROLES = [
  'super_admin', 'director', 'project_manager', 'engineer', 'support', 'customer_viewer',
]

export const PERMISSIONS = [
  'admin.audit_read', 'admin.role_manage', 'admin.user_manage',
  'asset.create', 'asset.install', 'asset.move', 'asset.read', 'asset.retire',
  'customer.create', 'customer.read', 'customer.update',
  'dashboard.read',
  'diagram.approve', 'diagram.create', 'diagram.read', 'diagram.submit',
  'document.approve', 'document.download', 'document.read', 'document.upload',
  'maintenance.approve', 'maintenance.create', 'maintenance.execute', 'maintenance.read',
  'monitoring.read',
  'project.approve', 'project.create', 'project.read', 'project.update',
  'report.approve', 'report.export', 'report.generate', 'report.read',
  'site.create', 'site.read', 'site.update',
  'task.assign', 'task.create', 'task.read', 'task.update',
  'ticket.assign', 'ticket.change_priority', 'ticket.close', 'ticket.comment',
  'ticket.create', 'ticket.read', 'ticket.resolve', 'ticket.triage',
]

const ALL = new Set(PERMISSIONS)
const ROLE_PERMISSIONS = {
  super_admin: ALL,
  director: new Set([
    'asset.read', 'customer.read', 'diagram.read', 'document.download', 'document.read',
    'maintenance.approve', 'maintenance.read', 'project.approve', 'project.read',
    'report.approve', 'report.export', 'report.read', 'site.read', 'task.read',
    'ticket.assign', 'ticket.read', 'dashboard.read', 'monitoring.read',
  ]),
  project_manager: new Set([
    'asset.install', 'asset.read', 'customer.read', 'diagram.create', 'diagram.read',
    'diagram.submit', 'document.download', 'document.read', 'document.upload',
    'maintenance.read', 'project.approve', 'project.create', 'project.read', 'project.update',
    'report.generate', 'report.read', 'site.read', 'task.assign', 'task.create',
    'task.read', 'task.update', 'ticket.create', 'ticket.read', 'dashboard.read',
  ]),
  engineer: new Set([
    'asset.install', 'asset.move', 'asset.read', 'diagram.read', 'document.read',
    'document.upload', 'maintenance.execute', 'maintenance.read', 'project.read',
    'site.read', 'task.read', 'task.update', 'ticket.comment', 'ticket.create',
    'ticket.read', 'ticket.resolve', 'dashboard.read',
  ]),
  support: new Set([
    'asset.read', 'customer.read', 'diagram.read', 'document.read', 'maintenance.read',
    'report.read', 'site.read', 'ticket.assign', 'ticket.change_priority', 'ticket.close',
    'ticket.comment', 'ticket.create', 'ticket.read', 'ticket.resolve', 'ticket.triage',
    'dashboard.read', 'monitoring.read',
  ]),
  customer_viewer: new Set([
    'asset.read', 'diagram.read', 'document.download', 'document.read', 'project.read',
    'report.read', 'site.read', 'ticket.read', 'dashboard.read',
  ]),
}

export function isRole(v) {
  return typeof v === 'string' && ROLES.includes(v)
}
export function isPermission(v) {
  return typeof v === 'string' && PERMISSIONS.includes(v)
}
export function hasPermission(role, permission) {
  if (!isRole(role)) return false
  return ROLE_PERMISSIONS[role].has(permission)
}
export function canAll(role, permissions) {
  return Array.isArray(permissions) && permissions.every((p) => hasPermission(role, p))
}
/**
 * Role grant KHÔNG override resource scope (rbac_policy.json:163).
 * global chỉ dành super_admin; team resolve ở tầng query DB => deny mặc định.
 */
export function canAccessScope(role, permission, resource, grants) {
  if (!hasPermission(role, permission)) return false
  if (role === 'super_admin') return true
  const list = Array.isArray(grants) ? grants : []
  return list.some((g) => {
    if (!g || typeof g !== 'object') return false
    switch (g.kind) {
      case 'customer': return !!resource?.customer_id && resource.customer_id === g.id
      case 'site': return !!resource?.site_id && resource.site_id === g.id
      case 'project': return !!resource?.project_id && resource.project_id === g.id
      default: return false // global/team không tự cấp ở tầng này
    }
  })
}

export const SCOPE_RULES = {
  global: 'only system administrators',
  customer: 'customer_id matches grant',
  site: 'site belongs to granted customer or exact site',
  project: 'project belongs to granted customer or exact project',
  team: 'resource assigned to member of team',
}
