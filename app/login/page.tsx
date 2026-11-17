'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getSupabaseClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/ui'
import { Input } from '@/components/ui/ui'
import { Label } from '@/components/ui/ui'
import { Card, CardContent } from '@/components/ui/ui'
import { Loader2, Mail, Lock, ShieldCheck, ArrowLeft } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const router = useRouter()
  const [callbackUrl, setCallbackUrl] = useState('/dashboard')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    reset({ email: '', password: '' })
  }, [reset])

  useEffect(() => {
    searchParams.then((params) => {
      if (params?.callbackUrl) setCallbackUrl(params.callbackUrl)
    })
  }, [searchParams])

  const handleEmailLogin = async (data: LoginFormValues) => {
    setIsLoading(true)
    setMessage(null)

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          // Lưu token qua route handler -> cookie HttpOnly (không cho JS đọc).
          const res = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: session.access_token }),
          })
          if (!res.ok) {
            setMessage({ type: 'error', text: 'Không lưu được phiên đăng nhập.' })
            return
          }
          router.replace(callbackUrl)
        } else {
          setMessage({ type: 'error', text: 'Không nhận được session sau đăng nhập.' })
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Đăng nhập thất bại. Vui lòng thử lại.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.3),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(34,197,94,0.2),transparent_40%)]" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <ShieldCheck className="h-6 w-6 text-blue-300" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">FDI_Project</p>
              <p className="text-xs text-slate-400">Quản Lý Dự Án, Vận Hành, Sự Cố</p>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="text-3xl font-semibold text-white">Đăng Nhập</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Truy cập hệ thống quản lý dự án, vận hành, sự cố &amp; Site Report.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { label: 'Quản lý dự án', value: 'Tất cả dự án' },
              { label: 'Xử lý sự cố', value: 'Cảnh báo, bảo trì' },
              { label: 'RBAC chặt chẽ', value: '4 role' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-700/30 bg-white/5 p-3">
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="mt-1 text-sm font-medium text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-slate-500">© FDI_Project · Bảo mật · Tuân thủ</p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-slate-50/60 px-4 lg:w-1/2">
        <div className="w-full max-w-md px-6 py-10">
          <div className="mb-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay về Dashboard
            </button>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Đăng nhập</h2>
            <p className="mt-1 text-sm text-slate-500">Nhập email và mật khẩu để truy cập hệ thống</p>
          </div>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit(handleEmailLogin)} className="space-y-5">
                {message && (
                  <div
                    className={`rounded-lg border px-3 py-2.5 text-sm ${
                      message.type === 'error'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      className="h-10 rounded-lg border-slate-200 bg-slate-50/40 pl-10 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                      {...register('email')}
                      aria-invalid={errors.email ? 'true' : 'false'}
                    />
                  </div>
                  {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">Mật khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="h-10 rounded-lg border-slate-200 bg-slate-50/40 pl-10 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                      {...register('password')}
                      aria-invalid={errors.password ? 'true' : 'false'}
                    />
                  </div>
                  {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
                </div>

                <Button
                  type="submit"
                  className="h-10 w-full rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang đăng nhập...
                    </span>
                  ) : (
                    'Đăng nhập'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 text-center text-sm text-slate-500">
            <a href="#" className="text-blue-600 underline underline-offset-4 hover:text-blue-700">Quên mật khẩu?</a>
          </div>
        </div>
      </div>
    </div>
  )
}
