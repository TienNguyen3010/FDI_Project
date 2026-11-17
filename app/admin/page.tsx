'use client'

import { CrudPage, type CrudConfig } from '@/components/crud/CrudPage'
import { useProfile } from '@/lib/hooks/useProfile'

const config: CrudConfig = {
    title: "Quản trị",
    description: "Quản lý người dùng, team và cấu hình hệ thống.",
    table: "users",

    statusField: "role",
    editableBy: ['manager', 'director'],
    displayField: "email",
    defaultSort: { column: "created_at", ascending: false },
    fields: [
      { key: "email", label: "Email", type: "email", required: true },
      { key: "role", label: "Vai trò", type: "select", required: true, options: [{ value: "employee", label: "Employee" }, { value: "leader", label: "Leader" }, { value: "manager", label: "Manager" }, { value: "director", label: "Director" }] },
      { key: "team", label: "Team", type: "text" },
      { key: "active", label: "Kích hoạt", type: "select", options: [{ value: "true", label: "Có" }, { value: "false", label: "Không" }] },
    ],
}

export default function Page() {
    const { role } = useProfile()
    return <CrudPage config={config} role={role} />
}
