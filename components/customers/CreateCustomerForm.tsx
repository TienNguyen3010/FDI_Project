'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Spinner,
  Textarea,
  useToast,
} from '@/components/ui/ui'

type FieldKey =
  | 'name'
  | 'tax_id'
  | 'industry'
  | 'headquarters_address'
  | 'primary_contact_name'
  | 'primary_contact_position'
  | 'phone'
  | 'email'
  | 'contact_technical'
  | 'contact_commercial'
  | 'contact_emergency'
  | 'notes'

type FormState = Record<FieldKey, string>

const EMPTY: FormState = {
  name: '',
  tax_id: '',
  industry: '',
  headquarters_address: '',
  primary_contact_name: '',
  primary_contact_position: '',
  phone: '',
  email: '',
  contact_technical: '',
  contact_commercial: '',
  contact_emergency: '',
  notes: '',
}

const INDUSTRIES = [
  { value: 'Manufacturing', label: 'Sản xuất' },
  { value: 'IT', label: 'Công nghệ thông tin' },
  { value: 'Finance', label: 'Tài chính – Ngân hàng' },
  { value: 'Logistics', label: 'Logistics' },
  { value: 'Retail', label: 'Bán lẻ' },
  { value: 'Other', label: 'Khác' },
]

const REQUIRED: FieldKey[] = [
  'name',
  'headquarters_address',
  'primary_contact_name',
  'phone',
  'email',
]

