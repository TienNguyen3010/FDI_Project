'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ROLES, hasPermission, type Role, type Permission } from '@/lib/rbac/policy'

export type { Role, Permission }
export { ROLES, hasPermission }

export interface Profile {
  id: string
  email: string
  role: Role
  customerIds: string[]
}

/**
 * Lấy role + customer grants cho UI (soft RBAC). RBAC cứng ở RLS/middleware.
 * Role mặc định `customer_viewer` — KHÔNG bao giờ fallback lên quyền cao.
 */
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [role, setRole] = useState<Role>('customer_viewer')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load(userId: string, email: string | undefined) {
      try {
        const [{ data: user }, { data: grants }] = await Promise.all([
          supabase.from('users').select('id, email, role').eq('id', userId).maybeSingle(),
          supabase.from('user_grants').select('customer_id').eq('user_id', userId),
        ])
        if (cancelled) return
        const rawRole = user?.role
        const nextRole: Role = ROLES.includes(rawRole as Role)
          ? (rawRole as Role)
          : 'customer_viewer'
        const customerIds = (grants ?? [])
          .map((g: { customer_id?: string | null }) => g.customer_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
        setRole(nextRole)
        setProfile({ id: userId, email: user?.email ?? email ?? '', role: nextRole, customerIds })
      } catch {
        if (!cancelled) setProfile({ id: userId, email: email ?? '', role: 'customer_viewer', customerIds: [] })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      if (!data.user) { setLoading(false); return }
      load(data.user.id, data.user.email)
    })
    return () => { cancelled = true }
  }, [])

  return { profile, role, loading, can: (p: Permission) => hasPermission(role, p) }
}

/** Tương thích ngược cho code cũ gọi can(role, allowed). */
export function can(role: Role, allowed: readonly Permission[]): boolean {
  return allowed.some((p) => hasPermission(role, p))
}
