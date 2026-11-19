// Project OPS v1.0 — typed façade over the runtime-agnostic RBAC core.
// Logic lives in policy.core.mjs so node:test can import it without a TS loader.
import {
  ROLES as _ROLES,
  PERMISSIONS as _PERMISSIONS,
  isRole as _isRole,
  hasPermission as _hasPermission,
  canAll as _canAll,
  canAccessScope as _canAccessScope,
} from './policy.core.mjs'

export const ROLES = _ROLES
export type Role = (typeof _ROLES)[number]
export type Permission = (typeof _PERMISSIONS)[number]

export const isRole = _isRole as (v: unknown) => v is Role
export const hasPermission = _hasPermission as (role: unknown, p: Permission) => boolean
export const canAll = _canAll as (role: unknown, p: readonly Permission[]) => boolean

export type ScopeKind = 'global' | 'customer' | 'site' | 'project' | 'team'
export interface ScopeGrant {
  kind: ScopeKind
  id?: string
}
export const canAccessScope = _canAccessScope as (
  role: unknown,
  permission: Permission,
  resource: { customer_id?: string | null; site_id?: string | null; project_id?: string | null },
  grants: readonly ScopeGrant[],
) => boolean
