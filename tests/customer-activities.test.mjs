// Contract: tính năng Activities (migration 013) — kiến trúc ĐA HÌNH.
// Test TĨNH — đọc source bằng readFileSync, không cần DB thật.
// Nguồn truth: migrations/013_customer_activities.sql (tham chiếu SoftNET CRM 0012).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const root = new URL('..', import.meta.url).pathname

function src(rel) {
  return readFileSync(root + rel, 'utf8')
}

const MIGRATION = 'migrations/013_customer_activities.sql'

// ---- Helpers ----

// Bóc thân 1 khối CREATE [OR REPLACE] FUNCTION ... $$ ... $$; (hoặc $fn$;).
// Trả về '' nếu không tìm thấy — caller tự assert.
function fnBody(sql, signature) {
  const start = sql.indexOf(signature)
  if (start === -1) return ''
  const dollar = sql.indexOf('$$', start)
  const fnDollar = sql.indexOf('$fn$', start)
  const candidates = [dollar, fnDollar].filter((i) => i !== -1)
  if (candidates.length === 0) return sql.slice(start)
  const open = Math.min(...candidates)
  const close = sql.indexOf(sql.slice(open, open + 2), open + 2)
  if (close === -1) return sql.slice(start)
  return sql.slice(start, close + 2)
}

// Bóc thân bảng từ CREATE TABLE ... ( cho tới dấu đóng ");" đầu tiên.
function tableBody(sql, table) {
  const re = new RegExp(`CREATE TABLE (IF NOT EXISTS )?public\\.${table}\\s*\\(`, 'im')
  const m = re.exec(sql)
  if (!m) return ''
  const start = m.index
  const end = sql.indexOf(');', start)
  return sql.slice(start, end === -1 ? sql.length : end)
}

// Bóc thân các policy CREATE POLICY <name> ON public.<table> ... ;
function policiesOn(sql, table) {
  const re = new RegExp(`CREATE POLICY (\\S+)\\s+ON public\\.${table}\\b`, 'ig')
  const out = []
  let m
  while ((m = re.exec(sql)) !== null) {
    const end = sql.indexOf(';', m.index)
    out.push({ name: m[1], body: sql.slice(m.index, end === -1 ? sql.length : end) })
  }
  return out
}

// =====================================================================
// 1) Migration 013 tồn tại + cấu trúc an toàn
// =====================================================================

test('DB 013: migration tồn tại + BEGIN/COMMIT + ghi schema_migrations 013', () => {
  assert.ok(existsSync(root + MIGRATION), `thiếu file ${MIGRATION}`)
  const sql = src(MIGRATION)
  assert.match(sql, /^\s*BEGIN\s*;/m, '013 phải có BEGIN;')
  assert.match(sql, /^\s*COMMIT\s*;/m, '013 phải có COMMIT;')
  assert.match(
    sql,
    /INSERT INTO public\.schema_migrations[\s\S]{0,400}?013_customer_activities/,
    'ghi schema_migrations 013_customer_activities',
  )
})

test('DB 013: KHÔNG DROP TABLE / DROP FUNCTION (chỉ CREATE OR REPLACE / IF NOT EXISTS)', () => {
  const sql = src(MIGRATION)
  assert.ok(!/^\s*DROP\s+TABLE/im.test(sql), '013 KHÔNG được DROP TABLE')
  assert.ok(!/^\s*DROP\s+FUNCTION/im.test(sql), '013 KHÔNG được DROP FUNCTION')
  assert.ok(!/DROP\s+TABLE\s+IF\s+EXISTS/im.test(sql), '013 KHÔNG DROP TABLE IF EXISTS')
})

// =====================================================================
// 2) Bảng đa hình activities + lookup activity_types/channels
// =====================================================================

