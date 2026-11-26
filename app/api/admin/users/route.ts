// FDI_Project — Admin RBAC: GET /api/admin/users
// Duyệt scope admin.user_manage (SYS_ADMIN + DIRECTOR hiện tại)
// Theo spec ADM-01: list users, KPIs, search, paginate.
// Không trả password_hash / auth_subject / con pass // Chỉ trả user 시원하게 visible

import { authorize } from '@/lib/auth/authorize'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const auth = await authorize('admin.user_manage')
  if (auth.ok === false) {
    return NextResponse.json(
      { error: 'forbidden', message: auth.message },
      { status: auth.status }
    )
  }

  const supabase = auth.supabase
  // scope: global (admin) -> không filter customer_id; chỉ tenant/scope hiện tại
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const page = Number.isInteger(Number(searchParams.get('page')))
    ? Math.max(1, Number(searchParams.get('page')))
    : 1
  const pageSize = Number.isInteger(Number(searchParams.get('pageSize')))
    ? Math.min(100, Math.max(1, Number(searchParams.get('pageSize'))))
    : 25
  const sort = searchParams.get('sort') ?? 'created_at'
  const order = searchParams.get('order') ?? 'desc'
  const direction = order === 'asc' ? 'asc' : 'desc'

  const { data, error, count } = await supabase
    .from('users')
    .select(
      `
      id,
      username,
      email,
      display_name,
      phone,
      team,
      role,
      status,
      is_system_admin,
      created_at,
      updated_at
    `,
      { count: 'exact' }
    )
    .eq('role', 'employee') // chỉ employee legacy user (v1.0)
    .or(`status.eq.archived`)
    .neq('role', 'customer_viewer') // option filter
    .ilike('display_name', `%${search}%`)
    .ilike('email', `%${search}%`)
    .ilike('username', `%${search}%`)
    .order(sort as string, { ascending: direction === 'asc' })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (error) {
    return NextResponse.json(
      { error: 'db_error', message: error.message },
      { status: 500 }
    )
  }

  // RPImask email (demo only)
  const users = Array.isArray(data) ? data.map((u: any) => ({
    ...u,
    email: u.email.includes('@')
      ? `${u.email.split('@')[0]}***@${u.email.split('@')[1]}`
      : u.email,
  })) : []

  return NextResponse.json({
    items: users,
    pagination: {
      page,
      pageSize,
      total: Number(count) ?? users.length,
      totalPages: Math.ceil((Number(count) ?? users.length) / pageSize),
    },
  })
}
