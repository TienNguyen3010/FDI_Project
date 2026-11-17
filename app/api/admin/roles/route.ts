// FDI_Project — §4 #11: Export/Import cấu hình quyền (role config).
// GET  /api/admin/roles → export JSON: danh sách user (role/team/active) + ma trận quyền.
// POST /api/admin/roles → import: validate + upsert theo email, ghi audit_logs.
// Phân quyền cứng: CHỈ manager/director (403 cho role khác, 401 nếu chưa đăng nhập).
//
// Ghi chú bảo mật:
// - Role được lấy từ app_metadata trong JWT, sau đó ĐỐI CHIẾU LẠI bảng users
//   (nguồn chân thực). DB là authoritative: JWT cũ không thể giữ quyền đã bị thu hồi.
// - Không có SUPABASE_SERVICE_ROLE_KEY trong dự án; audit được ghi bằng client anon
//   có gắn session của người dùng (RLS: audit_logs INSERT WITH CHECK(TRUE)).
// - Không lưu credential vào file.

import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/server'
import { ROLE_MATRIX } from '@/lib/role-matrix'

// Không khai báo dynamic='force-dynamic': xung đột nextConfig.cacheComponents.
// Route đọc cookie/DB → vẫn chạy lúc request nhờ Cache Components.

const ROLES = ['employee', 'leader', 'manager', 'director'] as const
type Role = (typeof ROLES)[number]
const RANK: Record<Role, number> = { employee: 1, leader: 2, manager: 3, director: 4 }

function isRole(v: unknown): v is Role {
  return typeof v === 'string' && (ROLES as readonly string[]).includes(v)
}

/** Ma trận quyền — sao chép trung thực từ docs/rbac_matrix.md §3. */

type DbClient = ReturnType<typeof getSupabaseClient>

interface Authorized {
  ok: true
  userId: string
  email: string
  role: Role
  supabase: DbClient
}
interface Denied {
  ok: false
  status: number
  message: string
}

/** Xác thực JWT + kiểm tra role manager/director. Gắn session để RLS thấy đúng user. */
async function authorize(): Promise<Authorized | Denied> {
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value
  if (!token) return { ok: false, status: 401, message: 'Chưa đăng nhập.' }

  let supabase: DbClient
  try {
    supabase = getSupabaseClient()
  } catch {
    return { ok: false, status: 500, message: 'Chưa cấu hình Supabase.' }
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) {
    return { ok: false, status: 401, message: 'Phiên đăng nhập không hợp lệ.' }
  }

  // Gắn session vào client để mọi query/insert đi với JWT (RLS nhận diện được user).
  // refresh_token để trống là chủ đích: access token còn hạn nên GoTrue không refresh.
  try {
    await supabase.auth.setSession({ access_token: token, refresh_token: '' })
  } catch {
    // best-effort: nếu setSession thất bại vẫn tiếp tục; getUser ở trên đã verify chữ ký.
  }

  const user = authData.user
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>
  const jwtRoleRaw = appMeta.role ?? appMeta.app_role

  // DB là nguồn chân thực: JWT cũ (role đã nâng/hạ) không được giữ quyền stale.
  const { data: profile } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', user.id)
    .maybeSingle()

  const dbRole = isRole(profile?.role) ? profile.role : null
  const jwtRole = isRole(jwtRoleRaw) ? jwtRoleRaw : null
  const role: Role = dbRole ?? jwtRole ?? 'employee'

  if (role !== 'manager' && role !== 'director') {
    return {
      ok: false,
      status: 403,
      message: 'Không đủ quyền: chỉ Manager/Director được export/import cấu hình quyền.',
    }
  }

  return {
    ok: true,
    userId: user.id,
    email: profile?.email ?? user.email ?? '',
    role,
    supabase,
  }
}

/** Ghi audit best-effort — không được làm thất bại thao tác import. */
async function writeAudit(
  supabase: DbClient,
  userId: string,
  request: NextRequest,
  resourceId: string | null
) {
  try {
    await supabase.from('audit_logs').insert({
      id: crypto.randomUUID(),
      user_id: userId,
      action: 'UPDATE',
      resource_type: 'users_role_config',
      resource_id: resourceId,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      user_agent: request.headers.get('user-agent') ?? null,
    })
  } catch {
    // Audit là best-effort (xem lib/audit.ts).
  }
}

