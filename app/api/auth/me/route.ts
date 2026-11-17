import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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