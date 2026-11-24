'use client'

// =============================================================================
// FDI_Project — Form Thêm / Sửa khách hàng
// -----------------------------------------------------------------------------
// GỐC THIẾT KẾ (bắt buộc mirror): SoftNET CRM `src/components/add-lead/AddLeadForm.tsx`
//   + `src/components/add-lead/DataChecklist.tsx`.
//   Bố cục: breadcrumb → h1 → grid [form | panel 272px] với 4 section ĐÁNH SỐ +
//   icon lucide; panel phải 3 card: Kiểm tra trùng lặp / Hoàn thiện dữ liệu /
//   Tóm tắt.
//
// BỔ SUNG (yêu cầu user 2026-11-23): Section "3. Next Action đầu tiên" lưu qua
//   RPC `create_customer_with_activity` (migration 013) — KHÔNG insert customers
//   trực tiếp từ client nữa.
//
// GIỮ NGUYÊN (fix đã chốt, NGHIÊM CẤM sửa): footer sticky nền đục `bg-[#ffffff]`,
//   `-mx-4 md:-mx-[30px]`, spacer `h-20 md:h-[76px]`, 3 nút Hủy / Lưu và tạo mới /
//   Lưu khách hàng; modal "Xác nhận thoát" `fixed inset-0 !items-center`.
// =============================================================================

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Building2,
  CalendarCheck2,
  CheckCircle,
  Circle,
  ClipboardList,
  ContactRound,
  ListChecks,
  Plus,
  Save,
  ScanSearch,
  Settings2,
  UserRound,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useProfile } from '@/lib/hooks/useProfile'
