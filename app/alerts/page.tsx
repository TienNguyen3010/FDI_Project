'use client'

import { CrudPage, type CrudConfig } from '@/components/crud/CrudPage'
import { useProfile } from '@/lib/hooks/useProfile'

const config: CrudConfig = {
    title: "Cảnh báo & Sự cố",
    description: "Nhận, xử lý, đóng sự cố và SLA.",
    table: "alerts",

    statusField: "severity",
    editableBy: ['leader', 'manager'],
    displayField: "description",
    defaultSort: { column: "created_at", ascending: false },
    fields: [
      { key: "description", label: "Mô tả", type: "textarea", required: true },
      { key: "project_id", label: "ID dự án", type: "text", required: true },
      { key: "device_id", label: "ID thiết bị", type: "text" },
      { key: "site_id", label: "ID site", type: "text" },
      { key: "severity", label: "Mức độ", type: "select", required: true, options: [{ value: "critical", label: "Critical" }, { value: "major", label: "Major" }, { value: "minor", label: "Minor" }] },
      { key: "priority", label: "Ưu tiên", type: "select", options: [{ value: "low", label: "Thấp" }, { value: "medium", label: "Trung bình" }, { value: "high", label: "Cao" }, { value: "critical", label: "Khẩn cấp" }] },
      { key: "status", label: "Trạng thái", type: "select", options: [{ value: "new", label: "Mới" }, { value: "acknowledged", label: "Đã nhận" }, { value: "in_progress", label: "Đang xử lý" }, { value: "resolved", label: "Đã giải quyết" }, { value: "closed", label: "Đã đóng" }] },
      { key: "owner_id", label: "ID người xử lý", type: "text" },
      { key: "source", label: "Nguồn", type: "text" },
    ],
}

export default function Page() {
    const { role } = useProfile()
    return <CrudPage config={config} role={role} />
}
