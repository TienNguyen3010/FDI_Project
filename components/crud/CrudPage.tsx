'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
import type { Role } from '@/lib/hooks/useProfile'
import {
  Button,
  Input,
  Label,
  Select,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Badge,
  Spinner,
  EmptyState,
  useToast,
} from '@/components/ui/ui'
import { Plus, Pencil, Trash2, Search, RefreshCw } from 'lucide-react'

// CrudPage nhận tên bảng động (config.table: string). supabase-js generic chỉ nhận
// union literal, nên ở đây dùng client "untyped" có chủ đích cho các thao tác CRUD
// động. Phần còn lại của app vẫn dùng Database type strongly-typed.
const db = supabase as unknown as {
  from: (table: string) => {
    select: (cols?: string) => {
      order: (col: string, o: { ascending: boolean }) => Promise<{ data: Row[] | null; error: { message: string } | null }>
      then: (cb: (r: { data: Row[] | null; error: { message: string } | null }) => unknown) => Promise<unknown>
    }
    update: (v: Record<string, unknown>) => { eq: (c: string, val: string) => Promise<{ data: Row[] | null; error: { message: string } | null }> }
    insert: (v: Record<string, unknown>) => { select: (cols?: string) => { single: () => Promise<{ data: Row | null; error: { message: string } | null }> } } & Promise<{ error: { message: string } | null }>
    delete: () => { eq: (c: string, val: string) => Promise<{ error: { message: string } | null }> }
  }
}

export interface FieldConfig {
  key: string
  label: string
  type?: 'text' | 'email' | 'date' | 'number' | 'select' | 'textarea'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  hiddenInTable?: boolean
}

export interface CrudConfig {
  title: string
  description?: string
  table: string
  fields: FieldConfig[]
  /** Cột hiển thị nhãn trạng thái (dùng Badge) */
  statusField?: string
  /** Role được phép tạo/sửa/xóa (RBAC mềm) */
  editableBy: Role[]
  /** Cột dùng làm nhãn chính trong bảng & tiêu đề modal */
  displayField: string
  defaultSort?: { column: string; ascending?: boolean }
}

type Row = Record<string, unknown>

