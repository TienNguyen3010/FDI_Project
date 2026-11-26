// FDI_Project — ADM-04: /admin/audit (permission audit log)
// Server Component; requires admin.audit_read permission.

import { CrudPage, type CrudConfig } from '@/components/crud/CrudPage'
import { useProfile } from '@/lib/hooks/useProfile'

const config: CrudConfig = {
  title: 'Nhật ký quyền',
  description: 'Danh sách các thao tác quản trị và kết quả điều chỉnh (ADM-04).',
  table: 'iam.permission_audit',

  statusField: 'outcome',
  editableBy: ['super_admin', 'director', 'manager', 'project_manager'],
  displayField: 'occurred_at',
  defaultSort: { column: 'occurred_at', ascending: false },
  fields: [
    { key: 'occurred_at', label: 'Thời gian', type: 'text' },
    { key: 'action', label: 'Hành động', type: 'text' },
    { key: 'target_type', label: 'Nguồn', type: 'text' },
    { key: 'target_id', label: 'Đối tượng', type: 'text' },
    { key: 'outcome', label: 'Kết quả', type: 'text' },
    { key: 'reason', label: 'Ghi chú', type: 'text' },
  ],
}

export default function AuditPage() {
  const { role } = useProfile()
  return <CrudPage config={config} role={role ?? null} />
}
