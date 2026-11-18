// FDI_Project — Server-side authorization helper (project_structure.md v2 §4).
// Không UI-only: mọi route handler gọi hàm này trước khi đọc/ghi dữ liệu nhạy cảm.
// Nguyên tắc (rbac_matrix v2 §1): deny by default; role + action + resource scope.
// JWT role chỉ là gợi ý — DB `users.role` là nguồn chân thực (tránh privilege stale).

import { cookies } from 'next/headers'
import { getSupabaseClient } from '@/lib/supabase/server'

export const ROLES = ['employee', 'leader', 'manager', 'director'] as const
export type Role = (typeof ROLES)[number]

export function isRole(v: unknown): v is Role {
  return typeof v === 'string' && (ROLES as readonly string[]).includes(v)
}

export function can(role: Role, allowed: readonly Role[]): boolean {
  return allowed.includes(role)
}

export interface Authorized {
  ok: true
  userId: string
  email: string
  role: Role
  supabase: ReturnType<typeof getSupabaseClient>
}
export interface Denied {
  ok: false
  status: number
  message: string
}

/**
 * Xác thực session + kiểm tra role theo danh sách cho phép.
 * - 401 nếu chưa đăng nhập / token không hợp lệ / chưa cấu hình Supabase (500).
 * - 403 nếu role không nằm trong `allowed`.
 * - Gắn session vào client để RLS nhận diện đúng user.
 */
export async function authorize(allowed: readonly Role[] = ROLES): Promise<Authorized | Denied> {
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

  // Best-effort: getUser đã verify chữ ký; setSession giúp query/insert đi với JWT.
  try {
    await supabase.auth.setSession({ access_token: token, refresh_token: '' })
  } catch {
    // bỏ qua — getUser ở trên đã đủ để tin identity
  }

  const user = authData.user
  const meta = (user.app_metadata ?? {}) as Record<string, unknown>
  const { data: profile } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', user.id)
    .maybeSingle()

  const role: Role = isRole(profile?.role)
    ? profile.role
    : isRole(meta.role ?? meta.app_role)
      ? (meta.role ?? meta.app_role) as Role
      : 'employee'

  if (!can(role, allowed)) {
    return { ok: false, status: 403, message: 'Không đủ quyền thực hiện thao tác này.' }
  }

  return {
    ok: true,
    userId: user.id,
    email: profile?.email ?? user.email ?? '',
    role,
    supabase,
  }
}
