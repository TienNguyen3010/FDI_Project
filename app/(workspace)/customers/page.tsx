'use client'

import { CrudPage, type CrudConfig } from '@/components/crud/CrudPage'
import { useProfile } from '@/lib/hooks/useProfile'

const config: CrudConfig = {
    title: "Khách hàng",
    description: "Hồ sơ khách hàng, liên hệ kỹ thuật/thương mại/khẩn cấp.",
    table: "customers",

    editableBy: ['project_manager', 'director', 'super_admin'],
    displayField: "name",
    createHref: "/customers/new",
    defaultSort: { column: "created_at", ascending: false },
    fields: [
      { key: "name", label: "Tên khách hàng", type: "text", required: true },
      { key: "phone", label: "Điện thoại", type: "text" },
      { key: "email", label: "Email", type: "email" },
      { key: "industry", label: "Ngành", type: "text" },
      { key: "contact_technical", label: "Liên hệ kỹ thuật", type: "text" },
      { key: "contact_commercial", label: "Liên hệ thương mại", type: "text" },
      { key: "contact_emergency", label: "Liên hệ khẩn cấp", type: "text" },
      { key: "created_at", label: "Ngày tạo", type: "date", hiddenInTable: true },
    ],
}

export default function Page() {
    const { role } = useProfile()
    return <CrudPage config={config} role={role} />
}
