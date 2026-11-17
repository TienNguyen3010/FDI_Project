'use client'

import { CrudPage, type CrudConfig } from '@/components/crud/CrudPage'
import { useProfile } from '@/lib/hooks/useProfile'

const config: CrudConfig = {
    title: "Site Report",
    description: "Báo cáo khảo sát, triển khai và bảo trì.",
    table: "reports",

    editableBy: ['employee', 'leader', 'manager'],
    displayField: "type",
    defaultSort: { column: "created_at", ascending: false },
    fields: [
      { key: "project_id", label: "ID dự án", type: "text", required: true },
      { key: "user_id", label: "ID người lập", type: "text", required: true },
      { key: "type", label: "Loại", type: "select", required: true, options: [{ value: "survey", label: "Khảo sát" }, { value: "deployment", label: "Triển khai" }, { value: "maintenance", label: "Bảo trì" }] },
      { key: "content", label: "Nội dung", type: "textarea" },
      { key: "signature", label: "Chữ ký", type: "text" },
    ],
}

export default function Page() {
    const { role } = useProfile()
    return <CrudPage config={config} role={role} />
}