import {
  // Badge KHÔNG dùng cho mã KH: variant active nền xanh lá #ddf5dc làm mã nhòe.
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

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Hằng số ───────────────────────────────────────────────────────────────────

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

// Loại hoạt động cho Next Action — nhãn tiếng Việt theo yêu cầu. `message` và
// `demo` KHÔNG có trong lookup `activity_types` của migration 013 (chỉ có
// call/email/meeting/note/task/other) → chúng ghi vào `activities.subject` và
// gửi `metadata.ui_type` giữ nguyên lựa chọn của user, KHÔNG bịa bản ghi thiếu
// `activity_type` (FK activities_activity_type_fkey sẽ chặn).
const NEXT_ACTIVITY_TYPES = [
  { value: 'call', label: 'Gọi điện', metadata: null },
  { value: 'email', label: 'Email', metadata: null },
  { value: 'message', label: 'Nhắn tin', metadata: 'message' },
  { value: 'meeting', label: 'Gặp mặt', metadata: null },
  { value: 'demo', label: 'Demo', metadata: 'demo' },
  { value: 'task', label: 'Công việc', metadata: null },
] as const

/** `activity_type` gửi cho DB: message → note, demo → other (đúng lookup 013). */
function dbActivityType(uiType: string): string {
  if (uiType === 'message') return 'note'
  if (uiType === 'demo') return 'other'
  return uiType
}

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

// =============================================================================
// ⚠️ VỀ `owner_id` / "Người phụ trách"
//    Bảng `customers` HIỆN KHÔNG có cột owner (xem migrations 001 + 008 + 010 và
//    docs/01-product/DATA_DICTIONARY.md). Vì vậy form KHÔNG thêm dropdown người
//    phụ trách vào payload — ghi vào cột không tồn tại sẽ làm RPC 013 lỗi.
//    Thay vào đó: panel "Tóm tắt" hiển thị email user hiện tại (useProfile) là
//    THÔNG TIN, không phải input. RPC 013 tự gán activities.owner_id = uid.
// =============================================================================

// CrudPage.tsx:26-39 dùng kỹ thuật tương tự: tên hàm/kiểu động nên generic của
// supabase-js không khớp. Tạo khách hàng giờ đi qua RPC (migration 013) thay vì
// insert trực tiếp → chỉ cần `rpc`.
const db = supabase as unknown as {
  rpc: (
    fn: 'fdi_next_customer_code' | 'create_customer_with_activity',
    args: Record<string, never> | {
      p_customer: Record<string, string | boolean | null>
      p_activity: Record<string, string | null> | null
      p_idem_key: string
    },
  ) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
}

const ACTIVITY_RPC_NOT_FOUND =
  /PGRST202|could not find the function|public\.create_customer_with_activity|does not exist/i

/** Bóc thông điệp lỗi RPC thành câu tiếng Việt dễ đọc, KHÔNG bịa thành công. */
function describeRpcError(e: { message?: string; code?: string } | null): string {
  const msg = e?.message ?? 'Lỗi không xác định'
  if (ACTIVITY_RPC_NOT_FOUND.test(msg) || e?.code === '42883') {
    return 'Hệ thống chưa có hàm create_customer_with_activity — cần chạy migration 013 trong Supabase SQL Editor.'
  }
  if (/khong co quyen tao khach hang/i.test(msg)) {
    return 'Bạn không có quyền tạo khách hàng (cần manager/director/project_manager/super_admin).'
  }
  if (/thieu ten khach hang/i.test(msg)) return 'Thiếu tên khách hàng.'
  return msg
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CreateCustomerForm({ initial }: { initial?: CustomerFormInitial } = {}) {
  const isEdit = Boolean(initial)
  const router = useRouter()
  const toast = useToast()
  const { profile } = useProfile()

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
  const [errors, setErrors] = useState<Partial<Record<FieldKey | 'nextActivityType' | 'nextActivityAt', string>>>({})
  const [saving, setSaving] = useState(false)
  // Mã do DB sinh (tạo) hoặc mã hiện có (sửa). Không cho client sửa mã.
  const [customerCode, setCustomerCode] = useState<string | null>(initial?.code ?? null)
  /** Hiển thị: luôn là mã ĐỦ (CUS-YYYY-NNN) hoặc placeholder. KHÔNG ghép prefix ở UI
   *  vì mã từ DB đã chứa `CUS-` → ghép nữa sẽ thành `CUS-CUS-...`. */
  const codeDisplay = customerCode || (isEdit ? '—' : 'Tự động tạo')
  // MÃ KH LUÔN HIỆN khi sửa: component dùng chung cho cả tạo và sửa nên useState chỉ
  // lấy initial lần đầu. Khi fetch GET /api/v1/customers/[id] trả về MUỘN (hoặc initial
  // tới sau lần mount), customerCode vẫn null → ô mã kẹt ở '—' dù DB đã có mã.
  useEffect(() => {
    if (isEdit) setCustomerCode(initial?.code ?? null)
  }, [isEdit, initial?.code])

  const [consentContact, setConsentContact] = useState(Boolean(initial?.consent_contact))
  // Confirm-exit: thay hộp thoại confirm() native của trình duyệt bằng modal UI.
  const [showExit, setShowExit] = useState(false)

  // ── Next Action (chỉ ở chế độ TẠO — gốc AddLeadForm cũng không thêm khi sửa) ──
  const [createNextAction, setCreateNextAction] = useState(!isEdit)
  const [nextActivityType, setNextActivityType] = useState('')
  const [nextActivityAt, setNextActivityAt] = useState('')
  const [nextActivityNote, setNextActivityNote] = useState('')

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
    const next: Partial<Record<FieldKey | 'nextActivityType' | 'nextActivityAt', string>> = {}
    for (const key of Object.keys(form) as FieldKey[]) {
      const err = fieldError(key, form[key])
      if (err) next[key] = err
    }
    // Chế độ TẠO + bật Next Action → 2 field này bắt buộc (nội dung là tùy chọn).
    if (!isEdit && createNextAction) {
      if (!nextActivityType) next.nextActivityType = 'Vui lòng chọn loại hoạt động'
      if (!nextActivityAt) next.nextActivityAt = 'Vui lòng chọn ngày và giờ'
    }
    setErrors(next)
    const firstKey = Object.keys(next)[0]
    if (firstKey) {
      const el = document.getElementById(`f-${firstKey}`)
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el?.focus()
    }
    return Object.keys(next).length === 0
  }

  // ── Panel "Hoàn thiện dữ liệu" — đúng 5 mục theo gốc ──────────────────────
  const completeness = {
    name: form.name.trim().length >= 2,
    contact: Boolean(form.phone.trim() || form.email.trim()),
    owner: Boolean(profile?.email), // thông tin hiển thị (không phải input) — xem ghi chú đầu file
    nextAction: isEdit ? true : Boolean(createNextAction && nextActivityType && nextActivityAt),
    address: Boolean(form.headquarters_address.trim()),
  }

  const submitCustomer = async (mode: 'save' | 'saveAndNew') => {
    if (saving || !validate()) return
    setSaving(true)

    // SỬA: giữ nguyên luồng PATCH cũ. KHÔNG gửi `code` (danh tính do DB sinh),
    // KHÔNG thêm Next Action (gốc cũng vậy).
    if (isEdit && initial) {
      const payload: Record<string, string | boolean | null> = {}
      for (const key of Object.keys(form) as FieldKey[]) {
        const trimmed = form[key].trim()
        payload[key] = trimmed ? key === 'email' ? trimmed.toLowerCase() : trimmed : null
      }
      payload.consent_contact = consentContact
      payload.consent_contact_at = consentContact ? new Date().toISOString() : null

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

    // ── TẠO: gọi RPC nguyên tử (khách hàng + hoạt động đầu tiên), idempotent ──
    const customerPayload: Record<string, string | boolean | null> = {}
    for (const key of Object.keys(form) as FieldKey[]) {
      const trimmed = form[key].trim()
      customerPayload[key] = trimmed ? key === 'email' ? trimmed.toLowerCase() : trimmed : null
    }
    customerPayload.consent_contact = consentContact
    customerPayload.consent_contact_at = consentContact ? new Date().toISOString() : null

    const uiType = NEXT_ACTIVITY_TYPES.find((t) => t.value === nextActivityType)
    const activityPayload =
      createNextAction && nextActivityType && nextActivityAt
        ? {
            activity_type: dbActivityType(nextActivityType),
            scheduled_at: new Date(nextActivityAt).toISOString(),
            status: 'planned',
            subject: nextActivityNote.trim() || null,
            body: null,
            channel: null,
            direction: 'outbound',
            // RPC 013 tự gắn metadata.idem_key; chỗ này chỉ giữ lựa chọn UI gốc.
            metadata: JSON.stringify({ ui_type: uiType?.metadata ?? null }),
          }
        : null

    const { data: created, error: rpcError } = await db.rpc('create_customer_with_activity', {
      p_customer: customerPayload,
      p_activity: activityPayload,
      p_idem_key: crypto.randomUUID(),
    })

    setSaving(false)
    if (rpcError) {
      toast.error({
        title: 'Lưu không thành công',
        description: describeRpcError(rpcError),
      })
      return
    }

    // Mã do DB trigger (migration 010) sinh; RPC 013 không trả về mã. Đọc lại
    // qua GET /api/v1/customers/[id] (kiểm `customer.read` + RLS) — không bịa mã.
    const customerId = (created as { customer_id?: string } | null)?.customer_id ?? null
    let code: string | null = null
    if (customerId) {
      const res = await fetch(`/api/v1/customers/${customerId}`, { cache: 'no-store' })
      if (res.ok) {
        const json = (await res.json().catch(() => null)) as { data?: { code?: string | null } } | null
        code = json?.data?.code ?? null
      }
    }
    if (code) setCustomerCode(code)

    if (mode === 'saveAndNew') {
      setForm(EMPTY)
      setConsentContact(false)
      setErrors({})
      setCustomerCode(null)
      setCreateNextAction(true)
      setNextActivityType('')
      setNextActivityAt('')
      setNextActivityNote('')
      toast.success({
        title: 'Thêm khách hàng thành công',
        description: code
          ? `Đã cấp mã ${code}. Form đã đặt lại để tạo khách hàng mới.`
          : 'Form đã đặt lại để tạo khách hàng mới.',
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    toast.success({
      title: 'Thêm khách hàng thành công',
      description: code ? `Mã khách hàng: ${code}` : 'Khách hàng đã được tạo.',
    })
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

  const errorFor = (key: FieldKey | 'nextActivityType' | 'nextActivityAt') =>
    errors[key] ? (
      <p id={`err-${key}`} className="text-xs text-destructive">
        {errors[key]}
      </p>
    ) : null

  // Cảnh báo số điện thoại: derive từ state, KHÔNG đưa vào errors chặn submit.
  const phoneWarning = Boolean(form.phone.trim()) && !PHONE_RE.test(form.phone.replace(/[\s()-]/g, ''))

  const nextActionSummary = nextActivityAt
    ? `${nextActivityAt} · ${NEXT_ACTIVITY_TYPES.find((t) => t.value === nextActivityType)?.label ?? ''}`
    : 'Chưa thiết lập'

  return (
    // ⚠️ flex-col + min-h-full: wrapper nội dung `flex-1` đẩy footer xuống ĐÁY
    // khung form. Nếu form chỉ là block, footer `sticky bottom-0` neo vào đáy
    // CHÍNH NÓ và khi nội dung dài hơn nó sẽ nổi lên giữa trang → ĐÈ chữ.
    <form onSubmit={handleSubmit} noValidate className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col">
      {/* Header (mirror AddLeadForm: breadcrumb / h1 / subtitle) */}
      <div className="mb-3">
        <nav aria-label="Breadcrumb" className="text-[12px] font-medium text-muted-foreground">
          {/* 2026-11-24 (user): chữ "Khách hàng" phải bấm được → quay lại màn quản lý KH. */}
          <Link href="/customers" className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Khách hàng</Link>
          {' / '}
          <span className="text-foreground">{isEdit ? 'Sửa khách hàng' : 'Thêm khách hàng'}</span>
        </nav>
        <h1 className="mt-0.5 text-[21px] font-bold leading-7 text-foreground">
          {isEdit ? 'Sửa khách hàng' : 'Thêm khách hàng mới'}
        </h1>
        <p className="text-[13px] text-muted-foreground">
          {isEdit
            ? 'Cập nhật hồ sơ khách hàng. Mã khách hàng do hệ thống sinh và không thể thay đổi.'
            : 'Tạo hồ sơ khách hàng (doanh nghiệp/đơn vị) và lên kế hoạch liên hệ đầu tiên.'}
        </p>
      </div>

      {/* ── Wrapper: flex-1 đẩy footer xuống đáy; sticky chỉ "dính" khi cuộn
          vượt chiều cao viewport, KHÔNG bao giờ nổi lên giữa trang đè nội dung. */}
      <div className="flex-1 space-y-2.5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_272px]">
          {/* ── Main form ───────────────────────────────────────────────────── */}
          <div className="space-y-2.5">
            {/* 1. Thông tin doanh nghiệp */}
            <Card className="border border-border">
              <CardHeader className="px-5 py-3">
                <CardTitle className="flex items-center gap-2 text-[15px]">
                  <Building2 className="h-4 w-4" /> 1. Thông tin doanh nghiệp
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 px-5 py-3">
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3">
                  <Field label="Tên khách hàng" required>
                    <Input
                      {...fieldProps('name')}
                      placeholder="Nhập tên khách hàng (ví dụ: Công ty ABC)"
                      maxLength={255}
                      className={errors.name ? 'border-destructive' : undefined}
                    />
                    {errorFor('name')}
                  </Field>
                  <Field label="Mã KH">
                    {/* read-only + nền trắng đục + tabular-nums: mã phải đọc rõ và
                        không bao giờ bị nhầm là placeholder (placeholder dùng màu
                        muted, còn value luôn là mã ĐỦ). */}
                    <Input
                      id="f-code"
                      readOnly
                      value={codeDisplay}
                      className="bg-surface font-mono text-[13px] font-semibold tabular-nums text-foreground"
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
                  </Field>
                  <Field label="Mã số thuế">
                    <Input {...fieldProps('tax_id')} placeholder="Nhập mã số thuế (nếu có)" />
                  </Field>
                  <Field label="Ngành nghề">
                    <Select {...fieldProps('industry')}>
                      <option value="">Chọn ngành nghề</option>
                      {INDUSTRIES.map((i) => (
                        <option key={i.value} value={i.value}>{i.label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Địa chỉ trụ sở chính" required className="md:col-span-2">
                    <Input
                      {...fieldProps('headquarters_address')}
                      placeholder="Nhập địa chỉ trụ sở chính"
                      className={errors.headquarters_address ? 'border-destructive' : undefined}
                    />
                    {errorFor('headquarters_address')}
                  </Field>
                </div>
              </CardContent>
            </Card>

            {/* 2. Người liên hệ chính */}
            <Card className="border border-border">
              <CardHeader className="px-5 py-3">
                <CardTitle className="flex items-center gap-2 text-[15px]">
                  <UserRound className="h-4 w-4" /> 2. Người liên hệ chính
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 px-5 py-3">
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3">
                  <Field label="Người liên hệ" required>
                    <Input
                      {...fieldProps('primary_contact_name')}
                      placeholder="Nhập họ và tên người liên hệ"
                      className={errors.primary_contact_name ? 'border-destructive' : undefined}
                    />
                    {errorFor('primary_contact_name')}
                  </Field>
                  <Field label="Chức vụ">
                    <Input
                      {...fieldProps('primary_contact_position')}
                      placeholder="Nhập chức vụ (ví dụ: Trưởng phòng IT)"
                      maxLength={120}
                    />
                  </Field>
                  <Field label="Số điện thoại" required>
                    <Input
                      {...fieldProps('phone')}
                      type="tel"
                      placeholder="Nhập số điện thoại (ví dụ: 0909 123 456)"
                      className={errors.phone ? 'border-destructive' : undefined}
                    />
                    {errorFor('phone')}
                    {phoneWarning && (
                      <p className="text-xs text-warning">
                        Số điện thoại chưa đúng định dạng (0xxxxxxxxx hoặc +84xxxxxxxx) — bạn vẫn có thể lưu.
                      </p>
                    )}
                  </Field>
                  <Field label="Email" required>
                    <Input
                      {...fieldProps('email')}
                      type="email"
                      placeholder="Nhập email (ví dụ: contact@company.com)"
                      className={errors.email ? 'border-destructive' : undefined}
                    />
                    {errorFor('email')}
                  </Field>
                </div>
              </CardContent>
            </Card>

            {/* 3. Next Action đầu tiên — CHỈ ở chế độ tạo (gốc cũng vậy) */}
            {!isEdit && (
              <Card className="border border-border">
                <CardHeader className="px-5 py-3">
                  <CardTitle className="flex items-center gap-2 text-[15px]">
                    <CalendarCheck2 className="h-4 w-4" /> 3. Next Action đầu tiên
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 px-5 py-3">
                  <label htmlFor="f-create_next_action" className="flex items-center gap-2 text-[13px] text-foreground">
                    <input
                      id="f-create_next_action"
                      type="checkbox"
                      checked={createNextAction}
                      onChange={(e) => setCreateNextAction(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary accent-primary"
                    />
                    Tạo Next Action đầu tiên
                  </label>

                  {createNextAction && (
                    <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3">
                      <Field label="Loại hoạt động" required>
                        <Select
                          id="f-nextActivityType"
                          value={nextActivityType}
                          onChange={(e) => {
                            setNextActivityType(e.target.value)
                            setErrors((prev) => ({ ...prev, nextActivityType: undefined }))
                          }}
                          aria-invalid={Boolean(errors.nextActivityType)}
                          aria-describedby={errors.nextActivityType ? 'err-nextActivityType' : undefined}
                          className={errors.nextActivityType ? 'border-destructive' : undefined}
                        >
                          <option value="">Chọn loại</option>
                          {NEXT_ACTIVITY_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </Select>
                        {errors.nextActivityType && (
                          <p id="err-nextActivityType" className="text-xs text-destructive">{errors.nextActivityType}</p>
                        )}
                      </Field>
                      <Field label="Ngày và giờ" required>
                        <Input
                          id="f-nextActivityAt"
                          type="datetime-local"
                          value={nextActivityAt}
                          onChange={(e) => {
                            setNextActivityAt(e.target.value)
                            setErrors((prev) => ({ ...prev, nextActivityAt: undefined }))
                          }}
                          aria-invalid={Boolean(errors.nextActivityAt)}
                          aria-describedby={errors.nextActivityAt ? 'err-nextActivityAt' : undefined}
                          className={errors.nextActivityAt ? 'border-destructive' : undefined}
                        />
                        {errors.nextActivityAt && (
                          <p id="err-nextActivityAt" className="text-xs text-destructive">{errors.nextActivityAt}</p>
                        )}
                      </Field>
                      <div className="md:col-span-3">
                        <Field label="Nội dung cần thực hiện">
                          <Input
                            value={nextActivityNote}
                            onChange={(e) => setNextActivityNote(e.target.value)}
                            placeholder="Gọi xác nhận nhu cầu SIP Trunk"
                          />
                        </Field>
                      </div>
                    </div>
                  )}

                  {!createNextAction && (
                    <div className="rounded-lg bg-amber-50 p-2.5 text-[12px] text-amber-700">
                      Khách hàng sẽ được tạo nhưng chưa có hành động tiếp theo.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 4. Thông tin bổ sung */}
            <Card className="border border-border">
              <CardHeader className="px-5 py-3">
                <CardTitle className="flex items-center gap-2 text-[15px]">
                  <Settings2 className="h-4 w-4" /> 4. Thông tin bổ sung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 px-5 py-3">
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3">
                  <Field label="Liên hệ kỹ thuật">
                    <Input {...fieldProps('contact_technical')} placeholder="Nhập thông tin liên hệ kỹ thuật (nếu khác)" />
                  </Field>
                  <Field label="Liên hệ thương mại">
                    <Input {...fieldProps('contact_commercial')} placeholder="Nhập thông tin liên hệ thương mại (nếu khác)" />
                  </Field>
                  <Field label="Liên hệ khẩn cấp">
                    <Input {...fieldProps('contact_emergency')} placeholder="Nhập số điện thoại khẩn cấp (24/7)" />
                  </Field>
                  <div className="md:col-span-3">
                    <Field label="Ghi chú">
                      <Textarea
                        {...fieldProps('notes')}
                        maxLength={500}
                        rows={4}
                        placeholder="Nhập ghi chú, thông tin đặc biệt hoặc yêu cầu khác..."
                      />
                      <p className="text-right text-xs text-muted-foreground">{form.notes.length} / 500</p>
                    </Field>
                  </div>
                  <div className="md:col-span-3">
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
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right panel (mirror AddLeadForm: 3 card, thay card "Lưu ý") ─── */}
          <div className="space-y-2.5">
            {/* a) Kiểm tra trùng lặp */}
            <Card className="border border-border">
              <CardHeader className="px-5 py-3">
                <CardTitle className="flex items-center gap-2 text-[12px]">
                  <ScanSearch className="h-[18px] w-[18px] text-primary" /> Kiểm tra trùng lặp
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 py-3">
                <p className="text-[12px] text-muted-foreground">Chưa đủ dữ liệu để kiểm tra</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Kiểm tra theo Email và Điện thoại</p>
              </CardContent>
            </Card>

            {/* b) Hoàn thiện dữ liệu */}
            <Card className="border border-border">
              <CardHeader className="px-5 py-3">
                <CardTitle className="flex items-center gap-2 text-[12px]">
                  <ListChecks className="h-[18px] w-[18px] text-primary" /> Hoàn thiện dữ liệu
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 py-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Kiểm tra dữ liệu</h3>
                  <div className="space-y-1.5">
                    {([
                      ['Tên đã nhập', completeness.name],
                      ['Có phương thức liên hệ', completeness.contact],
                      ['Người phụ trách đã chọn', completeness.owner],
                      ['Next Action đã lên lịch', completeness.nextAction],
                      ['Địa chỉ đã nhập', completeness.address],
                    ] as const).map(([label, done]) => (
                      <div key={label} className="flex items-center gap-2 text-xs">
                        {done
                          ? <CheckCircle className="h-4 w-4 text-primary" />
                          : <Circle className="h-4 w-4 text-muted-foreground" />}
                        <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* c) Tóm tắt khách hàng */}
            <Card className="border border-border">
              <CardHeader className="px-5 py-3">
                <CardTitle className="flex items-center gap-2 text-[12px]">
                  <ContactRound className="h-[18px] w-[18px] text-blue-700" /> Tóm tắt khách hàng
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 py-3">
                <dl className="space-y-2 text-sm">
                  {([
                    ['Họ tên/Tên liên hệ', form.primary_contact_name.trim() || '—'],
                    ['Công ty', form.name.trim() || '—'],
                    ['MST', form.tax_id.trim() || '—'],
                    ['Điện thoại', form.phone.trim() || '—'],
                    ['Email', form.email.trim() || '—'],
                    ['Địa chỉ', form.headquarters_address.trim() || '—'],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="shrink-0 text-muted-foreground">{label}</dt>
                      <dd title={value} className="truncate text-right text-foreground">{value}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">Người phụ trách</dt>
                    <dd title={profile?.email ?? '—'} className="truncate text-right text-foreground">
                      {profile?.email ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">Next Action</dt>
                    <dd className="truncate text-right text-foreground">{nextActionSummary}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">Mã KH</dt>
                    {/* Mã là DỮ LIỆU QUAN TRỌNG → hiện thẳng, đậm, không để trong
                        Badge (variant active có nền xanh lá #ddf5dc làm mã bị nhòe). */}
                    <dd className="truncate text-right font-mono text-[12px] font-semibold tabular-nums text-foreground">
                      {codeDisplay}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>{/* /wrapper (grid + footer) */}

      {/* Footer hành động: cố định cuối vùng cuộn, NỀN ĐỤC TUYỆT ĐỐI + full-width.
          ⚠️ ĐÂY LÀ FIX ĐÃ CHỐT — KHÔNG ĐƯỢC SỬA nền / spacer / -mx. */}
      <footer className="sticky bottom-0 z-30 mt-5 -mx-4 border-t border-border bg-[#ffffff] px-4 py-3 shadow-[0_-6px_16px_rgba(16,32,62,0.12)] sm:px-5 md:-mx-[30px] md:px-[30px]"
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

      {/* ── ĐỆM DƯỚI FOOTER: khớp cơ chế đo trên prod ───────────────────────────
          Footer `sticky bottom-0` neo vào ĐÁY vùng cuộn của <main>. Đệm phải nằm
          SAU footer thì footer mới được ĐẨY CHẠM ĐÁY; đệm đặt TRONG form (mx-auto)
          không góp chiều dài cuộn cho main.
          ĐO THẬT: spacer 96px ⇒ footerBottom 541, còn hở 179px. Vậy cần spacer
          ≈ (hở còn lại) + footer ≈ 179+69 = 248px để footer chạm đáy tuyệt đối.
          Làm tròn lên 256px mobile / 280px desktop. Nền trắng đục che chữ tuyệt đối. */}
      <div aria-hidden="true" className="-mt-[1px] h-[256px] bg-[#ffffff] pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:h-[280px]" />

      {/* Xác nhận thoát khi còn thay đổi chưa lưu — thay confirm() native của trình duyệt.
          ⚠️ GIỮ NGUYÊN: fixed inset-0 + !items-center, đặt TRỰC TIẾP trong <form>. */}
      {showExit && (
        <Modal
          data-testid="exit-confirm-modal"
          className="fixed inset-0 z-[60] flex items-center justify-center max-w-[420px]"
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

// ── Small UI helpers ──────────────────────────────────────────────────────────

function Field({ label, required, className, children }: {
  label: string
  required?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-[12px] font-semibold text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  )
}
