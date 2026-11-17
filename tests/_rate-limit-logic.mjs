// Bản JS tương đương logic trong lib/rate-limit.ts (sliding-window + Map + evict).
// Tách ra file .mjs để node:test import được mà không cần TS loader / dependency.
// Khác biệt duy nhất: nhận `nowFn` injectable để test deterministic.

export const DEFAULT_LIMIT = 100
export const DEFAULT_WINDOW_MS = 60_000
export const MAX_KEYS = 1000

/**
 * Tạo một rate limiter độc lập (state riêng) phục vụ unit test.
 * @param {{limit?: number, windowMs?: number, maxKeys?: number, nowFn?: () => number}} opts
 */
export function createRateLimiter(opts = {}) {
  const {
    limit: defaultLimit = DEFAULT_LIMIT,
    windowMs: defaultWindowMs = DEFAULT_WINDOW_MS,
    maxKeys = MAX_KEYS,
    nowFn = Date.now,
  } = opts

  /** @type {Map<string, {hits: number[], touched: number}>} */
  const buckets = new Map()

  function evictIfNeeded() {
    if (buckets.size <= maxKeys) return
    const ordered = [...buckets.entries()].sort((a, b) => a[1].touched - b[1].touched)
    let toRemove = buckets.size - maxKeys
    for (const [key] of ordered) {
      if (toRemove <= 0) break
      buckets.delete(key)
      toRemove -= 1
    }
  }

  function checkRateLimit(key, limit = defaultLimit, windowMs = defaultWindowMs) {
    const now = nowFn()
    const cutoff = now - windowMs

    const bucket = buckets.get(key) ?? { hits: [], touched: now }
    const hits = bucket.hits.filter((t) => t > cutoff)
    bucket.hits = hits
    bucket.touched = now
    buckets.set(key, bucket)

    // Dọn các bucket ĐÃ HẾT HẠN (touched cũ hơn window) — KHÔNG xoá bucket vừa tạo.
    // (Cleanup mọi bucket có hits rỗng ở đây từng xoá ngay bucket hiện tại khi
    //  nowFn trả cùng timestamp, khiến mỗi request tạo bucket mới → không đếm được.)
    for (const [k, b] of buckets) {
      if (k !== key && now - b.touched > defaultWindowMs) buckets.delete(k)
    }
    evictIfNeeded()

    const resetAt = (hits[0] ?? now) + windowMs

    if (hits.length >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      }
    }

    hits.push(now)
    return {
      allowed: true,
      remaining: Math.max(0, limit - hits.length),
      resetAt: (hits[0] ?? now) + windowMs,
      retryAfter: 0,
    }
  }

  return { checkRateLimit, buckets }
}
