import test from 'node:test'
import assert from 'node:assert/strict'
import { createRateLimiter, DEFAULT_LIMIT, DEFAULT_WINDOW_MS } from './_rate-limit-logic.mjs'

test('cấu hình mặc định khớp lib/rate-limit.ts (100 req / 60s)', () => {
  assert.equal(DEFAULT_LIMIT, 100)
  assert.equal(DEFAULT_WINDOW_MS, 60_000)
})

test('cho phép 100 request đầu (đúng limit), chặn request thứ 101', () => {
  const { checkRateLimit } = createRateLimiter()

  for (let i = 1; i <= 100; i++) {
    const r = checkRateLimit('user-a')
    assert.equal(r.allowed, true, `request thứ ${i} phải được phép (limit=100)`)
  }

  const blocked = checkRateLimit('user-a')
  assert.equal(blocked.allowed, false, 'request thứ 101 phải bị chặn')
  assert.equal(blocked.remaining, 0)
})

test('remaining giảm đúng theo số request còn lại', () => {
  const { checkRateLimit } = createRateLimiter({ limit: 5 })

  const expected = [4, 3, 2, 1, 0]
  for (let i = 0; i < expected.length; i++) {
    const r = checkRateLimit('user-b')
    assert.equal(r.allowed, true)
    assert.equal(r.remaining, expected[i], `remaining sau request ${i + 1}`)
  }
})

test('resetAt > now và retryAfter >= 1 khi bị chặn', () => {
  const now = 1_700_000_000_000
  const { checkRateLimit } = createRateLimiter({ limit: 2, windowMs: 60_000, nowFn: () => now })

  checkRateLimit('user-c') // 1/2
  checkRateLimit('user-c') // 2/2
  const blocked = checkRateLimit('user-c') // bị chặn

  assert.equal(blocked.allowed, false)
  assert.ok(blocked.resetAt > now, `resetAt (${blocked.resetAt}) phải > now (${now})`)
  assert.equal(blocked.resetAt, now + 60_000)
  assert.ok(blocked.retryAfter >= 1, `retryAfter (${blocked.retryAfter}) phải >= 1`)
  assert.equal(blocked.retryAfter, 60)
})

test('request cũ ngoài cửa sổ trượt ra khỏi bucket (sliding window)', () => {
  let now = 1_700_000_000_000
  const { checkRateLimit } = createRateLimiter({ limit: 2, windowMs: 1000, nowFn: () => now })

  assert.equal(checkRateLimit('user-d').allowed, true)
  assert.equal(checkRateLimit('user-d').allowed, true)
  assert.equal(checkRateLimit('user-d').allowed, false)

  now += 1001 // cửa sổ cũ đã trôi qua -> hit cũ bị loại
  const after = checkRateLimit('user-d')
  assert.equal(after.allowed, true, 'phải được phép lại sau khi hết cửa sổ')
  assert.equal(after.remaining, 1)
})

test('evict key cũ khi quá MAX_KEYS (ưu tiên entry đụng tới gần đây nhất)', () => {
  const nowFn = (() => {
    let t = 1_700_000_000_000
    return () => t++ // mỗi lần check một mốc thời gian mới, tăng dần
  })()
  const { checkRateLimit, buckets } = createRateLimiter({ maxKeys: 3, nowFn })

  checkRateLimit('oldest')
  checkRateLimit('middle')
  checkRateLimit('newest')
  assert.equal(buckets.size, 3)

  checkRateLimit('trigger-evict') // lần này đẩy size lên 4 -> evict 'oldest'
  assert.equal(buckets.size, 3, 'số bucket phải bị giới hạn ở maxKeys')
  assert.equal(buckets.has('oldest'), false, 'key cũ nhất phải bị evict')
  assert.equal(buckets.has('newest'), true)
  assert.equal(buckets.has('trigger-evict'), true)
})