const LABELS: Record<FieldKey, string> = {
  name: 'Tên khách hàng',
  tax_id: 'Mã số thuế',
  industry: 'Ngành nghề',
  headquarters_address: 'Địa chỉ trụ sở chính',
  primary_contact_name: 'Người liên hệ chính',
  primary_contact_position: 'Chức vụ',
  phone: 'Số điện thoại',
  email: 'Email',
  contact_technical: 'Liên hệ kỹ thuật',
  contact_commercial: 'Liên hệ thương mại',
  contact_emergency: 'Liên hệ khẩn cấp',
  notes: 'Ghi chú',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^(\+?84|0)[0-9]{9,10}$/

// CrudPage.tsx:26-39 dùng kỹ thuật tương tự: tên bảng/cột động nên generic
// của supabase-js không khớp union literal. Payload chứa cả bool (consent) và
// null (optional để trống) nên type là Record<string, string | boolean | null>.
const db = supabase as unknown as {
  from: (table: string) => {
    insert: (v: Record<string, string | boolean | null>) => Promise<{ error: { message: string } | null }>
  }
}

export default function CreateCustomerForm() {
  const router = useRouter()
  const toast = useToast()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [saving, setSaving] = useState(false)
  const [consentContact, setConsentContact] = useState(false)

  // Mã do backend tự sinh khi lưu; UI chỉ hiển thị readonly "Tự động tạo".
  // dirty chỉ tính từ form — không tính từ ô mã hiển thị.
  const dirty = useMemo(
    () => (Object.keys(form) as FieldKey[]).some((k) => form[k] !== EMPTY[k]),
    [form],
  )

  const setField = (key: FieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  // Rule chặn submit cho 1 field. Phone KHÔNG có rule regex ở đây — định dạng
  // sai chỉ là cảnh báo inline, không chặn lưu.
  const fieldError = (key: FieldKey, value: string): string | undefined => {
    const trimmed = value.trim()
    if (REQUIRED.includes(key) && !trimmed) {
      return `Vui lòng nhập ${LABELS[key].toLowerCase()}`
    }
    if (key === 'name' && trimmed && trimmed.length < 2) {
      return 'Tên khách hàng phải có ít nhất 2 ký tự'
    }
    if (key === 'email' && trimmed && !EMAIL_RE.test(trimmed)) {
      return 'Email không hợp lệ'
    }
    return undefined
  }

  const validate = (): boolean => {
    const next: Partial<Record<FieldKey, string>> = {}
    for (const key of Object.keys(form) as FieldKey[]) {
      const err = fieldError(key, form[key])
      if (err) next[key] = err
    }
    setErrors(next)
    const firstKey = Object.keys(next)[0] as FieldKey | undefined
    if (firstKey) {
      const el = document.getElementById(`f-${firstKey}`)
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el?.focus()
    }
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving || !validate()) return
    setSaving(true)
    const payload: Record<string, string | boolean | null> = {}
    for (const key of Object.keys(form) as FieldKey[]) {
      const trimmed = form[key].trim()
      // Optional để trống → null; required đã chắc chắn có giá trị sau validate.
      // Email chuẩn hoá lowercase khi đưa vào payload.
      payload[key] = trimmed
        ? key === 'email'
          ? trimmed.toLowerCase()
          : trimmed
        : null
    }
    payload.consent_contact = consentContact
    payload.consent_contact_at = consentContact ? new Date().toISOString() : null
    const { error } = await db.from('customers').insert(payload)
    setSaving(false)
    if (error) {
      toast.error({ title: 'Lưu không thành công', description: error.message })
      return
    }
    toast.success({ title: 'Thêm khách hàng thành công' })
    router.push('/customers')
  }

  const handleCancel = () => {
    if (dirty && !window.confirm('Rời trang và bỏ thay đổi?')) return
    router.push('/customers')
  }

  const fieldProps = (key: FieldKey) => ({
    id: `f-${key}`,
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setField(key, e.target.value),
    onBlur: () => setErrors((prev) => ({ ...prev, [key]: fieldError(key, form[key]) })),
    'aria-invalid': Boolean(errors[key]),
    'aria-describedby': errors[key] ? `err-${key}` : undefined,
  })

  const errorFor = (key: FieldKey) =>
    errors[key] ? (
      <p id={`err-${key}`} className="text-xs text-destructive">
        {errors[key]}
      </p>
    ) : null

  // Cảnh báo số điện thoại: derive từ state, KHÔNG đưa vào errors chặn submit.
  const phoneWarning = Boolean(form.phone.trim()) && !PHONE_RE.test(form.phone.replace(/[\s()-]/g, ''))

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-6">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <span>Trang chủ</span> / <span>Khách hàng</span>{' '}
          <span className="text-foreground">/ Thêm khách hàng</span>
        </nav>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Thêm khách hàng mới</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tạo hồ sơ khách hàng (doanh nghiệp/đơn vị) để quản lý dự án, dịch vụ và hỗ trợ vận hành.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin doanh nghiệp</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="f-name">
                  Tên khách hàng <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...fieldProps('name')}
                  placeholder="Nhập tên khách hàng (ví dụ: Công ty ABC)"
                  maxLength={255}
                />
                {errorFor('name')}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-code">Mã khách hàng</Label>
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground"
                  >
                    CUS-
                  </span>
                  <Input
                    id="f-code"
                    readOnly
                    value="Tự động tạo"
                    className="pl-12"
                    aria-describedby="code-hint"
                    tabIndex={-1}
                  />
                </div>
                <p id="code-hint" className="text-xs text-muted-foreground">
                  Mã được hệ thống tạo khi lưu
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-tax_id">Mã số thuế</Label>
                <Input {...fieldProps('tax_id')} placeholder="Nhập mã số thuế (nếu có)" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-industry">Ngành nghề</Label>
                <Select {...fieldProps('industry')}>
                  <option value="">Chọn ngành nghề</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i.value} value={i.value}>{i.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="f-headquarters_address">
                  Địa chỉ trụ sở chính <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...fieldProps('headquarters_address')}
                  placeholder="Nhập địa chỉ trụ sở chính"
                />
                {errorFor('headquarters_address')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Người liên hệ chính</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="f-primary_contact_name">
                  Người liên hệ <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...fieldProps('primary_contact_name')}
                  placeholder="Nhập họ và tên người liên hệ"
                />
                {errorFor('primary_contact_name')}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-primary_contact_position">Chức vụ</Label>
                <Input
                  {...fieldProps('primary_contact_position')}
                  placeholder="Nhập chức vụ (ví dụ: Trưởng phòng IT)"
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-phone">
                  Số điện thoại <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...fieldProps('phone')}
                  type="tel"
                  placeholder="Nhập số điện thoại (ví dụ: 0909 123 456)"
                />
                {errorFor('phone')}
                {phoneWarning && (
                  <p className="text-xs text-warning">
                    Số điện thoại chưa đúng định dạng (0xxxxxxxxx hoặc +84xxxxxxxx) — bạn vẫn có thể lưu.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...fieldProps('email')}
                  type="email"
                  placeholder="Nhập email (ví dụ: contact@company.com)"
                />
                {errorFor('email')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thông tin bổ sung</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="f-contact_technical">Liên hệ kỹ thuật</Label>
                <Input
                  {...fieldProps('contact_technical')}
                  placeholder="Nhập thông tin liên hệ kỹ thuật (nếu khác)"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-contact_commercial">Liên hệ thương mại</Label>
                <Input
                  {...fieldProps('contact_commercial')}
                  placeholder="Nhập thông tin liên hệ thương mại (nếu khác)"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-contact_emergency">Liên hệ khẩn cấp</Label>
                <Input
                  {...fieldProps('contact_emergency')}
                  placeholder="Nhập số điện thoại khẩn cấp (24/7)"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-notes">Ghi chú</Label>
                <Textarea
                  {...fieldProps('notes')}
                  maxLength={500}
                  rows={4}
                  placeholder="Nhập ghi chú, thông tin đặc biệt hoặc yêu cầu khác..."
                />
                <p className="text-right text-xs text-muted-foreground">{form.notes.length} / 500</p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="f-consent_contact" className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    id="f-consent_contact"
                    type="checkbox"
                    checked={consentContact}
                    onChange={(e) => setConsentContact(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary accent-primary"
                  />
                  Khách hàng đồng ý được liên hệ (email/điện thoại)
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Tóm tắt khách hàng</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                {[
                  ['Tên', 'name'],
                  ['Mã', 'code'],
                  ['MST', 'tax_id'],
                  ['Điện thoại', 'phone'],
                  ['Email', 'email'],
                  ['Địa chỉ', 'headquarters_address'],
                ].map(([label, key]) => {
                  const value = key === 'code' ? 'Tự động tạo' : form[key as FieldKey]?.trim() || '—'
                  return (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="shrink-0 text-muted-foreground">{label}</dt>
                      <dd title={value} className="truncate text-right text-foreground">
                        {key === 'code' ? <Badge>{value}</Badge> : value}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Lưu ý</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              <div className="mb-3 flex justify-center" aria-hidden="true">
                <svg
                  width="120"
                  height="100"
                  viewBox="0 0 120 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <polygon
                    points="22,30 60,12 98,30"
                    style={{ fill: 'var(--sidebar-active)', stroke: 'var(--sidebar-icon)' }}
                    strokeWidth="2"
                  />
                  <rect
                    x="26"
                    y="30"
                    width="68"
                    height="60"
                    rx="3"
                    style={{ fill: 'var(--sidebar-active)', stroke: 'var(--sidebar-icon)' }}
                    strokeWidth="2"
                  />
                  {[
                    [36, 42],
                    [54, 42],
                    [72, 42],
                    [36, 58],
                    [54, 58],
                    [72, 58],
                  ].map(([x, y], i) => (
                    <rect
                      key={i}
                      x={x}
                      y={y}
                      width="10"
                      height="8"
                      rx="1"
                      style={{ fill: 'var(--sidebar-icon)' }}
                      opacity="0.4"
                    />
                  ))}
                  <rect
                    x="54"
                    y="72"
                    width="12"
                    height="18"
                    rx="1"
                    style={{ fill: 'var(--sidebar-icon)' }}
                    opacity="0.55"
                  />
                  <line
                    x1="14"
                    y1="92"
                    x2="106"
                    y2="92"
                    style={{ stroke: 'var(--sidebar-icon)' }}
                    strokeWidth="2"
                    opacity="0.4"
                  />
                </svg>
              </div>
              <p>• Các trường có dấu * là bắt buộc.</p>
              <p>• Mã khách hàng do hệ thống tạo khi lưu.</p>
              <p>• Thông tin liên hệ dùng cho hỗ trợ và thông báo.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t border-border bg-background py-4">
        <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
          Hủy
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? 'Đang lưu...' : 'Lưu khách hàng'}
        </Button>
      </div>
    </form>
  )
}
