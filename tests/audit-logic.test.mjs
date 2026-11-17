import test from 'node:test'
import assert from 'node:assert/strict'
import { computeAuditDiff } from './_audit-diff.mjs'

test('INSERT (old=null) trả toàn bộ bản ghi mới', () => {
  const fresh = { id: 'u1', name: 'Alice', status: 'active', updated_at: '2026-01-01' }
  assert.deepEqual(computeAuditDiff(null, fresh), {
    id: 'u1',
    name: 'Alice',
    status: 'active',
    updated_at: '2026-01-01',
  })
})

test('DELETE (new=null) trả toàn bộ bản ghi cũ', () => {
  const old = { id: 'u2', name: 'Bob', status: 'inactive', updated_at: '2026-01-02' }
  assert.deepEqual(computeAuditDiff(old, null), {
    id: 'u2',
    name: 'Bob',
    status: 'inactive',
    updated_at: '2026-01-02',
  })
})

test('UPDATE chỉ trả các cột đổi dạng {old, new}', () => {
  const old = { id: 'u3', name: 'Carol', status: 'active', plan: 'basic' }
  const neu = { id: 'u3', name: 'Carol', status: 'inactive', plan: 'basic' }
  assert.deepEqual(computeAuditDiff(old, neu), {
    status: { old: 'active', new: 'inactive' },
  })
})

test('UPDATE bỏ qua updated_at (dù giá trị khác nhau)', () => {
  const old = { id: 'u4', name: 'Dave', updated_at: '2026-01-01T00:00:00Z' }
  const neu = { id: 'u4', name: 'Dave', updated_at: '2026-01-02T00:00:00Z' }
  assert.deepEqual(computeAuditDiff(old, neu), {})
})

test('UPDATE không đổi gì thì trả object rỗng', () => {
  const row = { id: 'u5', name: 'Eve', status: 'active' }
  assert.deepEqual(computeAuditDiff(row, { ...row }), {})
})

test('không mutate input (immutability)', () => {
  const old = { id: 'u6', name: 'Frank', status: 'active' }
  const neu = { id: 'u6', name: 'Frank', status: 'inactive' }
  const oldSnapshot = { ...old }
  const newSnapshot = { ...neu }

  computeAuditDiff(old, neu)

  assert.deepEqual(old, oldSnapshot)
  assert.deepEqual(neu, newSnapshot)
})
