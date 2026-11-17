// FDI_Project — in-memory sliding-window rate limit (dùng trong Edge proxy).
// Edge runtime: chỉ dùng Map/Date, không dùng Node API.
// LƯU Ý: mỗi Edge isolate có state riêng -> đây là limit "mềm" (per-instance).

export interface RateLimitResult {
  allowed: boolean
  /** Số request còn lại trong cửa sổ */
  remaining: number
  /** Thời điểm hết cửa sổ (epoch ms) */
  resetAt: number
  /** Giây phải đợi khi bị chặn (0 khi allowed) */
  retryAfter: number
}

interface Bucket {
  /** Mốc thời gian (epoch ms) của các request còn trong cửa sổ, tăng dần */
  hits: number[]
  /** Lần cuối bucket được đụng tới — dùng để ưu tiên giữ entry mới */
  touched: number
}

const DEFAULT_LIMIT = 100
const DEFAULT_WINDOW_MS = 60_000
const MAX_KEYS = 1000

// Next 16 proxy chạy trong runtime có thể reload module giữa các request.
// Dùng globalThis để state tồn tại trong cùng isolate/worker (self-hosted `next start`).
// ⚠️ Trên serverless multi-instance (Vercel), mỗi instance vẫn có bucket riêng —
//    cần Redis/Upstash để limit toàn cục. Đây là limit "mềm" per-instance.
const GLOBAL_KEY = Symbol.for('fdi.rateLimit.buckets')
type Store = Map<string, Bucket>
const store = globalThis as unknown as { [GLOBAL_KEY]?: Store }
const buckets: Store = store[GLOBAL_KEY] ?? new Map<string, Bucket>()
store[GLOBAL_KEY] = buckets

function evictIfNeeded(now: number): void {
  if (buckets.size <= MAX_KEYS) return
  // Xoá các entry cũ nhất theo thời gian đụng tới gần đây nhất.
  const ordered = [...buckets.entries()].sort((a, b) => a[1].touched - b[1].touched)
  let toRemove = buckets.size - MAX_KEYS
  for (const [key] of ordered) {
    if (toRemove <= 0) break
    buckets.delete(key)
    toRemove -= 1
  }
  void now
}

export function checkRateLimit(
  key: string,
  limit: number = DEFAULT_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS
): RateLimitResult {
  const now = Date.now()
  const cutoff = now - windowMs

  const bucket = buckets.get(key) ?? { hits: [], touched: now }
  const hits = bucket.hits.filter((t) => t > cutoff)
  bucket.hits = hits
  bucket.touched = now
  buckets.set(key, bucket)

  // Dọn entry rỗng (đã hết hạn) trước khi xét cap.
  for (const [k, b] of buckets) {
    if (b.hits.length === 0) buckets.delete(k)
  }
  evictIfNeeded(now)

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

/** Trả các header X-RateLimit-* chuẩn cho response (allowed lẫn 429). */
export const RATE_LIMIT_HEADERS = (
  result: RateLimitResult,
  limit: number = DEFAULT_LIMIT
): Record<string, string> => ({
  'X-RateLimit-Limit': String(limit),
  'X-RateLimit-Remaining': String(result.remaining),
  'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
})