// ---------------------------------------------------------------------------
// GET — export
// ---------------------------------------------------------------------------
export async function GET() {
  const auth = await authorize()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { data, error } = await auth.supabase
    .from('users')
    .select('id, email, role, team, active')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: `Không đọc được danh sách user: ${error.message}` }, { status: 500 })
  }

  const payload = {
    schema: 'fdi-role-config',
    version: 1,
    exported_at: new Date().toISOString(),
    roles: ROLES,
    roleMatrix: ROLE_MATRIX,
    users: (data ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      team: u.team,
      active: u.active,
    })),
  }

  return NextResponse.json(payload, {
    headers: {
      'Content-Disposition': `attachment; filename="fdi-role-config-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}

// ---------------------------------------------------------------------------
// POST — import
// ---------------------------------------------------------------------------
interface ImportRow {
  id?: unknown
  email?: unknown
  role?: unknown
  team?: unknown
  active?: unknown
}

export async function POST(request: NextRequest) {
  const auth = await authorize()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const body = await request.json().catch(() => null) as { users?: unknown } | null
  if (!body || !Array.isArray(body.users)) {
    return NextResponse.json({ error: 'Body phải có dạng { users: [...] }.' }, { status: 400 })
  }
  if (body.users.length === 0) {
    return NextResponse.json({ error: 'Danh sách users trống.' }, { status: 400 })
  }
  if (body.users.length > 500) {
    return NextResponse.json({ error: 'Giới hạn tối đa 500 user mỗi lần import.' }, { status: 400 })
  }

  // --- Validate từng dòng ---
  const invalid: string[] = []
  const normalized: { id: string | null; email: string; role: Role; team: string | null; active: boolean }[] = []
  for (const [i, rawItem] of (body.users as ImportRow[]).entries()) {
    const raw = rawItem && typeof rawItem === 'object' ? rawItem : {}
    const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : ''
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null
    if (!email && !id) {
      invalid.push(`users[${i}]: cần email hoặc id`)
      continue
    }
    if (!isRole(raw.role)) {
      invalid.push(`users[${i}]: role phải là ${ROLES.join('|')}`)
      continue
    }
    normalized.push({
      id,
      email,
      role: raw.role,
      team: typeof raw.team === 'string' && raw.team.trim() ? raw.team.trim() : null,
      active: typeof raw.active === 'boolean' ? raw.active : true,
    })
  }
  if (invalid.length > 0) {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ.', invalid }, { status: 400 })
  }

  // Chỉ update user ĐÃ TỒN TẠI. Không tạo user mới vì bảng users yêu cầu
  // password_hash NOT NULL — tạo mới phải qua màn hình Quản trị (có đặt mật khẩu).
  const { data: existing, error: readError } = await auth.supabase
    .from('users')
    .select('id, email, role')
  if (readError) {
    return NextResponse.json({ error: `Không đọc được users: ${readError.message}` }, { status: 500 })
  }

  const byEmail = new Map((existing ?? []).map((u) => [u.email.toLowerCase(), u]))
  const skipped: { email: string; reason: string }[] = []
  const toUpsert: { email: string; role: Role; team: string | null; active: boolean }[] = []

  for (const row of normalized) {
    const found = byEmail.get(row.email) ??
      (row.id ? (existing ?? []).find((u) => u.id === row.id) : undefined)
    if (!found) {
      skipped.push({ email: row.email || row.id || '(unknown)', reason: 'User chưa tồn tại — tạo qua màn hình Quản trị' })
      continue
    }
    // Không tự hạ quyền của chính mình (manager/director).
    if (found.id === auth.userId && RANK[row.role] < RANK[auth.role]) {
      skipped.push({ email: row.email, reason: 'Không thể tự hạ quyền của chính mình' })
      continue
    }
    toUpsert.push({
      email: found.email,
      role: row.role,
      team: row.team,
      active: row.active,
    })
  }

  if (toUpsert.length === 0) {
    await writeAudit(auth.supabase, auth.userId, request, null)
    return NextResponse.json({ updated: 0, skipped, total: normalized.length })
  }

  // Upsert theo email (onConflict). Các email đã tồn tại → UPDATE đúng 4 cột,
  // password_hash của user cũ được giữ nguyên.
  // Cast "untyped" có chủ đích: Insert type yêu cầu password_hash cho bản ghi MỚI,
  // nhưng ở đây mọi dòng đều là conflict (đã tồn tại) nên không cần trường đó.
  const db = auth.supabase as unknown as {
    from: (table: string) => {
      upsert: (
        rows: Record<string, unknown>[],
        options: { onConflict: string }
      ) => Promise<{ error: { message: string } | null }>
    }
  }
  const { error: upsertError } = await db
    .from('users')
    .upsert(toUpsert as unknown as Record<string, unknown>[], { onConflict: 'email' })

  if (upsertError) {
    return NextResponse.json(
      { error: `Import thất bại: ${upsertError.message}` },
      { status: 500 }
    )
  }

  await writeAudit(auth.supabase, auth.userId, request, null)

  return NextResponse.json({
    updated: toUpsert.length,
    skipped,
    total: normalized.length,
  })
}
