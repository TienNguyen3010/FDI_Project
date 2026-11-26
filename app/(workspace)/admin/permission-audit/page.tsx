// FDI_Project — ADM-04: /admin/permission-audit (permission audit log)
// 'use client'
//
// Màn đọc-only audit log (ADM-04): lịch sử thao tác quản trị + kết quả
// điều chỉnh (before/after, export async, redact secrets). Tương ứng route
// /admin/permission-audit.
//
// Phân quyền: admin.audit_read (SYS_ADMIN + DIRECTOR + PM + ENGINEER + SUPPORT
// + CUSTOMER_VIEWER theo spec ADM grant matrix). Export async chỉ SYS_ADMIN
// + DIRECTOR.

'use client'

import { useState, useCallback, useRef, type ChangeEvent, useEffect } from 'react'
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
import { Download, Filter, RefreshCw, FileText, Clock, Target, Activity } from 'lucide-react'

interface AuditRow {
  id: string
  occurred_at: string
  action: string
  target_type: string
  target_id: string
  outcome: 'allow' | 'deny' | 'success' | 'fail'
  reason: string
  request_id: string
  policy_version: string
  before_redacted: string
  after_redacted: string
  metadata_redact: string
}

const SEED_AUDIT: AuditRow[] = [
  { id: 'audit-0001', occurred_at: '2026-11-25T09:12:03Z', action: 'user.create', target_type: 'iam.user', target_id: 'u_3f2a', outcome: 'allow', reason: 'SYS_ADMIN seed', request_id: 'req-0001', policy_version: 'v1.1', before_redacted: '{"email":"admin@fdi.local"}', after_redacted: '{"email":"admin@fdi.local","active":true}', metadata_redact: 'role=super_admin' },
  { id: 'audit-0002', occurred_at: '2026-11-25T09:18:47Z', action: 'role.assign', target_type: 'iam.role', target_id: 'r_9c1b', outcome: 'allow', reason: 'Director promoted to manager', request_id: 'req-0002', policy_version: 'v1.1', before_redacted: '{"role":"director"}', after_redacted: '{"role":"manager"}', metadata_redact: 'user=admin@fdi.local' },
  { id: 'audit-0003', occurred_at: '2026-11-24T16:02:11Z', action: 'template.publish', target_type: 'template', target_id: 't_7d4e', outcome: 'allow', reason: 'Publish ADM templates', request_id: 'req-0003', policy_version: 'v1.1', before_redacted: '{"code":"adm-users","state":"draft"}', after_redacted: '{"code":"adm-users","state":"published"}', metadata_redact: 'actor=sys_admin' },
  { id: 'audit-0004', occurred_at: '2026-11-24T11:30:00Z', action: 'user.suspend', target_type: 'iam.user', target_id: 'u_d2b6', outcome: 'deny', reason: 'Insufficient scope', request_id: 'req-0004', policy_version: 'v1.0', before_redacted: '{"email":"worker@fdi.local","active":true}', after_redacted: '{"email":"worker@fdi.local","active":true}', metadata_redact: 'role=engineer' },
  { id: 'audit-0005', occurred_at: '2026-11-23T20:15:33Z', action: 'audit.export', target_type: 'audit', target_id: 'e_8a2c', outcome: 'success', reason: 'Export permission_audit to s3', request_id: 'req-0005', policy_version: 'v1.1', before_redacted: '{}', after_redacted: '{"s3_key":"fdi-audit-20261123.json"}','metadata_redact': 'format=json' },
  { id: 'audit-0006', occurred_at: '2026-11-22T14:05:22Z', action: 'config.import', target_type: 'iam.role_grants', target_id: 'g_5f1e', outcome: 'success', reason: 'Import role grants JSON', request_id: 'req-0006', policy_version: 'v1.1', before_redacted: '{}', after_redacted: '{"grants":[...]}','metadata_redact': 'count=12' },
]

const OUTCOME_COLOR: Record<string, 'default' | 'secondary' | 'minor' | 'critical' | 'inactive'> = {
  allow: 'default',
  deny: 'critical',
  success: 'secondary',
  fail: 'inactive',
}

