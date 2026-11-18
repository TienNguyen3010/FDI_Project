// Project OPS v1.0 — GET /api/v1/dashboard/health.
import { resolvedScope, envelope, DEFINITIONS } from '@/lib/metrics/contract'

// Cache Components enabled: route tự dynamic vì authorize() đọc cookies().
export async function GET(request: Request) {
  const ctx = await resolvedScope(request)
  if (!ctx.ok) return ctx.response
  return Response.json({
    ...envelope(DEFINITIONS.health, ctx.asOf, ctx.scope, 'complete'),
    data: { status: 'ok', scope_resolved: true },
  })
}
