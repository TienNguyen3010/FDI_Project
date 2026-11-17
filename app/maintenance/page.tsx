'use client'

import { CrudPage, type CrudConfig } from '@/components/crud/CrudPage'
import { useProfile } from '@/lib/hooks/useProfile'

const config: CrudConfig = {
    title: "Bảo trì",
    description: "Lịch bảo trì định kỳ và đột xuất.",
    table: "maintenances",

    statusField: "status",
    editableBy: ['leader', 'manager'],
    displayField: "id",
    defaultSort: { column: "due_date", ascending: false },
    fields: [
      { key: "project_id", label: "ID dự án", type: "text", required: true },
      { key: "device_id", label: "ID thiết bị", type: "text" },
      { key: "type", label: "Loại", type: "select", options: [{ value: "regular", label: "Định kỳ" }, { value: "emergency", label: "Đột xuất" }] },
      { key: "due_date", label: "Ngày đến hạn", type: "date" },
      { key: "status", label: "Trạng thái", type: "text" },
      { key: "result", label: "Kết quả", type: "textarea" },
    ],
}

export default function Page() {
    const { role } = useProfile()
    return <CrudPage config={config} role={role} />
}
