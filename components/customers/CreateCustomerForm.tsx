'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
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

// CrudPage.tsx:26-39 dùng kỹ thuật tương tự: tên bảng/cột động nên generic
// của supabase-js không khớp union literal. Ở đây payload là Record<string,string>.
const db = supabase as unknown as {
  from: (table: string) => {
    insert: (v: Record<string, string>) => Promise<{ error: { message: string } | null }>
  }
}

export default function CreateCustomerForm() {
  const router = useRouter()
  const toast = useToast()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [saving, setSaving] = useState(false)

  const dirty = useMemo(
    () => (Object.keys(form) as FieldKey[]).some((k) => form[k] !== EMPTY[k]),
    [form],
  )

  const setField = (key: FieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const validate = (): boolean => {
    const next: Partial<Record<FieldKey, string>> = {}
    for (const key of REQUIRED) {
      if (!form[key].trim()) next[key] = `Vui lòng nhập ${LABELS[key].toLowerCase()}`
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Email không hợp lệ'
    }
    if (form.phone.trim()) {
      const digits = form.phone.replace(/[\s()-]/g, '')
      if (!/^(\+?84|0)[0-9]{9,10}$/.test(digits)) {
        next.phone = 'Số điện thoại chưa đúng định dạng (0xxxxxxxxx hoặc +84xxxxxxxx)'
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving || !validate()) return
    setSaving(true)
    const payload: Record<string, string> = {}
    for (const key of Object.keys(form) as FieldKey[]) {
      payload[key] = form[key].trim()
    }
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
    'aria-invalid': Boolean(errors[key]),
    'aria-describedby': errors[key] ? `err-${key}` : undefined,
  })

  const errorFor = (key: FieldKey) =>
    errors[key] ? (
      <p id={`err-${key}`} className="text-xs text-[var(--danger)]">
        {errors[key]}
      </p>
    ) : null

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
                  Tên khách hàng <span className="text-[var(--danger)]">*</span>
                </Label>
                <Input {...fieldProps('name')} placeholder="Tên công ty" maxLength={255} />
                {errorFor('name')}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-code">Mã khách hàng</Label>
                <div className="flex items-center gap-2">
                  <Input id="f-code" value="Tự động tạo" readOnly className="bg-muted/40" />
                  <span className="whitespace-nowrap text-xs text-muted-foreground">CUS-…</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-tax_id">Mã số thuế</Label>
                <Input {...fieldProps('tax_id')} placeholder="0123456789" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-industry">Ngành nghề</Label>
                <Select {...fieldProps('industry')}>
                  <option value="">— Chọn ngành —</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i.value} value={i.value}>{i.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="f-headquarters_address">
                  Địa chỉ trụ sở chính <span className="text-[var(--danger)]">*</span>
                </Label>
                <Input {...fieldProps('headquarters_address')} placeholder="Số nhà, đường, TP, quốc gia" />
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
                  Người liên hệ <span className="text-[var(--danger)]">*</span>
                </Label>
                <Input {...fieldProps('primary_contact_name')} placeholder="Họ tên + SĐT" />
                {errorFor('primary_contact_name')}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-primary_contact_position">Chức vụ</Label>
                <Input {...fieldProps('primary_contact_position')} placeholder="VD: IT Manager" maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-phone">
                  Số điện thoại <span className="text-[var(--danger)]">*</span>
                </Label>
                <Input {...fieldProps('phone')} type="tel" placeholder="09xxxxxxxx hoặc +84..." />
                {errorFor('phone')}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-email">
                  Email <span className="text-[var(--danger)]">*</span>
                </Label>
                <Input {...fieldProps('email')} type="email" placeholder="name@company.com" />
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
                <Input {...fieldProps('contact_technical')} placeholder="Tên + SĐT" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-contact_commercial">Liên hệ thương mại</Label>
                <Input {...fieldProps('contact_commercial')} placeholder="Tên + SĐT" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-contact_emergency">Liên hệ khẩn cấp</Label>
                <Input {...fieldProps('contact_emergency')} placeholder="Hotline 24/7" />
              </div>
              <div className="space-y-1.5">
                <Label>Ghi chú</Label>
                <Textarea
                  {...fieldProps('notes')}
                  maxLength={500}
                  rows={4}
                  placeholder="Ghi chú nội bộ"
                />
                <p className="text-right text-xs text-muted-foreground">{form.notes.length} / 500</p>
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
                ].map(([label, key]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">{label}</dt>
                    <dd className="truncate text-right text-foreground">
                      {key === 'code'
                        ? 'Tự động tạo'
                        : form[key as FieldKey]?.trim() || '—'}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Lưu ý</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
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
          {saving ? <Save className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
          {saving ? 'Đang lưu...' : 'Lưu khách hàng'}
        </Button>
      </div>
    </form>
  )
}
