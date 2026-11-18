// features/alerts/actions.ts — Domain actions cho Alerts/Incident lifecycle.
// Tách từ components/incident/IncidentLifecycle.tsx (P2, project_structure.md §4).
// Giữ NGUYÊN câu lệnh DB + audit payload để không đổi hành vi; UI chỉ gọi lại.
// C-06: MỘT entity `alerts`; "Incident" là trạng thái xử lý, không phải bảng riêng.

import { supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
import type { Database } from '@/lib/types'
import { STATUS_LABEL, SLA_LABEL, type AlertStatus, type Severity } from '@/features/alerts/schema'

type AlertRow = Database['public']['Tables']['alerts']['Row']

/** Kết quả chung cho cả 2 action: message hiển thị cho người dùng. */
export interface ActionResult {
  ok: boolean
  message: string
  workId?: string
}

interface TransitionInput {
  to: AlertStatus
  alert: AlertRow
  ownerId: string | null
}

/**
 * Đổi trạng thái alert. Copy nguyên logic DB từ IncidentLifecycle.changeStatus:
 * - resolved_at chỉ set khi chuyển sang resolved/closed và chưa có;
 * - "Nhận xử lý" gán owner_id cho người thao tác;
 * - RLS chặn ghi => select về rỗng (không có error) -> báo lỗi rõ ràng.
 */
export async function changeAlertStatus({ to, alert, ownerId }: TransitionInput): Promise<ActionResult> {
  const isResolved = to === 'resolved' || to === 'closed'
  const resolvedAt = isResolved && !alert.resolved_at ? new Date().toISOString() : alert.resolved_at

  const { data, error } = await supabase
    .from('alerts')
    .update({ status: to, resolved_at: resolvedAt, owner_id: ownerId })
    .eq('id', alert.id)
    .select('id')

  if (error) return { ok: false, message: `Không cập nhật được trạng thái: ${error.message}` }
  if (!data || data.length === 0) {
    return { ok: false, message: 'Không cập nhật được trạng thái (bị chính sách bảo mật chặn).' }
  }

  void logAudit({ action: 'UPDATE', resourceType: 'alerts', resourceId: alert.id })
  return { ok: true, message: `Đã chuyển trạng thái: ${STATUS_LABEL[to]}.` }
}

interface CreateWorkInput {
  alert: AlertRow
  severity: Severity
  creatorId: string | null
}

/** Tạo công việc từ alert. Copy nguyên payload từ IncidentLifecycle.createWorkFromIncident. */
export async function createWorkFromAlert({ alert, severity, creatorId }: CreateWorkInput): Promise<ActionResult> {
  const { data, error } = await supabase
    .from('works')
    .insert({
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : String(Date.now()),
      project_id: alert.project_id,
      incident_id: alert.id,
      assignee_id: alert.owner_id,
      creator_id: creatorId ?? null,
      type: 'incident',
      title: `Xử lý sự cố: ${alert.description.slice(0, 120)}`,
      description: `Công việc tạo tự động từ sự cố ${alert.id}. Mức độ: ${SLA_LABEL[severity]}.`,
      status: 'assigned',
      priority: alert.priority,
    })
    .select('id')
    .single()

  if (error) return { ok: false, message: `Không tạo được công việc: ${error.message}` }
  if (!data) return { ok: false, message: 'Không tạo được công việc (bị chính sách bảo mật chặn).' }

  void logAudit({ action: 'CREATE', resourceType: 'works', resourceId: data.id })
  return { ok: true, message: 'Đã tạo công việc từ sự cố.', workId: data.id }
}
