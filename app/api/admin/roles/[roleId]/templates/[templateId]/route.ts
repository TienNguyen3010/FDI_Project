// FDI_Project — Admin RBAC: GET /api/admin/roles/[roleId]/templates/[templateId]
// Duyệt scope admin.role_manage + role.has(template)
// Theo spec ADM-03: chi tiết + so sánh so với phần trước

import { authorize } from '@/lib/auth/authorize'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roleId: string; templateId: string }> }
) {
  const auth = await authorize('admin.role_manage')
  if (auth.ok === false) {
    return NextResponse.json(
      { error: 'forbidden', message: auth.message },
      { status: auth.status }
    )
  }

  const { roleId, templateId } = await params
  if (!roleId || !templateId) {
    return NextResponse.json({ error: 'id missing' }, { status: 400 })
  }

  const supabase = auth.supabase
  const { data, error } = await supabase
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
      updated_at,
      owner:users (id, display_name, email)
    `
    )
    .eq('owner_id', roleId)
    .eq('id', templateId)
    .single()

  if (error) {
    if ((error as { code: string }).code === 'PGRST116') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'db_error', message: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ item: data })
}
