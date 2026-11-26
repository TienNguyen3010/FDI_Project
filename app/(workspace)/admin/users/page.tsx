// FDI_Project — ADM-01: /admin/users (users CRUD)
// Uses CrudPage with users table; members of super_admin / director / manager / project_manager can manage.

import { CrudPage, type CrudConfig } from '@/components/crud/CrudPage'
import { useProfile } from '@/lib/hooks/useProfile'

const config: CrudConfig = {
  title: 'Người dùng',
  description: 'Quản lý người dùng, team và cấu hình hệ thống.',
  table: 'users',

  statusField: 'role',
  editableBy: ['super_admin', 'director', 'manager', 'project_manager'],
  displayField: 'email',
  defaultSort: { column: 'created_at', ascending: false },
  fields: [
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'role', label: 'Vai trò', type: 'select', required: true, options: [
      { value: 'employee', label: 'Employee' },
      { value: 'leader', label: 'Leader' },
      { value: 'manager', label: 'Manager' },
      { value: 'director', label: 'Director' },
      { value: 'super_admin', label: 'Super Admin' },
    ]},
    { key: 'team', label: 'Team', type: 'text' },
    { key: 'active', label: 'Kích hoạt', type: 'select', options: [
      { value: 'true', label: 'Có' },
      { value: 'false', label: 'Không' },
    ]},
  ],
}

export default function UsersPage() {
  const { role, loading: profileLoading } = useProfile()
  return <CrudPage config={config} role={role} />
}
