import { Suspense } from 'react'
import { AlertDetail } from './AlertDetail'

/**
 * Trang chi tiết sự cố (app/alerts/[id]/page.tsx).
 * Không sửa app/alerts/page.tsx (config CrudPage mỏng) — đây là route con mới.
 * params là Promise trong Next.js 16; truyền thẳng xuống client child và bọc
 * <Suspense> vì cacheComponents treats dynamic params như runtime data.
 */
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Đang tải sự cố...</div>}>
      <AlertDetail params={params} />
    </Suspense>
  )
}
