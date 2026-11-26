// FDI_Project — ADM-01..04: Admin RBAC layout — single shell (no nested ClientBody).
// The workspace shell (ClientBody) already provides the PROJECT OPS sidebar; wrapping
// admin routes in another ClientBody would double-render two sidebars.
import { Suspense } from 'react';
import { AppShell } from './components';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <AppShell title="Quản trị">{children}</AppShell>
    </Suspense>
  );
}
