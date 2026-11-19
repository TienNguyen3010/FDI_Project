import { NextResponse } from 'next/server'
import { clearAccessTokenCookie } from '@/lib/cookies'
import { getSupabaseClient } from '@/lib/supabase/server'

/**
 * POST /api/auth/logout — đăng xuất phía server.
 *
 * Root cause fix (2026-11-19): client-only `supabase.auth.signOut()` chỉ xoá
 * localStorage; HttpOnly cookie `sb-access-token` (do /api/auth/session set)
 * vẫn còn → proxy.ts vẫn thấy user và redirect /login → /dashboard, trong khi
 * dashboard API dùng token đã revoke → 401 "Phiên đăng nhập không hợp lệ".
 * Route này xoá cookie TRƯỚC khi client chuyển hướng.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true })
  try {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
  } catch {
    // Vẫn xoá cookie ngay cả khi GoTrue signOut lỗi (token có thể đã hết hạn).
  }
  await clearAccessTokenCookie(response)
  return response
}
