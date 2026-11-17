import { NextRequest, NextResponse } from 'next/server'
import { RATE_LIMIT_HEADERS } from '@/lib/rate-limit'
import { checkRateLimitDistributed } from '@/lib/rate-limit-redis'

// FDI_Project — Edge Proxy (Next.js 16): bảo vệ route
// Verify token với Supabase Auth (GoTrue tự kiểm tra chữ ký HMAC).
// Token giả / hết hạn → 401 → redirect login.

const CACHE_TTL_MS = 5 * 60 * 1000
const tokenCache = new Map<string, { valid: boolean; at: number }>()

// Rate limit: 100 req / 60s cho mỗi IP theo prefix route.
// Dùng Upstash Redis khi có env (atomic, share mọi isolate); fallback in-memory khi chưa có.
const RATE_LIMIT = 100
const RATE_WINDOW_MS = 60_000

function cacheGet(token: string): boolean | null {
  const hit = tokenCache.get(token)
  if (!hit) return null
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    tokenCache.delete(token)
    return null
  }
  return hit.valid
}

function cacheSet(token: string, valid: boolean) {
  if (tokenCache.size > 500) {
    const first = tokenCache.keys().next().value
    if (first) tokenCache.delete(first)
  }
  tokenCache.set(token, { valid, at: Date.now() })
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const json = atob(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

function isTokenPlausible(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload) return false
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) return false
  if (payload.role !== 'authenticated' && payload.role !== 'anon') return false
  if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) return false
  return true
}

async function verifyWithSupabase(token: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return false
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })
    return res.ok
  } catch {
    return false
  }
}

async function isAuthenticated(token: string | undefined): Promise<boolean> {
  if (!token) return false
  if (!isTokenPlausible(token)) return false
  const cached = cacheGet(token)
  if (cached !== null) return cached
  const valid = await verifyWithSupabase(token)
  cacheSet(token, valid)
  return valid
}

export async function proxy(request: NextRequest) {
  // DD C-09: /api/v1 là contract prefix chuẩn (api_spec/tech_spec), code nội bộ
  // vẫn dùng /api/*. Rewrite internal — browser/client thấy /api/v1, không redirect.
  // Ví dụ: GET /api/v1/auth/session -> /api/auth/session.
  if (request.nextUrl.pathname === '/api/v1' || request.nextUrl.pathname.startsWith('/api/v1/')) {
    const url = request.nextUrl.clone()
    url.pathname = url.pathname.replace(/^\/api\/v1(?=\/|$)/, '/api')
    return NextResponse.rewrite(url)
  }

  const response = NextResponse.next()
  const { pathname } = request.nextUrl

  // --- Rate limit: áp dụng cho /api/* và các route protected (bỏ qua static/_next) ---
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.') // file tĩnh có đuôi (png, css, js, svg, ...)

  if (!isStaticAsset) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon'
    // Prefix: /api/<seg> hoặc segment đầu của route protected, để không giới hạn
    // chung một bucket cho toàn bộ app.
    const segments = pathname.split('/').filter(Boolean)
    const prefix = pathname.startsWith('/api/') ? `/api/${segments[1] ?? ''}` : `/${segments[0] ?? ''}`
    const result = await checkRateLimitDistributed(`${ip}:${prefix}`, RATE_LIMIT, RATE_WINDOW_MS)
    const headers = RATE_LIMIT_HEADERS(result, RATE_LIMIT)

    if (!result.allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' } },
        { status: 429, headers: { ...headers, 'Retry-After': String(result.retryAfter) } }
      )
    }
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
  }

  const accessToken = request.cookies.get('sb-access-token')?.value
  const user = await isAuthenticated(accessToken)

  const protectedRoutes = [
    '/dashboard', '/customers', '/projects', '/devices',
    '/alerts', '/maintenance', '/reports', '/admin',
  ]

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('callbackUrl', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // RBAC cứng tầng edge: /admin chỉ cho manager + director.
  // Role lấy từ app_metadata trong JWT; token đã được verify ở isAuthenticated.
  if (user && pathname.startsWith('/admin')) {
    const payload = decodeJwtPayload(accessToken!)
    const appMeta = payload?.app_metadata as Record<string, unknown> | undefined
    const rawRole = appMeta?.role
    if (rawRole !== 'manager' && rawRole !== 'director') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  const publicRoutes = ['/login', '/auth/callback']
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (isPublicRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api/_backend|_next/static|_next/image|favicon.ico).*)',
  ],
}
