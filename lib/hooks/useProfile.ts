'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type Role = 'employee' | 'leader' | 'manager' | 'director'

const ROLES: Role[] = ['employee', 'leader', 'manager', 'director']

function isRole(v: unknown): v is Role {
  return typeof v === 'string' && (ROLES as string[]).includes(v)
}

export interface Profile {
  id: string
  email: string
  role: Role
  team: string | null
}

/**
 * Lấy role/email của user hiện tại từ bảng `users` (khớp auth.uid()).
 * - Không throw khi chưa đăng nhập / chưa có DB: trả role mặc định 'employee'.
 * - Dùng cho RBAC mềm (ẩn menu, khóa nút). RBAC cứng nằm ở RLS/middleware.
 */
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [role, setRole] = useState<Role>('employee')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load(userId: string, email: string | undefined) {
      try {
        const { data } = await supabase
          .from('users')
          .select('id, email, role, team')
          .eq('id', userId)
          .maybeSingle()
        if (cancelled) return
        const nextRole = isRole(data?.role) ? data.role : 'employee'
        setRole(nextRole)
        setProfile({
          id: userId,
          email: data?.email ?? email ?? '',
          role: nextRole,
          team: data?.team ?? null,
        })
      } catch {
        if (!cancelled) setProfile({ id: userId, email: email ?? '', role: 'employee', team: null })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      if (!data.user) {
        setLoading(false)
        return
      }
      load(data.user.id, data.user.email)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return { profile, role, loading }
}

/** Kiểm tra role có trong danh sách được phép hay không. */
export function can(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role)
}
