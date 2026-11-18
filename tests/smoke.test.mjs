import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = process.cwd()
const read = (rel) => readFileSync(resolve(root, rel), 'utf-8')

test('package.json có đủ script dev/build/start/lint/test', () => {
  const pkg = JSON.parse(read('package.json'))
  for (const s of ['dev', 'build', 'start', 'lint', 'test']) {
    assert.ok(pkg.scripts?.[s], `thiếu script "${s}"`)
  }
})

test('.env.example có placeholder Supabase + Upstash (không phải secret thật)', () => {
  const env = read('.env.example')
  for (const k of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
                   'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) {
    assert.ok(env.includes(k), `thiếu ${k}`)
  }
  assert.ok(!/Fdi@Project2026|sb_secret_|ghp_/.test(env), '.env.example lộ secret')
})

test('docs v1.0 checklist có verification evidence', () => {
  // Đường dẫn cập nhật theo cấu trúc /docs v1.0 (04-governance).
  assert.ok(read('docs/04-governance/CHECKLISTS.md').includes('evidence_required'))
})

test('W0: lib/auth/authorize.ts dùng DB làm nguồn truth', () => {
  const auth = read('lib/auth/authorize.ts')
  assert.ok(auth.includes("from('users')"), 'phải đối chiếu bảng users')
  assert.ok(auth.includes('app_metadata'), 'đọc role từ JWT app_metadata')
  assert.ok(auth.includes('export async function authorize'), 'thiếu helper dùng chung')
})

test('DD C-09: proxy.ts có rewrite /api/v1 -> /api', () => {
  const proxy = read('proxy.ts')
  assert.ok(proxy.includes('/api/v1/'), 'thiếu điều kiệnrewrite /api/v1')
  assert.ok(proxy.includes("'/api'"), 'thiếu đích rewrite /api')
  assert.ok(proxy.includes('NextResponse.rewrite'), 'phải dùng rewrite internal, không redirect')
})

test('đủ migration 001-006', () => {
  const files = readdirSync(resolve(root, 'migrations'))
  for (const f of ['001_initial_schema.sql', '002_rls_policies.sql',
                   '003_seed.sql', '004_audit_trigger.sql', '006_ops_core.sql']) {
    assert.ok(files.includes(f), `thiếu ${f}`)
  }
})

test('git KHÔNG track .env và KHÔNG có secret trong file tracked', () => {
  let tracked = ''
  try {
    tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf-8' })
  } catch {
    // Không phải git repo -> bỏ qua thay vì fail (smoke test chạy được cả khi đóng gói source)
    return
  }
  const files = tracked.split('\n').filter(Boolean)
  assert.ok(!files.includes('.env'), '.env bị track')
  const secret = /Fdi@Project2026|sb_secret_[A-Za-z0-9_-]+|ghp_[A-Za-z0-9]+|d96389ae-6054-4285-8c08-ac192a9d7989/
  const bad = []
  for (const f of files) {
    // File này tự định nghĩa regex phát hiện secret -> chính nó luôn "khớp".
    // Loại trừ để tránh false positive (self-match).
    if (f === 'tests/smoke.test.mjs') continue
    if (!/\.(ts|tsx|mjs|js|json|sql|md|yml|yaml|example)$/.test(f) && !f.startsWith('.')) continue
    if (!existsSync(resolve(root, f))) continue
    if (secret.test(readFileSync(resolve(root, f), 'utf-8'))) bad.push(f)
  }
  assert.deepEqual(bad, [], `secret trong file tracked: ${bad.join(', ')}`)
})
