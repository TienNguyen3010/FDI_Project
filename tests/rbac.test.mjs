import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ROLES, PERMISSIONS, hasPermission, canAll, canAccessScope, isRole,
} from '../lib/rbac/policy.core.mjs'

test('RBAC: 6 roles, 48 permissions, deny by default', () => {
  assert.equal(ROLES.length, 6)
  assert.equal(PERMISSIONS.length, 48)
  assert.equal(hasPermission('unknown', 'dashboard.read'), false)
  assert.equal(hasPermission(undefined, 'dashboard.read'), false)
  assert.equal(hasPermission('engineer', 'admin.user_manage'), false)
})

test('RBAC: super_admin wildcard; customer_viewer read-only', () => {
  assert.equal(hasPermission('super_admin', 'admin.role_manage'), true)
  assert.equal(hasPermission('customer_viewer', 'dashboard.read'), true)
  assert.equal(hasPermission('customer_viewer', 'customer.create'), false)
  assert.equal(canAll('director', ['project.approve', 'report.export']), true)
  assert.equal(canAll('engineer', ['project.approve', 'asset.read']), false)
})

test('RBAC: customer.create grant — manager+; deny engineer/support/viewer', () => {
  assert.equal(hasPermission('director', 'customer.create'), true)
  assert.equal(hasPermission('project_manager', 'customer.create'), true)
  assert.equal(hasPermission('super_admin', 'customer.create'), true)
  assert.equal(hasPermission('engineer', 'customer.create'), false)
  assert.equal(hasPermission('support', 'customer.create'), false)
  assert.equal(hasPermission('customer_viewer', 'customer.create'), false)
})

test('RBAC: role grant KHÔNG override scope (rbac_policy.json:163)', () => {
  const project = { customer_id: 'c1', site_id: 's1', project_id: 'p1' }
  assert.equal(canAccessScope('director', 'project.read', project, [{ kind: 'customer', id: 'c1' }]), true)
  assert.equal(canAccessScope('director', 'project.read', project, [{ kind: 'customer', id: 'c2' }]), false)
  assert.equal(canAccessScope('director', 'project.read', project, []), false)
  assert.equal(canAccessScope('super_admin', 'admin.role_manage', project, []), true) // global only admin
  assert.equal(canAccessScope('engineer', 'ticket.triage', project, [{ kind: 'customer', id: 'c1' }]), false) // no perm
})

test('RBAC: isRole rejects legacy roles (leader/manager/employee)', () => {
  for (const legacy of ['leader', 'manager', 'employee']) {
    assert.equal(isRole(legacy), false)
    assert.equal(hasPermission(legacy, 'dashboard.read'), false)
  }
})

// 2026-11-23: sửa khách hàng được. Khớp RLS fdi_is_leader_plus() + fdi_can_read.
test('RBAC: customer.update grant — director/PM/super_admin; deny engineer/support/viewer', () => {
  assert.equal(hasPermission('director', 'customer.update'), true)
  assert.equal(hasPermission('project_manager', 'customer.update'), true)
  assert.equal(hasPermission('super_admin', 'customer.update'), true)
  assert.equal(hasPermission('engineer', 'customer.update'), false)
  assert.equal(hasPermission('support', 'customer.update'), false)
  assert.equal(hasPermission('customer_viewer', 'customer.update'), false)
})
