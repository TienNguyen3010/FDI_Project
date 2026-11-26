// FDI_Project — ADM-03: /admin/permission-templates (permission templates)
// 'use client'
//
// Màn quản lý bộ quyền mẫu (ADM-03): danh sách template, tạo/sửa draft/publish,
// lịch sử phiên bản, so sánh bản ghi. Tương ứng với route /admin/permission-templates.
//
// Phân quyền:
//   SYS_ADMIN / DIRECTOR / PM / ENGINEER / SUPPORT / CUSTOMER_VIEWER đều có
//   admin.role_manage + admin.templates.read (spec ADM grant matrix).
//   Thao tác tạo/publish chỉ SYS_ADMIN + DIRECTOR (spec ODT matrix).

'use client'

import { useState, useCallback, useRef, type ChangeEvent } from 'react'
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
import { Download, Upload, FileCode, Plus, Trash2 } from 'lucide-react'

interface TemplateRow {
  code: string
  name: string
  description: string
  state: 'draft' | 'published' | 'retired'
  owner: string
  created_at: string
  updated_at: string
}

const SEED_TEMPLATES: TemplateRow[] = [
  { code: 'adm-users', name: 'ADM Users', description: 'Quản lý người dùng, team, phiên.', state: 'published', owner: 'sys_admin', created_at: '2026-11-25T09:10:00Z', updated_at: '2026-11-25T09:10:00Z' },
  { code: 'adm-roles', name: 'ADM Roles', description: 'Vai trò + ma trận quyền.', state: 'published', owner: 'sys_admin', created_at: '2026-11-25T09:10:00Z', updated_at: '2026-11-25T09:10:00Z' },
  { code: 'adm-templates', name: 'ADM Permission Templates', description: 'Bộ quyền mẫu, publish và so sánh phiên bản.', state: 'draft', owner: 'sys_admin', created_at: '2026-11-25T09:10:00Z', updated_at: '2026-11-25T09:10:00Z' },
  { code: 'adm-audit', name: 'ADM Audit Log', description: 'Nhật ký hoạt động và kết quả điều chỉnh.', state: 'published', owner: 'sys_admin', created_at: '2026-11-25T09:10:00Z', updated_at: '2026-11-25T09:10:00Z' },
  { code: 'ops-dashboard', name: 'ODS Dashboard', description: 'Technical oversight dashboard.', state: 'published', owner: 'director', created_at: '2026-11-25T09:10:00Z', updated_at: '2026-11-25T09:10:00Z' },
]

export default function PermissionTemplatesPage() {
  const toast = useToast()
  const { role, loading: profileLoading, can } = useProfile()
  const [templates, setTemplates] = useState<TemplateRow[]>(SEED_TEMPLATES)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const allowed = role === 'super_admin' || role === 'director'
  const canAdmin = can('admin.template_create')
  const canRead = can('admin.templates.read')

  const filtered = templates.filter((t) => t.code.toLowerCase().includes(search.toLowerCase()))

  const handleCreate = useCallback(() => {
    const code = prompt('Mã template (VD: adm-new):')
    if (!code) return
    setTemplates((prev) => [
      ...prev,
      { code, name: 'Tạm chưa đặt', description: 'Mới tạo từ form.', state: 'draft', owner: role ?? 'sys_admin', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ])
    toast.success({ title: 'Tạo draft thành công.', description: `Template ${code} đã tạo ở trạng thái draft.` })
  }, [role, toast])

  const handlePublish = useCallback((code: string) => {
    if (role !== 'super_admin' && role !== 'director') { toast.error({ title: 'Cấm', description: 'Chỉ SYS_ADMIN / DIRECTOR mới publish template.' }); return }
    if (!confirm(`Publish template ${code}?`)) return
    setTemplates((prev) => prev.map((t) => (t.code === code ? { ...t, state: 'published', updated_at: new Date().toISOString() } : t)))
    toast.success({ title: 'Publish thành công.' })
  }, [role, toast])

  const handleRetire = useCallback((code: string) => {
    if (role !== 'super_admin' && role !== 'director') { toast.error({ title: 'Cấm', description: 'Chỉ SYS_ADMIN / DIRECTOR mới retire template.' }); return }
    if (!confirm(`Retire template ${code}?`)) return
    setTemplates((prev) => prev.map((t) => (t.code === code ? { ...t, state: 'retired', updated_at: new Date().toISOString() } : t)))
    toast.success({ title: 'Retire thành công.' })
  }, [role, toast])

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/admin/permission-templates', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename=\\"([^\\";]+)\\"/)
      const filename = match?.[1] ?? `fdi-permission-templates-${new Date().toISOString().slice(0, 10)}.json`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      toast.success({ title: 'Xuất thành công', description: `File ${filename}.` })
    } catch (err) {
      toast.error({ title: 'Xuất thất bại', description: err instanceof Error ? err.message : 'Lỗi không xác định.' })
    } finally { setExporting(false) }
  }, [toast])

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text) as { items?: unknown[] }
      const res = await fetch('/api/admin/permission-templates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: data.items }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? `HTTP ${res.status}`)
      toast.success({ title: 'Nhập thành công', description: `Cập nhật ${result.updated ?? 0} bản ghi.` })
    } catch (err) {
      toast.error({ title: 'Nhập thất bại', description: err instanceof Error ? err.message : 'Lỗi không xác định.' })
    } finally { setImporting(false) }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bộ Quyền Mẫu</h1>
          <p className="text-sm text-muted-foreground">Quản lý bộ quyền mẫu, publish và so sánh phiên bản (ADM-03).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || !allowed}><Download className="h-4 w-4" /> Xuất</Button>
          <Button variant="outline" size="sm" onClick={() => document.getElementById('import-file')?.click()} disabled={importing || !allowed}><Upload className="h-4 w-4" /> Nhập</Button>
          {allowed && <Button variant="default" size="sm" onClick={handleCreate}><Plus className="h-4 w-4" /> Tạo draft</Button>}
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã template..." className="w-72 rounded border border-border px-3 py-2 text-sm" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead>Mã</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.code}>
                  <TableCell className="font-mono text-xs">{t.code}</TableCell>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.description}</TableCell>
                  <TableCell><Badge variant={t.state === 'published' ? 'default' : (t.state === 'draft' ? 'secondary' : 'minor')}>{t.state}</Badge></TableCell>
                  <TableCell>{t.owner}</TableCell>
                  <TableCell className="text-right">
                    {allowed ? (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handlePublish(t.code)} disabled={saving || t.state === 'published'} title="Publish"><Plus className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleRetire(t.code)} disabled={saving || t.state === 'retired'} title="Retire"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                      </div>
                    ) : canRead ? <span className="text-xs text-muted-foreground">Cấm</span> : <span className="text-xs text-muted-foreground">Cấm</span>}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell className="text-center text-sm text-muted-foreground py-6">Không có template.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <input ref={fileRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" id="import-file" />
      {importing && <p className="mt-2 text-sm text-muted-foreground">Đang nhập file...</p>}
    </div>
  )
}