export default function PermissionAuditPage() {
  const toast = useToast()
  const { role, loading: profileLoading } = useProfile()
  const [rows, setRows] = useState<AuditRow[]>(SEED_AUDIT)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const allowed = role !== null // admin.* granted to all roles per spec

  // --- filtered ---
  const filtered = rows.filter((r) => {
    if (search && !`${r.id} ${r.action} ${r.target_type}`.toLowerCase().includes(search.toLowerCase())) return false
    if (actionFilter && r.action !== actionFilter) return false
    if (outcomeFilter && r.outcome !== outcomeFilter) return false
    return true
  })

  // --- load live ---
  const handleLoad = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/permission-audit', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setRows(Array.isArray(data.items) ? data.items : [])
      toast.success({ title: 'Nạp bản mới thành công', description: `Có ${data.pagination?.total ?? 0} transaction.` })
    } catch (err) {
      toast.error({ title: 'Nạp thất bại', description: err instanceof Error ? err.message : 'Lỗi không xác định.' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { handleLoad(); const id = setInterval(handleLoad, 30000); return () => clearInterval(id) }, [handleLoad])

  // --- export async (only SYS_ADMIN + DIRECTOR) ---
  const handleExport = useCallback(async () => {
    if (!allowed) { toast.error({ title: 'Cấm', description: 'Chỉ SYS_ADMIN / DIRECTOR mới export audit.' }); return }
    setExporting(true)
    try {
      const res = await fetch('/api/admin/permission-audit/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format: 'json' }) })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const contentType = res.headers.get('Content-Type') ?? ''
      if (contentType.includes('application/json')) {
        const data = await res.json()
        toast.success({ title: 'Export hoàn tất', description: `File: ${data.file ?? 'permission_audit.json'}` })
      } else {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'permission_audit_export.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
        toast.success({ title: 'Export xong', description: 'Đã tải file permission_audit_export.json.' })
      }
    } catch (err) {
      toast.error({ title: 'Export thất bại', description: err instanceof Error ? err.message : 'Lỗi không xác định.' })
    } finally {
      setExporting(false)
    }
  }, [allowed, toast])

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nhật ký quyền</h1>
          <p className="text-sm text-muted-foreground">Nhật ký hoạt động và kết quả điều chỉnh (ADM-04). Cập nhật mỗi 30s.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleLoad} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới</Button>
          {allowed && <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || !allowed}><Download className="h-4 w-4" /> Xuất</Button>}
        </div>
      </div>

      <Card className="mt-4">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead>Thời gian</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>Nguồn</TableHead>
                <TableHead>Đối tượng</TableHead>
                <TableHead>Kết quả</TableHead>
                <TableHead>Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.occurred_at}</TableCell>
                  <TableCell className="font-mono text-xs">{r.action}</TableCell>
                  <TableCell>{r.target_type}</TableCell>
                  <TableCell>{r.target_id}</TableCell>
                  <TableCell><Badge variant={OUTCOME_COLOR[r.outcome] === 'secondary' ? 'secondary' : OUTCOME_COLOR[r.outcome]}>{r.outcome}</Badge></TableCell>
                  <TableCell className="max-w-40 truncate text-xs text-muted-foreground">{r.reason}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell className="text-center text-sm text-muted-foreground py-6">Không có bản ghi.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm..." className="rounded border border-border px-3 py-2 text-sm w-64" />
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="rounded border border-border px-3 py-2 text-sm">
          <option value="">Tất cả hành động</option>
          {['user.create','role.assign','template.publish','user.suspend','audit.export','config.import'].map((a) => <option key={a}>{a}</option>)}
        </select>
        <select value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value)} className="rounded border border-border px-3 py-2 text-sm">
          <option value="">Tất cả kết quả</option>
          {['allow','deny','success','fail'].map((o) => <option key={o}>{o}</option>)}
        </select>
      </div>
    </div>
  )
}
