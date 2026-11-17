import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value

  if (!accessToken) {
    return NextResponse.json({ error: 'No token' }, { status: 401 })
  }

  const supabase = getSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'No active session' }, { status: 401 })
  }

  return NextResponse.json({ user: session.user })
}

// Đăng nhập: nhận access_token từ client Supabase Auth, lưu thành cookie HttpOnly.
// Client KHÔNG tự ghi document.cookie (React 19 chặn mutate global + tránh lộ token cho JS).
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { access_token?: string }
  if (!body.access_token) {
    return NextResponse.json({ error: 'Missing access_token' }, { status: 400 })
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.getUser(body.access_token)
  if (error || !data.user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('sb-access-token', body.access_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 3600,
  })
  return response
}
