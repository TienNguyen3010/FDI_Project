// FDI_Project — Admin RBAC: GET /api/admin/roles/[roleId]/templates
// Duyệt scope admin.role_manage + role.has(template)
// Theo spec ADM-03: templates thuộc role, so sánh version

import { authorize } from '@/lib/auth/authorize'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const auth = await authorize('admin.role_manage')
  if (auth.ok === false) {
    return NextResponse.json(
      { error: 'forbidden', message: auth.message },
      { status: auth.status }
    )
  }

  const { roleId } = await params
  if (!roleId) {
    return NextResponse.json({ error: 'id missing' }, { status: 400 })
  }

  const supabase = auth.supabase
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? 25)))
  const sort = searchParams.get('sort') ?? 'version'
  const order = searchParams.get('order') ?? 'desc'
  const direction = order === 'asc' ? 'asc' : 'desc'

  // scope: template thuộc role hiện tại — nhóm theo role + cài đặt
  const { data, error, count: cnt } = await supabase
    .from('iam.permission_templates')
    .select(
      `
      id,
      code,
      name,
      description,
      version,
      state,
      created_at,
      updated_at
    `,
      { count: 'exact' }
    )
    .eq('owner_id', roleId)
    .not('state', 'in', '["retired"]')
    .order(sort as string, { ascending: direction === 'asc' })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (error) {
    return NextResponse.json(
      { error: 'db_error', message: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    items: Array.isArray(data) ? data : [],
    pagination: {
      page,
      pageSize,
      total: Number(cnt) ?? 0,
      totalPages: Math.ceil((Number(cnt) ?? 0) / pageSize),
    },
  })
}
