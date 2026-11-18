'use client'

// FDI_Project — client-side audit helper.
// Ghi audit bổ sung từ UI (CREATE/UPDATE/DELETE). DB cũng có trigger tự ghi
// (action INSERT/UPDATE/DELETE) — xem migrations/004_audit_trigger.sql.
// QUAN TRỌNG: helper này KHÔNG BAO GIỜ làm crash UI. RLS/session có thể chặn
// insert -> chỉ console.warn.

import { supabase } from '@/lib/supabase'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

export interface AuditEvent {
  action: AuditAction
  resourceType: string
  resourceId?: string | null
}

export async function logAudit({
  action,
  resourceType,
  resourceId = null,
}: AuditEvent): Promise<void> {
  try {
    const { data, error: userError } = await supabase.auth.getUser()
    if (userError || !data.user) return

    const { error } = await supabase.from('audit_logs').insert({
      id: crypto.randomUUID(),
      user_id: data.user.id,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
    })
    if (error) console.warn('[audit] ghi audit thất bại:', error.message)
  } catch (err) {
    // Không throw: audit là best-effort, không được cản trở thao tác người dùng.
    console.warn('[audit] ghi audit thất bại:', err)
  }
}
