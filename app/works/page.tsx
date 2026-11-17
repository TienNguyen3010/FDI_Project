'use client'

import { CrudPage, type CrudConfig } from '@/components/crud/CrudPage'
import { useProfile } from '@/lib/hooks/useProfile'

// Checklist §5 #2 — Công việc: người giao, người nhận, hạn, ưu tiên,
// liên kết dự án/sự cố. RBAC mềm theo rbac_matrix.md:42:
// Employee xem việc của mình (RLS lọc theo assignee_id = auth uid, xem lib ở DB);
// Leader/Manager/Director tạo, giao và cập nhật việc.
const config: CrudConfig = {
  title: 'Công việc',
  description:
    'Người giao, người nhận, hạn, ưu tiên, liên kết dự án/sự cố. Employee chỉ xem việc được gán cho mình (lọc bởi RLS); Leader/Manager/Director tạo và giao việc.',
  table: 'works',
  statusField: 'status',
  editableBy: ['leader', 'manager', 'director'],
  displayField: 'title',
  defaultSort: { column: 'created_at', ascending: false },
  fields: [
    { key: 'title', label: 'Tiêu đề', type: 'text', required: true, placeholder: 'VD: Khôi phục Switch tầng 3' },
    { key: 'project_id', label: 'ID dự án', type: 'text', required: true, placeholder: 'UUID dự án' },
    {
      key: 'incident_id',
      label: 'ID sự cố',
      type: 'text',
      placeholder: 'UUID sự cố liên quan (để trống nếu không có)',
    },
    { key: 'assignee_id', label: 'ID người nhận', type: 'text', placeholder: 'UUID người nhận việc' },
    {
      key: 'type',
      label: 'Loại công việc',
      type: 'select',
      required: true,
      options: [
        { value: 'incident', label: 'Xử lý sự cố' },
        { value: 'maintenance', label: 'Bảo trì' },
        { value: 'bug', label: 'Lỗi' },
        { value: 'task', label: 'Công việc' },
        { value: 'deployment', label: 'Triển khai' },
      ],
    },
    {
      key: 'status',
      label: 'Trạng thái',
      type: 'select',
      required: true,
      options: [
        { value: 'new', label: 'Mới' },
        { value: 'assigned', label: 'Đã giao' },
        { value: 'in_progress', label: 'Đang xử lý' },
        { value: 'done', label: 'Hoàn thành' },
      ],
    },
    {
      key: 'priority',
      label: 'Ưu tiên',
      type: 'select',
      required: true,
      options: [
        { value: 'low', label: 'Thấp' },
        { value: 'medium', label: 'Trung bình' },
        { value: 'high', label: 'Cao' },
        { value: 'critical', label: 'Khẩn cấp' },
      ],
    },
    { key: 'due_date', label: 'Hạn hoàn thành', type: 'date' },
    { key: 'description', label: 'Mô tả', type: 'textarea', placeholder: 'Mô tả chi tiết công việc' },
  ],
}

export default function Page() {
  const { role } = useProfile()
  return <CrudPage config={config} role={role} />
}
