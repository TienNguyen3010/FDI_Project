// FDI_Project — Admin RBAC: GET/POST /api/admin/permission-audit
// Duyệt scope admin.audit_read
// Theo spec ADM-04: read-only audit log, before/after, pagination, export async

import { authorize } from '@/lib/auth/authorize'
import { NextResponse } from 'next/server'
import { NextFetchEvent, NextRequest } from 'next/server'

// Simple in-memory export queue for demo; production: use Redis / DB job table
const exportQueue: Array<{ id: string; userId: string; filter: string; format: string; status: string; url?: string }> = []

export async function GET(request: Request) {
  const auth = await authorize('admin.audit_read')
  if (auth.ok === false) {
    return NextResponse.json(
      { error: 'forbidden', message: auth.message },
      { status: auth.status }
    )
  }

  const supabase = auth.supabase
  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start') ?? ''
  const end = searchParams.get('end') ?? ''
  const action = searchParams.get('action') ?? ''
  const targetType = searchParams.get('target_type') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? 25)))
  const sort = searchParams.get('sort') ?? 'occurred_at'
  const order = searchParams.get('order') ?? 'desc'
  const direction = order === 'asc' ? 'asc' : 'desc'

  const q = supabase.from('iam.permission_audit').select(
    `
    id,
    occurred_at,
    action,
    target_type,
    target_id,
    outcome,
    reason,
    request_id,
    policy_version,
    before_redacted,
    after_redacted,
    metadata_redact
  `,
    { count: 'exact' }
  )

  if (start) q.gte('occurred_at', new Date(start).toISOString())
  if (end) q.lte('occurred_at', new Date(end).toISOString())
  if (action) q.eq('action', action)
  if (targetType) q.eq('target_type', targetType)

  const { data, error, count: cnt } = await q
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
