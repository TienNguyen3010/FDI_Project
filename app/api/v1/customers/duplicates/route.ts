// Project OPS — GET /api/v1/customers/duplicates
//   P0-4: tra cứu khách hàng trùng (tax_id / email / phone) bằng RPC server-side
//   `fdi_find_customer_duplicates` (migration 016). RPC tự rào theo fdi_can_read
//   nên không lộ KH ngoài phạm vi.
//
//   Query: ?email=&phone=&tax_id=&exclude_id=
//   Trả { data: [{id, code, name, phone, email, tax_id, match_on}] }
//   Không có gì để tra → data = [] (form hiện "Chưa nhập thông tin để kiểm tra").
import { authorize } from '@/lib/auth/authorize'
import { apiError } from '@/lib/metrics/contract'

export async function GET(request: Request) {
  const auth = await authorize('customer.read')
  if (!auth.ok) return apiError(auth.status, auth.message)

  const url = new URL(request.url)
  const email = (url.searchParams.get('email') ?? '').trim()
  const phone = (url.searchParams.get('phone') ?? '').trim()
  const taxId = (url.searchParams.get('tax_id') ?? '').trim()
  const excludeRaw = (url.searchParams.get('exclude_id') ?? '').trim()

  // Chưa có dữ liệu để tra → trả rỗng, KHÔNG cảnh báo giả.
  if (!email && !phone && !taxId) {
    return Response.json({ data: [] })
  }

  // exclude_id phải là UUID hợp lệ; sai định dạng → bỏ qua thay vì lỗi 500.
  const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  const excludeId = excludeRaw && isUuid(excludeRaw) ? excludeRaw : null

  // `fdi_find_customer_duplicates` là hàm mới (migration 016) chưa có trong
  // Database['public']['Functions'] → gọi qua client động, đúng pattern repo dùng.
  const db = auth.supabase as unknown as {
    rpc: (
      fn: 'fdi_find_customer_duplicates',
      args: { p_email: string | null; p_phone: string | null; p_tax_id: string | null; p_exclude_id: string | null },
    ) => Promise<{ data?: unknown[] | null; error?: { message?: string } | null }>
  }
  const { data, error } = await db.rpc('fdi_find_customer_duplicates', {
    p_email: email || null,
    p_phone: phone || null,
    p_tax_id: taxId || null,
    p_exclude_id: excludeId,
  })

  if (error) {
    return apiError(503, 'Không tra cứu được khách hàng trùng.')
  }

  const rows = Array.isArray(data) ? (data as DuplicateRow[]) : []
  return Response.json({ data: rows })
}

interface DuplicateRow {
  id: string
  code: string | null
  name: string | null
  phone: string | null
  email: string | null
  tax_id: string | null
  match_on: string | null
}
