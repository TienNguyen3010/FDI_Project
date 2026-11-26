// FDI_Project — ADM-03: /admin/templates (permission templates list)
// 'use client' — CrudPage + useProfile() are client components; server component
// cannot call a client hook directly.

'use client'

import { useProfile } from '@/lib/hooks/useProfile'
import { CrudPage, type CrudConfig } from '@/components/crud/CrudPage'

const config: CrudConfig = {
  title: 'Bộ Quyền Mẫu',
  description: 'Quản lý bộ quyền mẫu, publish và so sánh phiên bản.',
  table: 'iam.permission_templates',

  statusField: 'state',
  editableBy: ['super_admin', 'director', 'manager', 'project_manager'],
  displayField: 'code',
  defaultSort: { column: 'updated_at', ascending: false },
  fields: [
    { key: 'code', label: 'Mã template', type: 'text', required: true },
    { key: 'name', label: 'Tên', type: 'text', required: true },
    { key: 'description', label: 'Mô tả', type: 'textarea' },
    { key: 'state', label: 'Trạng thái', type: 'select', required: true, options: [
      { value: 'draft', label: 'Draft' },
      { value: 'published', label: 'Published' },
      { value: 'retired', label: 'Retired' },
    ]},
    { key: 'owner_id', label: 'Owner ID', type: 'text' },
  ],
}

export default function TemplatesPage() {
  const { role } = useProfile()
  return <CrudPage config={config} role={role} />
}
