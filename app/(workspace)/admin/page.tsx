// FDI_Project — ADM-00: /admin (admin dashboard — module navigation)
// 'use client'
//
// Landing màn quản trị: hiển thị danh sách module quản trị (users/roles/
// templates/audit) + button switch để chuyển module. Không render logic
// CRUD trực tiếp; mỗi module là một route con tuyệt đối /admin/{name}.

'use client'

import { useState } from 'react'
import { useProfile } from '@/lib/hooks/useProfile'
import { Button } from '@/components/ui/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/ui'
import { Users, ShieldCheck, FileCode, ClipboardCheck, BarChart3, LayoutDashboard } from 'lucide-react'

interface Module {
  name: 'users' | 'roles' | 'templates' | 'audit'
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  route: string
}

const MODULES: Module[] = [
  {
    name: 'users',
    label: 'Người dùng',
    description: 'Quản lý người dùng, team và cấu hình hệ thống (ADM-01).',
    icon: Users,
    route: '/admin/users',
  },
  {
    name: 'roles',
    label: 'Vai trò',
    description: 'Quản lý vai trò và ma trận quyền (ADM-02).',
    icon: ShieldCheck,
    route: '/admin/roles',
  },
  {
    name: 'templates',
    label: 'Bộ quyền',
    description: 'Quản lý bộ quyền mẫu, publish và so sánh phiên bản (ADM-03).',
    icon: FileCode,
    route: '/admin/templates',
  },
  {
    name: 'audit',
    label: 'Nhật ký',
    description: 'Nhật ký hoạt động và kết quả điều chỉnh (ADM-04).',
    icon: ClipboardCheck,
    route: '/admin/audit',
  },
]

export default function AdminModules() {
  const { role } = useProfile()
  const [active, setActive] = useState<Module['name']>('users')

  // super_admin + director + manager + project_manager được phép truy cập admin
  const canAccess = role !== null

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quản trị</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {canAccess
              ? 'Chọn module quản trị để làm việc.'
              : 'Bạn không đủ quyền truy cập quản trị.'}
          </p>
        </div>
        {canAccess && (
          <Button variant="outline" size="sm" asChild>
            <a href="/admin/users">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Tổng quan
            </a>
          </Button>
        )}
      </div>

      {/* Module grid */}
      {canAccess ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((m) => {
            const activeModule = m.name === active
            const Icon = m.icon
            return (
              <Button
                key={m.name}
                variant={activeModule ? 'default' : 'outline'}
                className="h-auto justify-start space-x-4 py-5 text-left"
                onClick={() => setActive(m.name)}
              >
                <Icon className={`h-6 w-6 shrink-0 ${activeModule ? 'text-white' : ''}`} />
                <div>
                  <p className={`text-sm font-semibold ${activeModule ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {m.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                </div>
              </Button>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-semibold text-foreground">Không có quyền truy cập</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Hãy liên hệ quản trị viên để được cấp quyền tham gia hệ thống quản trị.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
