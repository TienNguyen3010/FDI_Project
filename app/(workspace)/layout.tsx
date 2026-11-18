import { cookies } from "next/headers";
import { Suspense } from "react";
import ClientBody from "@/components/ClientBody";

// cookies() là request-time API. Với Cache Components, phải nằm trong <Suspense>
// để phần còn lại của route được prerender (Next.js 16).
async function Shell({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get("sidebar_mode")?.value === "collapsed";
  return <ClientBody initialCollapsed={initialCollapsed}>{children}</ClientBody>;
}

// Mọi route nội bộ (dashboard, customers, projects, ...) đều được bọc trong shell này.
export default function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