const toDisplay = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export function CrudPage({ config, role }: { config: CrudConfig; role: Role }) {
  const toast = useToast()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Row | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const editable = config.editableBy.includes(role)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const base = db.from(config.table).select('*')
    const result = config.defaultSort
      ? await base.order(config.defaultSort.column, {
          ascending: config.defaultSort.ascending ?? true,
        })
      : await base
    const data = result.data
    const err = result.error
    if (err) setError(err.message)
    else setRows((data as Row[]) ?? [])
    setLoading(false)
  }, [config])

  useEffect(() => {
    // Không gọi load() trực tiếp: load() setLoading(true) đồng bộ trong effect
    // -> React 19 cảnh báo cascade render. Đẩy vào microtask.
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) void load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const visibleRows = useMemo(() => {
    if (!query.trim()) return rows
    const needle = query.toLowerCase()
    return rows.filter((r) =>
      Object.values(r).some((v) => toDisplay(v).toLowerCase().includes(needle))
    )
  }, [rows, query])

  const openNew = () => {
    setEditing(null)
    setForm({})
    setOpen(true)
  }

  const openEdit = (row: Row) => {
    setEditing(row)
    const next: Record<string, string> = {}
    for (const f of config.fields) {
      const v = row[f.key]
      next[f.key] = v === null || v === undefined ? '' : String(v)
    }
    setForm(next)
    setOpen(true)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    const payload: Record<string, string | number | null> = {}
    for (const f of config.fields) {
      const raw = form[f.key] ?? ''
      if (f.required && !raw.trim()) {
        setError(`Vui lòng nhập ${f.label}`)
        setSaving(false)
        return
      }
      let value: string | number | null = raw.trim() === '' ? null : raw.trim()
      if (f.type === 'number' && value !== null) value = Number(value)
      payload[f.key] = value
    }

    let err: { message: string } | null = null
    let auditAction: 'CREATE' | 'UPDATE' = 'CREATE'
    let auditResourceId: string | null = null
    if (editing) {
      const id = editing.id
      const res = await db.from(config.table).update(payload).eq('id', id as string)
      err = res.error
      auditAction = 'UPDATE'
      auditResourceId = id as string
    } else {
      // select().single() trả về id do DB sinh (gen_random_uuid()). Nếu RLS
      // chặn SELECT thì vẫn fallback lấy id từ payload nếu có.
      const res = await db.from(config.table).insert(payload).select('id').single()
      err = res.error
      auditAction = 'CREATE'
      auditResourceId = (res.data?.id as string | undefined) ?? (payload.id as string | undefined) ?? null
    }

    setSaving(false)
    if (err) {
      setError(err.message)
      toast.error({ title: 'Lưu không thành công', description: err.message })
      return
    }
    void logAudit({
      action: auditAction,
      resourceType: config.table,
      resourceId: auditResourceId,
    })
    setOpen(false)
    toast.success({
      title: editing ? 'Cập nhật thành công' : 'Thêm mới thành công',
      description: `${config.title} đã được lưu.`,
    })
    await load()
  }

  const remove = async (row: Row) => {
    if (!window.confirm('Bạn có chắc muốn xóa bản ghi này?')) return
    const { error: err } = await db
      .from(config.table)
      .delete()
      .eq('id', row.id as string)
    if (err) {
      setError(err.message)
      toast.error({ title: 'Xóa không thành công', description: err.message })
      return
    }
    void logAudit({
      action: 'DELETE',
      resourceType: config.table,
      resourceId: row.id as string | null,
    })
    toast.success({ title: 'Xóa thành công', description: `${config.title} đã được xóa.` })
    await load()
  }

  const tableFields = config.fields.filter((f) => !f.hiddenInTable)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{config.title}</h1>
          {config.description && (
            <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-56 pl-9"
              aria-label="Tìm kiếm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={load} aria-label="Tải lại">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {editable && (
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4" /> Thêm mới
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <div className="w-full overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {tableFields.map((f) => (
                  <th
                    key={f.key}
                    className="h-11 px-4 text-left font-medium text-muted-foreground"
                  >
                    {f.label}
                  </th>
                ))}
                {editable && (
                  <th className="h-11 px-4 text-right font-medium text-muted-foreground">
                    Thao tác
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={tableFields.length + (editable ? 1 : 0)}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Spinner label="Đang tải dữ liệu" /> Đang tải dữ liệu...
                    </span>
                  </td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={tableFields.length + (editable ? 1 : 0)} className="p-0">
                    <EmptyState
                      title={query.trim() ? 'Không tìm thấy kết quả' : 'Chưa có dữ liệu'}
                      description={
                        query.trim()
                          ? `Không có ${config.title.toLowerCase()} nào khớp với "${query}".`
                          : `Chưa có ${config.title.toLowerCase()} nào. Nhấn "Thêm mới" để tạo bản ghi đầu tiên.`
                      }
                    />
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr key={String(row.id)} className="border-t border-border hover:bg-muted/30">
                    {tableFields.map((f) => (
                      <td key={f.key} className="px-4 py-2.5">
                        {f.key === config.statusField ? (
                          <Badge variant="default">{toDisplay(row[f.key])}</Badge>
                        ) : (
                          toDisplay(row[f.key])
                        )}
                      </td>
                    ))}
                    {editable && (
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(row)}
                            aria-label="Sửa"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(row)}
                            aria-label="Xóa"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <Modal onClick={() => setOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                {editing ? `Sửa ${config.title}` : `Thêm ${config.title}`}
              </ModalTitle>
            </ModalHeader>
            <ModalBody className="space-y-4">
              {config.fields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={`f-${f.key}`}>
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </Label>
                  {f.type === 'select' ? (
                    <Select
                      id={`f-${f.key}`}
                      value={form[f.key] ?? ''}
                      onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    >
                      <option value="">— Chọn —</option>
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  ) : f.type === 'textarea' ? (
                    <Textarea
                      id={`f-${f.key}`}
                      value={form[f.key] ?? ''}
                      onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                      placeholder={f.placeholder ?? `Nhập ${f.label.toLowerCase()}`}
                    />
                  ) : (
                    <Input
                      id={`f-${f.key}`}
                      type={f.type ?? 'text'}
                      value={form[f.key] ?? ''}
                      onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                      placeholder={f.placeholder ?? `Nhập ${f.label.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}
              {error && <p className="text-sm text-red-500">{error}</p>}
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Hủy
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </div>
  )
}
