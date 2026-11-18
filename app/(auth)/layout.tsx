// Layout tối giản cho các trang xác thực: KHÔNG bọc ClientBody,
// nên sidebar nội bộ không bao giờ xuất hiện trên /login.
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
