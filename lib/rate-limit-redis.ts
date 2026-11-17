// FDI_Project — Rate limit dùng Upstash Redis (atomic, share mọi Edge isolate).
// Nếu chưa cấu hình UPSTASH_REDIS_REST_* thì fallback về in-memory (mềm, per-instance).
// Lua script chạy atomic trong Redis: sliding-window, trả [allowed, remaining, resetAtMs].

import { Redis } from '@upstash/redis'
import { checkRateLimit, type RateLimitResult } from './rate-limit'

const URL = process.env.UPSTASH_REDIS_REST_URL
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

export const isRedisRateLimitEnabled = Boolean(URL && TOKEN)

let redis: Redis | null = null
function getRedis(): Redis | null {
  if (!URL || !TOKEN) return null
  if (!redis) redis = new Redis({ url: URL, token: TOKEN })
  return redis
}

const LUA_SLIDING_WINDOW = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local cutoff = now - window

-- Xoá các hit cũ ngoài cửa sổ
redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)
local count = redis.call('ZCARD', key)

if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local reset = (#oldest >= 2) and (tonumber(oldest[2]) + window) or (now + window)
  return { 0, 0, reset }
end

redis.call('ZADD', key, now, now .. '-' .. redis.call('INCR', key .. ':seq'))
redis.call('PEXPIRE', key, window)
return { 1, limit - count - 1, now + window }
`

/**
 * Kiểm tra rate limit. Dùng Redis khi có env, otherwise fallback in-memory.
 * Luôn trả RateLimitResult để proxy không phải nhánh hoá logic header.
 */
export async function checkRateLimitDistributed(
  key: string,
  limit = 100,
  windowMs = 60_000
): Promise<RateLimitResult> {
  const client = getRedis()
  if (!client) return checkRateLimit(key, limit, windowMs)

  try {
    const now = Date.now()
    const raw = (await client.eval<number[]>(LUA_SLIDING_WINDOW, [key], [
      String(now),
      String(windowMs),
      String(limit),
    ])) as unknown as number[]
    const [allowed, remaining, resetAt] = raw
    const resetMs = Number(resetAt)
    return {
      allowed: Number(allowed) === 1,
      remaining: Math.max(0, Number(remaining)),
      resetAt: resetMs,
      retryAfter: Number(allowed) === 1 ? 0 : Math.max(1, Math.ceil((resetMs - now) / 1000)),
    }
  } catch (err) {
    // Redis lỗi → fail-open nhưng vẫn áp soft-limit để không mở trống.
    console.warn('[rate-limit] Redis unavailable, fallback in-memory:', err)
    return checkRateLimit(`fallback:${key}`, limit, windowMs)
  }
}
