import { redirect } from 'next/navigation'

// Entry point `/` → /dashboard. Proxy xử lý auth: nếu chưa đăng nhập,
// /dashboard sẽ redirect /login?callbackUrl=/dashboard.
export default function Home() {
  redirect('/dashboard')
}
