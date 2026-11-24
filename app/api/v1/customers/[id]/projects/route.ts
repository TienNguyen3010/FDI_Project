// Project OPS — GET /api/v1/customers/[id]/projects
//   Dự án + Site gắn với khách hàng, dùng cho right panel "Dự án của khách hàng".
//   RLS: đi qua scoped() theo customer_id (giống list customers) nên người
//   không có quyền đọc KH đó sẽ thấy rỗng, không lọt dữ liệu.
import { authorize } from '@/lib/auth/authorize'
import { apiError } from '@/lib/metrics/contract'
import { scoped } from '@/lib/metrics/queries'
import type { EffectiveScope } from '@/lib/metrics/contract'

interface Row {
  id: string
  name: string | null
  status: string | null
  progress: number | null
  site_id: string | null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorize('customer.read')
  if (!auth.ok) return apiError(auth.status, auth.message)

  const { id } = await params
  if (!id) return apiError(400, 'Thiếu mã khách hàng.')

  // Phạm vi giống list customers: global grant → null; còn lại lọc theo id được cấp.
  const isGlobal = auth.grants.some((g) => g.kind === 'global')
  const grantedIds = auth.grants
    .filter((g) => g.kind === 'customer' && typeof g.id === 'string' && g.id.length > 0)
    .map((g) => g.id as string)

  const scope: EffectiveScope = {
    requested_customer_id: id,
    customer_ids: isGlobal ? null : (grantedIds.length ? grantedIds : [id]),
    role: auth.role,
  }

  const res = await scoped(
    auth.supabase.from('projects').select('id, name, status, progress, site_id'),
    auth.supabase,
    scope,
  ).eq('customer_id', id)

  if (res.error) {
    return apiError(503, 'Không đọc được danh sách dự án của khách hàng.')
  }

  const rows = ((res.data ?? []) as Row[]).map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    // `progress` có thể null → trả null, client hiện '—' (KHÔNG bịa 0%).
    progress: typeof p.progress === 'number' ? p.progress : null,
    site_id: p.site_id,
  }))

  return Response.json({ data: rows })
}
