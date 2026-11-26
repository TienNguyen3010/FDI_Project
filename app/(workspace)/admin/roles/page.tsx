// FDI_Project — ADM-02: /admin/roles (role & permission matrix management)
// Requires admin.role_manage permission.
'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import { useProfile } from '@/lib/hooks/useProfile'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Spinner,
  useToast,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/ui'
import { Download, Upload, ShieldCheck, FileJson } from 'lucide-react'

/** Role matrix (docs/rbac_matrix.md §3) — shown for manager/director. */
const ROLE_MATRIX: {
  feature: string
  employee: string
  leader: string
  manager: string
  director: string
}[] = [
  { feature: 'Dashboard', employee: 'Phần việc của mình', leader: 'Của team', manager: 'Của phòng', director: 'Toàn công ty' },
  { feature: 'Project', employee: 'Xem & cập nhật dự án được gán', leader: 'Tạo/Sửa dự án team, duyệt checklist', manager: 'Toàn bộ dự án phòng, đổi trạng thái', director: 'Xem tất cả, duyệt nghiệm thu' },
  { feature: 'Customer', employee: 'Xem', leader: 'Xem, sửa liên hệ', manager: 'Thêm/Sửa', director: 'Toàn quyền, hợp đồng & giá trị' },
  { feature: 'Device / Serial', employee: 'Nhập khi được gán', leader: 'Sửa / Duyệt', manager: 'Sửa / Xóa', director: 'Xem' },
  { feature: 'Incident', employee: 'Nhận & xử lý', leader: 'Giao việc, đóng', manager: 'Duyệt RCA, xem SLA', director: 'Xem báo cáo' },
  { feature: 'Maintenance', employee: 'Thực hiện', leader: 'Lập lịch', manager: 'Duyệt kế hoạch', director: 'Xem' },
  { feature: 'Work', employee: 'Của mình', leader: 'Giao cho team', manager: 'Giao cho Leader', director: 'Xem' },
  { feature: 'Site Report', employee: 'Tạo', leader: 'Duyệt', manager: 'Duyệt, xuất cho khách', director: 'Xem' },
  { feature: 'Admin', employee: '❌', leader: '❌', manager: 'Thêm user, team', director: 'Toàn quyền' },
]

const ROLE_LABEL: Record<string, string> = {
  employee: 'Nhân viên',
  leader: 'Leader',
  manager: 'Manager',
  director: 'Director',
}

const API_URL = '/api/admin/roles'

interface ImportResult {
  updated: number
  skipped?: { email: string; reason: string }[]
  total?: number
  error?: string
}

export default function RolesPage() {
  const toast = useToast()
  const { role, loading: profileLoading } = useProfile()
  const fileRef = useRef<HTMLInputElement>(null)

  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const allowed = role === 'manager' || role === 'director'

  // --- Export ---
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(API_URL, { cache: 'no-store' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename=\"?([^\";]+)\"?/)
      const filename = match?.[1] ?? `fdi-role-config-${new Date().toISOString().slice(0, 10)}.json`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      toast.success({
        title: 'Xuất cấu hình thành công',
        description: `Đã tải file ${filename}.`,
      })
    } catch (err) {
      toast.error({
        title: 'Xuất cấu hình thất bại',
        description: err instanceof Error ? err.message : 'Lỗi không xác định.',
      })
    } finally {
      setExporting(false)
    }
  }

  // --- Import ---
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result: ImportResult = await res.json()
      if (!res.ok) {
        throw new Error(result.error ?? `HTTP ${res.status}`)
      }
      toast.success({
        title: 'Nhập cấu hình thành công',
        description: `Cập nhật ${result.updated} bản ghi.`,
      })
    } catch (err) {
      toast.error({
        title: 'Nhập cấu hình thất bại',
        description: err instanceof Error ? err.message : 'Lỗi không xác định.',
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vai trò truy cập</h1>
          <p className="text-sm text-muted-foreground">
            Ma trận quyền so sánh giữa DIRECTOR và SYS_ADMIN.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <Download className="h-4 w-4" /> Xuất
        </Button>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Ma trận quyền dành cho ADM-02</h2>
        <Card>
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-4 text-left font-medium">Tính năng</th>
                    <th className="py-2 px-4 text-center font-medium">EMPLOYEE</th>
                    <th className="py-2 px-4 text-center font-medium">LEADER</th>
                    <th className="py-2 px-4 text-center font-medium">MANAGER</th>
                    <th className="py-2 pl-4 text-center font-medium">DIRECTOR</th>
                  </tr>
                </thead>
                <tbody>
                  {ROLE_MATRIX.map((r) => (
                    <tr key={r.feature} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{r.feature}</td>
                      <td className="py-2 px-4 text-center">{r.employee}</td>
                      <td className="py-2 px-4 text-center">{r.leader}</td>
                      <td className="py-2 px-4 text-center">{r.manager}</td>
                      <td className="py-2 pl-4 text-center">{r.director}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Import/Export cấu hình quyền</h2>
        <Card>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="import-file"
              />
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={importing}
              >
                <Upload className="h-4 w-4" /> Tải file
              </Button>
              {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
            </div>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded border bg-muted/30 p-3 text-xs text-muted-foreground">
              {JSON.stringify({
                note: 'Export/Import qua API /api/admin/roles',
                permissions: [
                  'admin.user_manage',
                  'admin.role_manage',
                  'admin.templates.read',
                  'admin.templates.create',
                  'admin.templates.update',
                  'admin.templates.publish',
                  'admin.audit_read',
                  'admin.audit.export',
                ],
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
