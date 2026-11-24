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
  project_count?: number | null
  open_ticket_count?: number | null
  status?: CustomerStatus | null
  created_at?: string | null
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
