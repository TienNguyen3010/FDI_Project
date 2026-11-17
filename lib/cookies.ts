// FDI_Project — cookie helpers (server)
import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'

const ACCESS_TOKEN = 'sb-access-token'

function setCookieHeader(value: string, maxAge: number): string {
  return `sb-access-token=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
}

export async function setAccessTokenCookie(token: string, res: NextResponse) {
  const store = await cookies()
  store.set(ACCESS_TOKEN, token, {
    path: '/',
    maxAge: 3600,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  res.headers.append(
    ACCESS_TOKEN,
    setCookieHeader(token, 3600)
  )
}

export async function getAccessTokenCookie(): Promise<string | undefined> {
  const store = await cookies()
  return store.get(ACCESS_TOKEN)?.value
}

export async function clearAccessTokenCookie(res: NextResponse) {
  const store = await cookies()
  store.set(ACCESS_TOKEN, '', { path: '/', maxAge: 0, sameSite: 'lax' })
  res.headers.append(
    ACCESS_TOKEN,
    setCookieHeader('', 0)
  )
}
