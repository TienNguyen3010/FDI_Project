'use client'

/**
 * Sửa khách hàng — `/customers/[id]`.
 *
 * Dữ liệu thật: fetch GET /api/v1/customers/[id] (RLS quyết định ai đọc được),
 * rồi truyền vào CreateCustomerForm chế độ `initial`. Không hardcode/bịa số.
 */
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, Skeleton } from '@/components/ui/ui'
import CreateCustomerForm, { type CustomerFormInitial } from '@/components/customers/CreateCustomerForm'
import { useProfile } from '@/lib/hooks/useProfile'
import { hasPermission } from '@/lib/rbac/policy'
import { useParams } from 'next/navigation'

type Detail = CustomerFormInitial & {
  consent_contact?: boolean | null
  contact_technical?: string | null
  contact_commercial?: string | null
  contact_emergency?: string | null
}

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { role, loading: roleLoading } = useProfile()
  const [initial, setInitial] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/customers/${id}`, { cache: 'no-store', signal })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
        setError(body?.error?.message ?? `Lỗi máy chủ (${res.status}).`)
        return
      }
      const json = (await res.json()) as { data: Detail }
      setInitial(json.data)
    } catch {
      if (!signal?.aborted) setError('Không tải được dữ liệu khách hàng.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const ctrl = new AbortController()
    void load(ctrl.signal)
    return () => ctrl.abort()
  }, [load])

  if (roleLoading || loading) {
    return (
      <div className="mx-auto w-full max-w-[1180px] p-4 md:p-6">
        <p className="mb-4 text-sm text-[var(--text-secondary)]">Đang tải dữ liệu…</p>
        <Card><CardContent className="space-y-3 p-5">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-10 w-1/2" />
        </CardContent></Card>
      </div>
    )
  }

  if (!hasPermission(role, 'customer.update')) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="font-medium text-[var(--text-primary)]">Không có quyền truy cập</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Chỉ vai trò có quyền sửa khách hàng mới mở được màn này.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="font-medium text-[var(--text-primary)]">Không tải được khách hàng</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!initial) return null

  return (
    <div className="p-4 md:p-6">
      <CreateCustomerForm initial={initial} />
    </div>
  )
}
