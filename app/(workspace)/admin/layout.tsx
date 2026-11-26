// FDI_Project — ADM-01..04: Admin RBAC layout — nested shell
import { Suspense } from 'react'
import ClientBody from '@/components/ClientBody'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <ClientBody>{children}</ClientBody>
    </Suspense>
  )
}
