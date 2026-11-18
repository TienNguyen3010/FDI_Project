import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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

// Root layout duy nhất: chỉ chứa html/body/font/metadata.
// Shell nội bộ nằm ở app/(workspace)/layout.tsx để trang login không bị lộ sidebar.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
