'use client'

import { CrudPage, type CrudConfig } from '@/components/crud/CrudPage'
import { useProfile } from '@/lib/hooks/useProfile'

const config: CrudConfig = {
    title: "Thiết bị",
    description: "Serial, rack, bảo hành và trạng thái thiết bị.",
    table: "devices",

    statusField: "status",
    editableBy: ['leader', 'manager'],
    displayField: "serial",
    defaultSort: { column: "created_at", ascending: false },
    fields: [
      { key: "serial", label: "Serial", type: "text", required: true },
      { key: "project_id", label: "ID dự án", type: "text", required: true },
      { key: "site_id", label: "ID site", type: "text" },
      { key: "type", label: "Loại", type: "text", required: true },
      { key: "model", label: "Model", type: "text" },
      { key: "mac_address", label: "MAC address", type: "text" },
      { key: "rack_id", label: "Rack", type: "text" },
      { key: "location", label: "Vị trí", type: "text" },
      { key: "warranty_from", label: "Bảo hành từ", type: "date" },
      { key: "warranty_to", label: "Bảo hành đến", type: "date" },
      { key: "status", label: "Trạng thái", type: "select", options: [{ value: "active", label: "Hoạt động" }, { value: "inactive", label: "Ngưng" }, { value: "expired", label: "Hết hạn" }] },
    ],
}

export default function Page() {
    const { role } = useProfile()
    return <CrudPage config={config} role={role} />
}
