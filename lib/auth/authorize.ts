// Project OPS v1.0 — Server-side authorization.
// Deny by default. Role from DB `users.role` (source of truth) or verified JWT app_metadata.
// Role grant KHÔNG override resource scope (docs/05-quality/rbac_policy.json:163).

import { cookies } from 'next/headers'
import { getSupabaseClient } from '@/lib/supabase/server'
import {
  ROLES, hasPermission, canAll, isRole, type Role, type Permission, type ScopeGrant,
} from '@/lib/rbac/policy'

export { ROLES, hasPermission, canAll, isRole }
export type { Role, Permission, ScopeGrant }

export interface Authorized {
  ok: true
  userId: string
  email: string
  role: Role
  grants: ScopeGrant[]
  supabase: ReturnType<typeof getSupabaseClient>
}
export interface Denied {
  ok: false
  status: number
  message: string
}

/** Đọc role/scope grants từ bảng user_grants (migration 006). Fail-closed. */
async function loadProfile(supabase: ReturnType<typeof getSupabaseClient>, userId: string) {
  const [{ data: user }, { data: grants }] = await Promise.all([
    supabase.from('users').select('id, email, role').eq('id', userId).maybeSingle(),
    supabase.from('user_grants').select('customer_id').eq('user_id', userId),
  ])
  const scopeGrants: ScopeGrant[] = (grants ?? [])
    .map((g: { customer_id?: string | null }) => g.customer_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
    .map((id) => ({ kind: 'customer' as const, id }))
  return { user, scopeGrants }
}

/**
 * Xác thực session + permission. Trả 401 nếu chưa login, 500 nếu chưa config,
 * 403 nếu thiếu permission. Scope phải kiểm tra riêng bằng canAccessScope().
 */
export async function authorize(required: Permission | readonly Permission[] = 'dashboard.read'): Promise<Authorized | Denied> {
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value
  if (!token) return { ok: false, status: 401, message: 'Chưa đăng nhập.' }

  let supabase: ReturnType<typeof getSupabaseClient>
  try {
    supabase = getSupabaseClient()
  } catch {
    return { ok: false, status: 500, message: 'Chưa cấu hình Supabase.' }
  }

  const { data: authData, error } = await supabase.auth.getUser(token)
  if (error || !authData.user) {
    return { ok: false, status: 401, message: 'Phiên đăng nhập không hợp lệ.' }
  }
  try {
    await supabase.auth.setSession({ access_token: token, refresh_token: '' })
  } catch { /* getUser đã verify identity */ }

  const user = authData.user
  const meta = (user.app_metadata ?? {}) as Record<string, unknown>
  const { user: profile, scopeGrants } = await loadProfile(supabase, user.id)
  const role: Role | null = isRole(profile?.role)
    ? profile.role
    : isRole(meta.role) ? meta.role : null

  const needed = typeof required === 'string' ? [required] : required
  if (!role || !canAll(role, needed)) {
    return { ok: false, status: 403, message: 'Không đủ quyền thực hiện thao tác này.' }
  }
  if (role === 'super_admin') scopeGrants.push({ kind: 'global' })

  return {
    ok: true,
    userId: user.id,
    email: profile?.email ?? user.email ?? '',
    role,
    grants: scopeGrants,
    supabase,
  }
}
