'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Save, AlertTriangle } from 'lucide-react'
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
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
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

/** Giá trị khởi tạo cho form SỬA — chỉ lấy field text; code/consent xử lý riêng. */
export interface CustomerFormInitial {
  id: string
  code?: string | null
  name: string
  phone?: string | null
  email?: string | null
  industry?: string | null
  tax_id?: string | null
  headquarters_address?: string | null
  primary_contact_name?: string | null
  primary_contact_position?: string | null
  notes?: string | null
  consent_contact?: boolean | null
  contact_technical?: string | null
  contact_commercial?: string | null
  contact_emergency?: string | null
}

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
    insert: (
      v: Record<string, string | boolean | null>,
    ) => PromiseLike<{ error: { message: string } | null; data?: unknown }> & {
      select: () => PromiseLike<{ error: { message: string } | null; data?: unknown }>
    }
  }
  rpc: (
    fn: 'fdi_next_customer_code',
    args: Record<string, never>,
  ) => Promise<{ data: string | null; error: { message: string } | null }>
}

export default function CreateCustomerForm({ initial }: { initial?: CustomerFormInitial } = {}) {
  const isEdit = Boolean(initial)
  const router = useRouter()
  const toast = useToast()
  const [form, setForm] = useState<FormState>(() => initial ? {
    ...EMPTY,
    name: initial.name ?? '',
    phone: initial.phone ?? '',
    email: initial.email ?? '',
    industry: initial.industry ?? '',
    tax_id: initial.tax_id ?? '',
    headquarters_address: initial.headquarters_address ?? '',
    primary_contact_name: initial.primary_contact_name ?? '',
    primary_contact_position: initial.primary_contact_position ?? '',
    notes: initial.notes ?? '',
    contact_technical: initial.contact_technical ?? '',
    contact_commercial: initial.contact_commercial ?? '',
    contact_emergency: initial.contact_emergency ?? '',
  } : EMPTY)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [saving, setSaving] = useState(false)
  // Mã do DB sinh (tạo) hoặc mã hiện có (sửa). Không cho client sửa mã.
  const [customerCode, setCustomerCode] = useState<string | null>(initial?.code ?? null)
  /** Hiển thị: luôn là mã ĐỦ (CUS-YYYY-NNN) hoặc placeholder. KHÔNG ghép prefix ở UI
   *  vì mã từ DB đã chứa `CUS-` → ghép nữa sẽ thành `CUS-CUS-...`. */
  const codeDisplay = customerCode || (isEdit ? '—' : 'Tự động tạo')
  // MÃ KH LUÔN HIỆN khi sửa: component dùng chung cho cả tạo và sửa nên useState chỉ
  // lấy initial lần đầu. Khi fetch GET /api/v1/customers/[id] trả về MUỘN (hoặc initial
  // tới sau lần mount), customerCode vẫn null → ô mã kẹt ở '—' dù DB đã có mã.
  // useEffect này sync lại mỗi khi initial.code thay đổi, CHỈ áp dụng ở chế độ sửa
  // (chế độ tạo không có mã ban đầu → mã do RPC sinh sau khi lưu, giữ nguyên luồng cũ).
  useEffect(() => {
    if (isEdit) setCustomerCode(initial?.code ?? null)
  }, [isEdit, initial?.code])
  const [consentContact, setConsentContact] = useState(Boolean(initial?.consent_contact))
  // Confirm-exit: thay hộp thoại confirm() native của trình duyệt bằng modal UI.
  const [showExit, setShowExit] = useState(false)

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

  const submitCustomer = async (mode: 'save' | 'saveAndNew') => {
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

    if (isEdit && initial) {
      // SỬA: KHÔNG gửi `code` (danh tính do DB sinh, PATCH từ chối field này).
      const res = await fetch(`/api/v1/customers/${initial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setSaving(false)
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
        toast.error({
          title: 'Lưu không thành công',
          description: body?.error?.message ?? `Lỗi máy chủ (${res.status}).`,
        })
        return
      }
      toast.success({ title: 'Cập nhật khách hàng thành công', description: `Mã khách hàng: ${customerCode ?? initial.code}` })
      router.push('/customers')
      return
    }

    // Mã do DB sinh ở RPC (SECURITY DEFINER + advisory lock). Client KHÔNG bịa mã.
    // Lưu ý: trigger BEFORE INSERT vẫn là rào cuối nếu RPC lỗi → insert sẽ fail thay vì
    // gán mã client tự chọn.
    const { data: code, error: codeError } = await db.rpc('fdi_next_customer_code', {})
    if (codeError || !code) {
      setSaving(false)
      toast.error({
        title: 'Lưu không thành công',
        description: codeError?.message ?? 'Không sinh được mã khách hàng',
      })
      return
    }
    payload.code = code

    const { error } = await db.from('customers').insert(payload)
    setSaving(false)
    if (error) {
      toast.error({ title: 'Lưu không thành công', description: error.message })
      return
    }

    // Hiển thị mã THẬT ngay trên form (user thấy mã đã cấp).
    setCustomerCode(code)

    if (mode === 'saveAndNew') {
      setForm(EMPTY)
      setConsentContact(false)
      setErrors({})
      setCustomerCode(null)
      toast.success({
        title: 'Thêm khách hàng thành công',
        description: `Đã cấp mã ${code}. Form đã đặt lại để tạo khách hàng mới.`,
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    toast.success({ title: 'Thêm khách hàng thành công', description: `Mã khách hàng: ${code}` })
    router.push('/customers')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submitCustomer('save')
  }

  const handleCancel = () => {
    if (!dirty) {
      router.push('/customers')
      return
    }
    setShowExit(true)
  }

  // "Thoát mà không lưu" — bỏ hết thay đổi và quay về danh sách.
  const confirmExit = () => {
    setShowExit(false)
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
    <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-[1600px]">
      <div className="mb-5">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <span>Trang chủ</span> / <span>Khách hàng</span>{' '}
          <span className="text-foreground">/ {isEdit ? 'Sửa khách hàng' : 'Thêm khách hàng'}</span>
        </nav>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          {isEdit ? 'Sửa khách hàng' : 'Thêm khách hàng mới'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isEdit
            ? 'Cập nhật hồ sơ khách hàng. Mã khách hàng do hệ thống sinh và không thể thay đổi.'
            : 'Tạo hồ sơ khách hàng (doanh nghiệp/đơn vị) để quản lý dự án, dịch vụ và hỗ trợ vận hành.'}
        </p>
      </div>

      {/* Wrapper chứa grid + footer. Sticky CHỈ ăn khi nằm trong một container đủ
          cao (cao bằng chiều cao NỘI DUNG form). Trước đây footer nằm trong cột trái
          `div.space-y-4.lg:col-span-2` — flex item có align-self stretch nên cao bằng
          nội dung, không phải grid track → khi cuộn tới cuối footer không phủ kín
          viewport còn lại, chữ card lọt qua. Đặt footer NGAY sau wrapper (cùng cấp với
          grid) thì container cao = toàn bộ form → sticky phủ kín vùng cuộn. */}
      <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="px-5 py-3">
              <CardTitle>Thông tin doanh nghiệp</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-2">
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
                <Input
                  id="f-code"
                  readOnly
                  value={codeDisplay}
                  className="font-medium text-foreground"
                  aria-describedby="code-hint"
                  tabIndex={-1}
                />
                <p id="code-hint" className="text-xs text-muted-foreground">
                  {customerCode
                    ? 'Mã khách hàng do hệ thống cấp'
                    : isEdit
                      ? 'Mã khách hàng hiện tại'
                      : 'Mã được hệ thống tạo khi lưu'}
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
            <CardHeader className="px-5 py-3">
              <CardTitle>Người liên hệ chính</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-2">
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
            <CardHeader className="px-5 py-3">
              <CardTitle>Thông tin bổ sung</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-2">
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

        <div className="space-y-4">
          <Card>
            <CardHeader className="px-5 py-3">
              <CardTitle>Tóm tắt khách hàng</CardTitle>
            </CardHeader>
            <CardContent className="px-5 py-3">
              <dl className="space-y-2 text-sm">
                {[
                  ['Tên', 'name'],
                  ['Mã', 'code'],
                  ['MST', 'tax_id'],
                  ['Điện thoại', 'phone'],
                  ['Email', 'email'],
                  ['Địa chỉ', 'headquarters_address'],
                ].map(([label, key]) => {
                  const value =
                    key === 'code'
                      ? codeDisplay
                      : form[key as FieldKey]?.trim() || '—'
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
            <CardHeader className="px-5 py-3">
              <CardTitle>Lưu ý</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 px-5 py-3 text-xs text-muted-foreground">
              <div className="mb-2 flex justify-center" aria-hidden="true">
                <svg
                  width="96"
                  height="80"
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
      </div>{/* /wrapper (grid + footer) */}

      {/* Footer hành động: cố định cuối vùng cuộn, NỀN ĐỤC TUYỆT ĐỐI + full-width.
          Đặt NGAY sau wrapper (không lồng trong cột trái) để sticky phủ kín vùng cuộn.
          Nền: `bg-surface` (#ffffff) KHÔNG trong suốt — trước đây `bg-card/95
          backdrop-blur` để lọt chữ card khi cuộn. Bỏ hẳn mọi biến thể mờ/blur.
          `-mx-5 px-4 sm:px-5` kéo footer sát lề container; paddingBottom safe-area inline. */}
      <footer className="sticky bottom-0 z-30 mt-5 -mx-4 border-t border-border bg-[#ffffff] px-4 py-3 shadow-[0_-4px_12px_rgba(16,32,62,0.06)] sm:px-5 md:-mx-[30px] md:px-[30px]"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleCancel} disabled={saving} className="min-w-[88px]">
            Hủy
          </Button>
          {!isEdit && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void submitCustomer('saveAndNew')}
              disabled={saving}
              className="min-w-[168px]"
            >
              {saving ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              Lưu và tạo mới
            </Button>
          )}
          <Button type="submit" disabled={saving} className="min-w-[152px]">
            {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Lưu khách hàng'}
          </Button>
        </div>
      </footer>

      {/* Đệm dưới footer: main (ClientBody) chỉ có pb-[30px] trên desktop trong
          khi footer sticky cao ~64px → card cuối bị che khi cuộn tới cùng.
          Spacer này đẩy nội dung lên, đảm bảo cuộn hết vẫn thấy được card cuối. */}
      <div aria-hidden="true" className="h-20 md:h-[76px]" />

      {/* Xác nhận thoát khi còn thay đổi chưa lưu — thay confirm() native của trình duyệt.
          Modal component không tự ẩn theo prop `open`, nên gate bằng && .
          Đặt TRỰC TIẾP trong <form>, KHÔNG lồng trong cột: trước đây parent là flex item
          bị co ngặt (cao bằng nội dung) nên overlay `fixed inset-0` không phủ full viewport,
          không căn giữa được. Nay `fixed inset-0 z-50 flex items-center justify-center
          !items-center` (important thắng utility khác) + content `max-w-[420px] w-full`
          → modal căn giữa VIEWPORT thật, không dựa vào parent. */}
      {showExit && (
        <Modal
          data-testid="exit-confirm-modal"
          className="fixed inset-0 z-50 flex items-center justify-center !items-center max-w-[420px]"
        >
          <ModalContent className="relative mx-4 w-full max-w-[420px] p-5">
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setShowExit(false)}
            className="absolute right-4 top-4 rounded-sm p-1 text-muted transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <ModalHeader className="flex-row items-center gap-2 space-y-0 p-0">
            <ModalTitle className="flex items-center gap-2 text-base font-semibold">
              <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
              Xác nhận thoát
            </ModalTitle>
          </ModalHeader>
          <ModalBody className="p-0 pt-3 text-sm text-muted-foreground">
            Bạn có thay đổi chưa được lưu. Bạn có muốn tiếp tục thoát mà không lưu không?
          </ModalBody>
          <ModalFooter className="flex justify-end gap-2 p-0 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowExit(false)} className="min-w-[96px]">
              Ở lại
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmExit}
              className="min-w-[180px] bg-[#E11D48] hover:bg-[#BE123C]"
            >
              Thoát mà không lưu
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      )}
    </form>
  )
}
