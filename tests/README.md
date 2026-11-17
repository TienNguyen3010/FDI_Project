# 🧪 Tests — FDI_Project

Chạy: `npm test` (hoặc `npm run test:watch` khi đang develop).

| File | Phạm vi |
|---|---|
| `rate-limit.test.mjs` | Unit test sliding-window: limit 100/60s, remaining, resetAt, retryAfter, evict key cũ. Test bản JS tương đương `lib/rate-limit.ts` (`_rate-limit-logic.mjs`). |
| `audit-logic.test.mjs` | Unit test diff OLD/NEW cho audit_logs: INSERT/DELETE trả toàn bộ record, UPDATE chỉ cột đổi, bỏ qua `updated_at`, không mutate input. |
| `smoke.test.mjs` | Smoke cấu trúc: script package.json, `.env.example`, checklist, migration 001-004, git không track `.env` / không có secret. **Không cần DB thật.** |

> Các test dùng `node:test` + `node:assert/strict` có sẵn trong Node 18+ — **không thêm dependency**.
> Logic rate-limit được nhân bản sang `.mjs` để chạy không cần TS loader; khi sửa `lib/rate-limit.ts` phải giữ 2 bản đồng bộ (hoặc thay bằng bundler sau này).