test('DB 013: CREATE TABLE public.activities ĐA HÌNH (entity_type/entity_id) + cột bắt buộc', () => {
  const sql = src(MIGRATION)
  const body = tableBody(sql, 'activities')
  assert.ok(body !== '', 'thiếu CREATE TABLE public.activities')
  // Đa hình: entity_type ∈ {customer,project,site} + entity_id KHÔNG FK vật lý.
  assert.match(body, /\bentity_type\b/, 'activities.phải có cột entity_type')
  assert.match(body, /\bentity_id\b/, 'activities.phải có cột entity_id')
  assert.match(body, /customer['"]?\s*,\s*['"]?project/, 'entity_type check phải gồm customer/project')
  for (const col of ['activity_type', 'channel', 'status', 'subject', 'created_at']) {
    assert.match(body, new RegExp(`\\b${col}\\b`), `activities.phải có cột ${col}`)
  }
  // entity_id KHÔNG được có FK ON DELETE CASCADE (không tham chiếu customers trực tiếp).
  assert.ok(
    !/entity_id\s+UUID\s+REFERENCES\s+public\.customers[^)]*ON\s+DELETE\s+CASCADE/im.test(body),
    'activities.entity_id KHÔNG FK customers ON DELETE CASCADE (đa hình)',
  )
})

test('DB 013: lookup activity_types + channels (bảng) + index lịch sử đối tượng', () => {
  const sql = src(MIGRATION)
  assert.ok(tableBody(sql, 'activity_types') !== '', 'thiếu CREATE TABLE public.activity_types')
  assert.ok(tableBody(sql, 'channels') !== '', 'thiếu CREATE TABLE public.channels')
  // index dòng thời gian theo đối tượng: (entity_type, entity_id, created_at DESC)
  const idx = /CREATE INDEX (IF NOT EXISTS )?\S+[\s\S]{0,200}?ON public\.activities[\s\S]{0,160}?\(\s*entity_type\s*,\s*entity_id/im
  assert.match(sql, idx, 'phải có index (entity_type, entity_id, ...) trên activities')
})

// =====================================================================
// 3) RLS trên activities — SELECT đi qua fdi_can_read, không lách
// =====================================================================

test('DB 013: bật RLS + policy SELECT/INSERT cho activities', () => {
  const sql = src(MIGRATION)
  assert.match(
    sql,
    /ALTER TABLE public\.activities\s+ENABLE ROW LEVEL SECURITY/i,
    'activities phải bật RLS',
  )
  const policies = policiesOn(sql, 'activities')
  assert.ok(policies.length >= 2, 'activities phải có ít nhất 2 policy (select + insert)')

  const select = policies.find((p) => /\bFOR\s+SELECT\b/i.test(p.body))
  assert.ok(select, 'thiếu policy FOR SELECT trên activities')
  assert.match(
    select.body,
    /fdi_can_read\s*\(/,
    'policy SELECT phải đi qua fdi_can_read (khớp customers_select, không lách RLS)',
  )
  assert.match(select.body, /auth\.uid\(\)\s+IS\s+NOT\s+NULL/, 'policy SELECT phải kiểm auth.uid()')

  const insert = policies.find((p) => /\bFOR\s+INSERT\b/i.test(p.body))
  assert.ok(insert, 'thiếu policy FOR INSERT trên activities')
  assert.match(insert.body, /auth\.uid\(\)\s+IS\s+NOT\s+NULL/, 'policy INSERT phải kiểm auth.uid()')
  assert.match(
    insert.body,
    /(created_by|owner_id)\s*=\s*auth\.uid\(\)/,
    'policy INSERT chỉ cho ghi hoạt động do mình tạo/gán',
  )
  for (const p of [select, insert]) {
    assert.ok(!/TO\s+PUBLIC/.test(p.body), `policy ${p.name} không được mở cho PUBLIC`)
  }
})

// =====================================================================
// 4) RPC log_activity — kiểm đăng nhập (auth.uid) → RAISE EXCEPTION unauthorized
// =====================================================================

test('DB 013: RPC log_activity kiểm đăng nhập → RAISE EXCEPTION unauthorized', () => {
  const sql = src(MIGRATION)
  assert.ok(
    /CREATE (OR REPLACE )?FUNCTION public\.log_activity\s*\(/i.test(sql),
    'thiếu RPC public.log_activity',
  )
  const body = fnBody(sql, 'FUNCTION public.log_activity(')
  assert.ok(body !== '', 'không bóc được thân log_activity')
  // Kiểm đăng nhập — trực tiếp auth.uid() HOẶC qua helper fdi_current_user_id()
  // (002 định nghĩa fdi_current_user_id = auth.uid + fallback JWT sub).
  assert.match(
    body,
    /(auth\.uid\(\)|fdi_current_user_id\s*\(\s*\))/,
    'log_activity phải kiểm đăng nhập (auth.uid / fdi_current_user_id)',
  )
  assert.match(body, /RAISE EXCEPTION/i, 'log_activity phải RAISE EXCEPTION khi chưa đăng nhập')
  assert.match(body, /unauthorized/i, 'thông báo phải là "unauthorized"')
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION public\.log_activity\([\s\S]*?\) FROM PUBLIC/i,
    'log_activity phải REVOKE PUBLIC',
  )
  assert.match(
    sql,
    /GRANT EXECUTE ON FUNCTION public\.log_activity\([\s\S]*?\)[\s\S]{0,40}?TO (authenticated|anon|service_role)/i,
    'log_activity phải GRANT role',
  )
})

// =====================================================================
// 5) RPC create_customer_with_activity — kiểm quyền, không lách RLS
// =====================================================================

test('DB 013: RPC create_customer_with_activity kiểm quyền (fdi_is_manager_plus / fdi_can_read)', () => {
  const sql = src(MIGRATION)
  assert.ok(
    /CREATE (OR REPLACE )?FUNCTION public\.create_customer_with_activity\s*\(/i.test(sql),
    'thiếu RPC public.create_customer_with_activity',
  )
  const body = fnBody(sql, 'FUNCTION public.create_customer_with_activity(')
  assert.ok(body !== '', 'không bóc được thân create_customer_with_activity')

  // (a) Quyền TẠO KHÁCH HÀNG phải đi qua fdi_is_manager_plus — khớp policy fdi_customers_insert.
  assert.match(
    body,
    /fdi_is_manager_plus\s*\(/,
    'RPC phải kiểm fdi_is_manager_plus cho quyền tạo KH (không lách RLS)',
  )
  // (b) Phạm vi HOẠT ĐỘNG phải đi qua fdi_can_read — khớp policy customers_select.
  assert.match(
    body,
    /fdi_can_read\s*\(/,
    'RPC phải kiểm fdi_can_read cho phạm vi hoạt động',
  )
  // (c) Chặn chưa đăng nhập.
  assert.match(
    body,
    /(auth\.uid\(\)|fdi_current_user_id\s*\(\s*\))/,
    'RPC phải kiểm đăng nhập',
  )
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.create_customer_with_activity\([\s\S]*?\) FROM PUBLIC/i, 'RPC phải REVOKE PUBLIC')
  assert.match(
    sql,
    /GRANT EXECUTE ON FUNCTION public\.create_customer_with_activity\([\s\S]*?\)[\s\S]{0,40}?TO (authenticated|anon|service_role)/i,
    'RPC phải GRANT role',
  )

  // (d) RPC tạo KH + hoạt động đầu tiên (đa hình, entity_type='customer').
  const custInsert = body.slice(body.indexOf('INSERT INTO public.customers'))
  assert.ok(custInsert !== '', 'RPC phải INSERT customers')
  assert.match(
    body.slice(body.indexOf('INSERT INTO public.activities')),
    /'customer'/,
    'hoạt động đi kèm phải gắn entity_type = customer',
  )
  // (e) Idempotent qua metadata->>'idem_key'.
  assert.match(body, /idem_key/, 'RPC phải hỗ trợ idempotency idem_key')
})
