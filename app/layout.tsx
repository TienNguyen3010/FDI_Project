import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { Suspense } from "react";
import "./globals.css";
import ClientBody from "@/components/ClientBody";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FDI_Project — Quản Lý Dự Án, Vận Hành, Sự Cố & Site Report",
  description:
    "Nền tảng quản lý dự án, vận hành, sự cố & Site Report cho miền FDI / CNTT / VoIP / Viễn thông / Network Infrastructure",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🗂️</text></svg>",
  },
};

// cookies() là request-time API. Với Cache Components, phải nằm trong <Suspense>
// để phần còn lại của route được prerender (Next.js 16).
async function Shell({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get("sidebar_mode")?.value === "collapsed";
  return <ClientBody initialCollapsed={initialCollapsed}>{children}</ClientBody>;
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <Shell>{children}</Shell>
        </Suspense>
      </body>
    </html>
  );
}
