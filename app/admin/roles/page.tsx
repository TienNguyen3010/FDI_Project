'use client'

// FDI_Project — §4 #11: UI Export/Import cấu hình quyền (role config).
// Chỉ Manager/Director mới thấy trang (RBAC mềm qua useProfile; RBAC cứng ở
// proxy.ts chặn /admin, và API route tự kiểm tra lại role).

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

/**
 * Ma trận quyền (docs/rbac_matrix.md §3) — hiển thị nhiều nhất trên trang.
 * Giữ đồng bộ với app/api/admin/roles/route.ts (ROLE_MATRIX).
 */
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

  // --- Export: GET → download JSON ---
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
      const match = disposition.match(/filename="?([^";]+)"?/)
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

  // --- Import: đọc JSON → POST → toast ---
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setImporting(true)
    try {
      const text = await file.text()
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        throw new Error('File không phải JSON hợp lệ.')
      }
      const payload =
        typeof parsed === 'object' && parsed !== null && 'users' in parsed
          ? parsed
          : { users: Array.isArray(parsed) ? parsed : [] }

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => ({}))) as ImportResult
      if (!res.ok) {
        const invalid = (data as { invalid?: string[] }).invalid
        throw new Error(
          data.error ?? `HTTP ${res.status}` + (invalid?.length ? `: ${invalid.slice(0, 3).join('; ')}` : '')
        )
      }
      const skippedCount = data.skipped?.length ?? 0
      toast.success({
        title: 'Import cấu hình thành công',
        description: `Cập nhật ${data.updated}/${data.total ?? data.updated} user.${skippedCount ? ` Bỏ qua ${skippedCount} dòng.` : ''}`,
      })
      if (skippedCount > 0) {
        toast.warning({
          title: 'Một số dòng bị bỏ qua',
          description: (data.skipped ?? []).slice(0, 2).map((s) => `${s.email}: ${s.reason}`).join('; '),
        })
      }
    } catch (err) {
      toast.error({
        title: 'Import thất bại',
        description: err instanceof Error ? err.message : 'Lỗi không xác định.',
      })
    } finally {
      setImporting(false)
      // Cho phép chọn lại cùng 1 file sau khi import.
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (profileLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-[var(--text-secondary)]">
        <Spinner /> Đang kiểm tra quyền…
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Không có quyền truy cập</CardTitle>
            <CardDescription>
              Chỉ Manager/Director được export/import cấu hình quyền.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Cấu hình quyền (Role Config)
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Xuất cấu hình vai trò của người dùng ra JSON, nhập lại để cập nhật hàng loạt.
          Mọi thay đổi được ghi vào nhật ký hoạt động (audit log).
        </p>
      </div>

      {/* Export / Import */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download size={18} /> Xuất cấu hình
            </CardTitle>
            <CardDescription>
              Tải file JSON gồm danh sách user (email, role, team, active) và ma trận quyền.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? <Spinner label="Đang xuất" /> : <FileJson size={16} />}
              {exporting ? 'Đang xuất…' : 'Xuất cấu hình'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload size={18} /> Nhập cấu hình
            </CardTitle>
            <CardDescription>
              Chọn file JSON (có khóa <code>users</code>). Cập nhật theo email, role hợp lệ:
              employee, leader, manager, director.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              disabled={importing}
              aria-label="Chọn file cấu hình quyền JSON"
              className="block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--bg-secondary)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--text-primary)]"
            />
            {importing && (
              <span className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Spinner label="Đang nhập" /> Đang nhập cấu hình…
              </span>
            )}
            {fileName && !importing && (
              <span className="text-xs text-[var(--text-secondary)]">File đã chọn: {fileName}</span>
            )}
            <p className="text-xs text-[var(--text-secondary)]">
              Lưu ý: chỉ cập nhật user đã tồn tại. Không tự hạ quyền của chính mình.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ma trận quyền */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck size={18} /> Ma trận quyền theo vai trò
          </CardTitle>
          <CardDescription>
            Tham khảo từ <code>docs/rbac_matrix.md</code> — 4 vai trò × 9 tính năng.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tính năng</TableHead>
                {(['employee', 'leader', 'manager', 'director'] as const).map((r) => (
                  <TableHead key={r}>{ROLE_LABEL[r]}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROLE_MATRIX.map((row) => (
                <TableRow key={row.feature}>
                  <TableCell className="font-medium">{row.feature}</TableCell>
                  {(['employee', 'leader', 'manager', 'director'] as const).map((r) => {
                    const value = row[r]
                    const denied = value === '❌'
                    return (
                      <TableCell key={r}>
                        {denied ? (
                          <Badge variant="critical">Không</Badge>
                        ) : (
                          <span className="text-sm text-[var(--text-secondary)]">{value}</span>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-[var(--text-secondary)]">
        Vai trò hiện tại của bạn: <Badge>{ROLE_LABEL[role] ?? role}</Badge>
      </p>
    </div>
  )
}
