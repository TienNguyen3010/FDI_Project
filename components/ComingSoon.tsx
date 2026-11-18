import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui/ui'

/**
 * Route shell cho module P1/P2 chưa implement trong bản rewrite v1.0.
 * Không render inert control: hiển thị Empty State + badge "Bản sau" (skill design-bundle-onboarding).
 */
export default function ComingSoon({ title, description, phase }: { title: string; description: string; phase: string }) {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[30px] font-semibold text-[var(--text)]">{title}</h1>
        <p className="text-sm text-[var(--muted)]">{description}</p>
      </header>
      <Card className="border-[var(--border)] bg-[var(--surface)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Badge variant="default">{phase}</Badge>
            <span>Chưa có trong bản v1.0</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[var(--muted)]">
          <p>Module này nằm trong lộ trình rewrite và sẽ được triển khai ở phase tương ứng.</p>
          <p>
            Xem chi tiết: <code className="rounded bg-[var(--canvas)] px-1.5 py-0.5">docs/REWRITE_PLAN_v1_0.md</code>
          </p>
          <Link href="/dashboard" className="inline-flex h-11 items-center rounded-lg bg-[var(--primary)] px-4 font-medium text-white hover:bg-[var(--primary-hover)]">
            Về Dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
