// FDI_Project — Admin RBAC: GET/POST /api/admin/roles
// Duyệt scope admin.role_manage
// Theo spec ADM-02: roles list, matrix, create/edit, draft/publish

import { authorize } from '@/lib/auth/authorize'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const auth = await authorize('admin.role_manage')
  if (auth.ok === false) {
    return NextResponse.json(
      { error: 'forbidden', message: auth.message },
      { status: auth.status }
    )
  }

  const supabase = auth.supabase
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const state = searchParams.get('state') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? 25)))
  const sort = searchParams.get('sort') ?? 'updated_at'
  const order = searchParams.get('order') ?? 'desc'
  const direction = order === 'asc' ? 'asc' : 'desc'

  const { data, error, count } = await supabase
    .from('iam.roles')
    .select(
      `
      id,
      code,
      name,
      description,
      is_system,
      state,
      version,
      created_at,
      updated_at
    `,
      { count: 'exact' }
    )
    .ilike('code', `%${search}%`)
    .ilike('name', `%${search}%`)
    .not('is_system', 'eq', true)
    .order(sort as string, { ascending: direction === 'asc' })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (error) {
    return NextResponse.json(
      { error: 'db_error', message: error.message },
      { status: 500 }
    )
  }

  const roles = Array.isArray(data) ? data : []
  return NextResponse.json({
    items: roles,
    pagination: {
      page,
      pageSize,
      total: Number(count) ?? roles.length,
      totalPages: Math.ceil((Number(count) ?? roles.length) / pageSize),
    },
  })
}
