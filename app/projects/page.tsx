'use client'

import { CrudPage, type CrudConfig } from '@/components/crud/CrudPage'
import { useProfile } from '@/lib/hooks/useProfile'

const config: CrudConfig = {
    title: "Dự án",
    description: "Dự án triển khai, tiến độ và trạng thái.",
    table: "projects",

    statusField: "status",
    editableBy: ['leader', 'manager', 'director'],
    displayField: "name",
    defaultSort: { column: "created_at", ascending: false },
    fields: [
      { key: "name", label: "Tên dự án", type: "text", required: true },
      { key: "customer_id", label: "ID khách hàng", type: "text", required: true },
      { key: "site_id", label: "ID site", type: "text" },
      { key: "status", label: "Trạng thái", type: "select", options: [{ value: "planned", label: "Đã lên lịch" }, { value: "in_progress", label: "Đang chạy" }, { value: "deployed", label: "Đã triển khai" }, { value: "paused", label: "Tạm dừng" }, { value: "ended", label: "Kết thúc" }] },
      { key: "start_date", label: "Bắt đầu", type: "date" },
      { key: "end_date", label: "Kết thúc", type: "date" },
      { key: "progress", label: "Tiến độ (%)", type: "number" },
      { key: "pm_id", label: "ID PM", type: "text" },
      { key: "color", label: "Màu", type: "text", hiddenInTable: true },
    ],
}

export default function Page() {
    const { role } = useProfile()
    return <CrudPage config={config} role={role} />
}
