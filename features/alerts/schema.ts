// features/alerts/schema.ts — domain contract cho Alerts/Incident (DD C-06: MỘT entity `alerts`).
// Nguồn truth: migration 001 (CHECK severity) + enum status đã chốt DD C-12.
// SLA hours = internal default (DD C-07); đổi theo hợp đồng bằng cấu hình, KHÔNG hardcode mới.

export const SEVERITIES = ['critical', 'major', 'minor'] as const
export type Severity = (typeof SEVERITIES)[number]

export const ALERT_STATUSES = ['new', 'acknowledged', 'in_progress', 'resolved', 'closed'] as const
export type AlertStatus = (typeof ALERT_STATUSES)[number]

export const STATUS_ORDER: AlertStatus[] = [...ALERT_STATUSES]

/** Nhãn tiếng Việt cho từng trạng thái — dùng chung với UI vòng đời sự cố. */
export const STATUS_LABEL: Record<AlertStatus, string> = {
  new: 'Mới',
  acknowledged: 'Đã nhận',
  in_progress: 'Đang xử lý',
  resolved: 'Đã giải quyết',
  closed: 'Đã đóng',
}

export const SLA_HOURS: Record<Severity, number> = { critical: 4, major: 8, minor: 24 }
export const SLA_LABEL: Record<Severity, string> = { critical: 'Critical', major: 'Major', minor: 'Minor' }

export const SEVERITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
] as const

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
  { value: 'critical', label: 'Khẩn cấp' },
] as const

export const STATUS_OPTIONS = [
  { value: 'new', label: 'Mới' },
  { value: 'acknowledged', label: 'Đã nhận' },
  { value: 'in_progress', label: 'Đang xử lý' },
  { value: 'resolved', label: 'Đã giải quyết' },
  { value: 'closed', label: 'Đã đóng' },
] as const

/** CrudConfig cho danh sách alerts — tách khỏi route page (app/alerts/page.tsx chỉ import). */
export const ALERTS_CRUD_CONFIG = {
  title: 'Cảnh báo & Sự cố',
  description: 'Nhận, xử lý, đóng sự cố và SLA.',
  table: 'alerts',
  statusField: 'severity',
  editableBy: ['leader', 'manager'],
  displayField: 'description',
  defaultSort: { column: 'created_at', ascending: false },
  fields: [
    { key: 'description', label: 'Mô tả', type: 'textarea', required: true },
    { key: 'project_id', label: 'ID dự án', type: 'text', required: true },
    { key: 'device_id', label: 'ID thiết bị', type: 'text' },
    { key: 'site_id', label: 'ID site', type: 'text' },
    { key: 'severity', label: 'Mức độ', type: 'select', required: true, options: [...SEVERITY_OPTIONS] },
    { key: 'priority', label: 'Ưu tiên', type: 'select', options: [...PRIORITY_OPTIONS] },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [...STATUS_OPTIONS] },
    { key: 'owner_id', label: 'ID người xử lý', type: 'text' },
    { key: 'source', label: 'Nguồn', type: 'text' },
  ],
} as const
