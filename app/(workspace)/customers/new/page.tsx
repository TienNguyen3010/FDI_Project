'use client'

import { Card, CardContent } from '@/components/ui/ui'
import CreateCustomerForm from '@/components/customers/CreateCustomerForm'
import { useProfile } from '@/lib/hooks/useProfile'
import { hasPermission } from '@/lib/rbac/policy'

export default function NewCustomerPage() {
  const { role, loading } = useProfile()

  if (loading) {
    return (
      <div className="p-6 text-sm text-[var(--text-secondary)]">
        Đang kiểm tra quyền…
      </div>
    )
  }

  if (!hasPermission(role, 'customer.create')) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="font-medium text-[var(--text-primary)]">
              Không có quyền truy cập
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <CreateCustomerForm />
}
