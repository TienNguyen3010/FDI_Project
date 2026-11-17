// Hàm thuần mô phỏng logic diff OLD/NEW trong migrations/004_audit_trigger.sql.
// Quy ước (khớp SQL): INSERT (old=null) -> toàn bộ new; DELETE (new=null) -> toàn bộ old;
// UPDATE -> {key: {old, new}} cho cột đổi, bỏ qua 'updated_at'. Không mutate input.

const SKIP_KEYS = new Set(['updated_at'])

/** @param {Record<string, unknown>|null} oldObj @param {Record<string, unknown>|null} newObj */
export function computeAuditDiff(oldObj, newObj) {
  if (oldObj === null && newObj !== null) {
    return { ...newObj } // INSERT
  }
  if (newObj === null && oldObj !== null) {
    return { ...oldObj } // DELETE
  }
  if (oldObj === null && newObj === null) {
    return {}
  }

  /** @type {Record<string, {old: unknown, new: unknown}>} */
  const changes = {}
  for (const key of Object.keys(newObj)) {
    if (SKIP_KEYS.has(key)) continue
    if (oldObj[key] !== newObj[key]) {
      changes[key] = { old: oldObj[key], new: newObj[key] }
    }
  }
  // Cột chỉ có trong OLD (đã bị xoá khỏi NEW) cũng là thay đổi.
  for (const key of Object.keys(oldObj)) {
    if (SKIP_KEYS.has(key)) continue
    if (!(key in newObj)) {
      changes[key] = { old: oldObj[key], new: undefined }
    }
  }
  return changes
}
