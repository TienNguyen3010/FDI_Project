/** Type dùng chung cho màn quản lý khách hàng (bảng + right sidebar). */

export type CustomerStatus = 'active' | 'inactive' | 'archived' | (string & {})

export interface Customer {
  id: string
  code?: string | null
  name: string
  phone?: string | null
  email?: string | null
  industry?: string | { name?: string | null } | null
  tax_id?: string | null
  headquarters_address?: string | null
  primary_contact_name?: string | null
  /** 3 kênh liên hệ bổ sung (right sidebar). */
  contact_technical?: string | null
  contact_commercial?: string | null
  contact_emergency?: string | null
  project_count?: number | null
  open_ticket_count?: number | null
  /** PSM: vòng đời vận hành thật (migration 015). */
  lifecycle_stage?: string | null
  status?: CustomerStatus | null
  created_at?: string | null
}

/** Dự án gắn với khách hàng — GET /api/v1/customers/[id]/projects. */
export interface CustomerProject {
  id: string
  name: string | null
  status: string | null
  /** null = chưa có tiến độ (KHÔNG bịa 0%). */
  progress: number | null
  site_id: string | null
}

export interface Activity {
  id?: string
  entity_type?: string
  entity_id?: string
  activity_type?: string | null
  channel?: string | null
  direction?: string | null
  status?: string | null
  subject?: string | null
  body?: string | null
  occurred_at?: string | null
  scheduled_at?: string | null
  done_at?: string | null
  owner_id?: string | null
  created_at?: string | null
  metadata?: { ui_type?: string | null } | null
}
