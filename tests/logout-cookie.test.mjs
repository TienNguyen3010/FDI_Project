// Regression: logout PHẢI xóa HttpOnly cookie `sb-access-token`.
// Root cause (2026-11-19): handleLogout chỉ gọi supabase.auth.signOut() (xóa localStorage)
// nên cookie HttpOnly mà proxy.ts/authorize.ts đọc vẫn còn → redirect loop /login→/dashboard
// + dashboard API trả 401 "Phiên đăng nhập không hợp lệ".
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const routePath = join(root, 'app/api/auth/logout/route.ts')
const bodyPath = join(root, 'components/ClientBody.tsx')

test('logout route tồn tại và xóa sb-access-token cookie', () => {
  assert.ok(existsSync(routePath), 'thiếu app/api/auth/logout/route.ts')
  const src = readFileSync(routePath, 'utf8')
  assert.match(src, /clearAccessTokenCookie/, 'logout route phải gọi clearAccessTokenCookie')
  assert.match(src, /auth\.signOut/, 'logout route phải gọi supabase.auth.signOut()')
})

test('ClientBody.handleLogout gọi logout API trước khi chuyển /login', () => {
  const src = readFileSync(bodyPath, 'utf8')
  assert.match(src, /['"]\/api\/auth\/logout['"]/, 'handleLogout phải POST /api/auth/logout')
  assert.match(src, /router\.(replace|push)\(['"]\/login['"]\)/, 'phải chuyển về /login sau logout')
})
