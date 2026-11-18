// Project OPS v1.0 — audit diff helper (pure, no DB dependency).
// Traces old/new changes for the audit trail. Secret values must never be logged.

export type AuditDiff = { field: string; from: unknown; to: unknown }

const REDACT = /password|secret|token|api[_-]?key|authorization|cookie/i

function safe(value: unknown): unknown {
  if (typeof value === 'string' && REDACT.test(value)) return '[redacted]'
  if (Array.isArray(value)) return value.map(safe)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !REDACT.test(k))
        .map(([k, v]) => [k, safe(v)]),
    )
  }
  return value
}

/** So sánh bản ghi trước/sau; INSERT (old=null) trả toàn bộ bản ghi mới. */
export function computeAuditDiff(
  oldRecord: Record<string, unknown> | null,
  newRecord: Record<string, unknown> | null,
): AuditDiff[] {
  if (!oldRecord && !newRecord) return []
  if (!oldRecord) {
    return Object.entries(newRecord ?? {}).map(([field, to]) => ({ field, from: null, to: safe(to) }))
  }
  if (!newRecord) {
    return Object.entries(oldRecord).map(([field, from]) => ({ field, from: safe(from), to: null }))
  }
  const fields = new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)])
  const out: AuditDiff[] = []
  for (const field of fields) {
    if (REDACT.test(field)) continue
    const from = oldRecord[field]
    const to = newRecord[field]
    if (JSON.stringify(from) !== JSON.stringify(to)) out.push({ field, from: safe(from), to: safe(to) })
  }
  return out
}

export function auditPayload(action: string, resourceType: string, resourceId: string | null, diff: AuditDiff[]) {
  return { action, resource_type: resourceType, resource_id: resourceId, diff, at: new Date().toISOString() }
}

/**
 * P0 audit sink: ghi vào console có cấu trúc. Bảng audit_events thuộc migration
 * 006; wiring DB sẽ làm ở P1. Không bao giờ log secret (xem REDACT ở trên).
 */
export async function logAudit(entry: {
  action: string
  resource_type?: string
  resourceType?: string
  resource_id?: string | null
  resourceId?: string | null
  actor_id?: string | null
  diff?: AuditDiff[]
}): Promise<void> {
  const resourceType = entry.resource_type ?? entry.resourceType ?? 'unknown'
  const resourceId = entry.resource_id ?? entry.resourceId ?? null
  if (process.env.NODE_ENV === 'development') {
    console.info('[audit]', auditPayload(entry.action, resourceType, resourceId, entry.diff ?? []))
  }
}
