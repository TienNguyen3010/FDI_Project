'use client'

import { CrudPage, type CrudConfig } from '@/components/crud/CrudPage'
import { useProfile } from '@/lib/hooks/useProfile'
import { ALERTS_CRUD_CONFIG } from '@/features/alerts/schema'

// P2 (project_structure.md): cấu hình domain nằm ở features/alerts/schema.ts.
// Domain config khai báo `as const` (readonly) → cast sang CrudConfig mutable.
// Giá trị runtime giữ nguyên 100% so với cấu hình cũ.
const config = ALERTS_CRUD_CONFIG as unknown as CrudConfig

export default function Page() {
  const { role } = useProfile()
  return <CrudPage config={config} role={role} />
}
