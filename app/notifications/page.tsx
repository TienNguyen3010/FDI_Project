'use client'

import { useEffect, useState } from 'react'
import {
  Button,
  Input,
  Label,
  Select,
  Textarea,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  EmptyState,
  useToast,
} from '@/components/ui/ui'

// Checklist §5 #11 — Thông báo: soạn nội dung (email, Zalo, Group), copy,
// KHÔNG tự gửi. Lịch sử soạn lưu ở localStorage (không gọi API gửi thật).

type Channel = 'email' | 'zalo' | 'group'

interface Draft {
  id: string
  title: string
  content: string
  channel: Channel
  recipient: string
  projectLink: string
  alertLink: string
  createdAt: string
}

const STORAGE_KEY = 'fdi_notifications'

const CHANNEL_LABEL: Record<Channel, string> = {
  email: 'Email',
  zalo: 'Zalo',
  group: 'Nhóm (Group)',
}

const emptyForm = {
  title: '',
  content: '',
  channel: 'email' as Channel,
  recipient: '',
  projectLink: '',
  alertLink: '',
}

/** Ghép nội dung thông báo từ các trường nhập — chỉ tạo chuỗi, không gửi. */
function composeMessage(form: typeof emptyForm): string {
  const lines: string[] = [
    `[${CHANNEL_LABEL[form.channel]}] ${form.title.trim() || '(Chưa có tiêu đề)'}`,
    '',
    form.content.trim() || '(Chưa có nội dung)',
  ]
  if (form.projectLink.trim()) lines.push('', `Dự án: ${form.projectLink.trim()}`)
  if (form.alertLink.trim()) lines.push('', `Sự cố: ${form.alertLink.trim()}`)
  return lines.join('\n')
}

function parseDrafts(raw: string | null): Draft[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value.filter(
      (item): item is Draft =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as Draft).id === 'string' &&
        typeof (item as Draft).content === 'string'
    )
  } catch {
    return []
  }
}

export default function NotificationsPage() {
  const toast = useToast()
  const [form, setForm] = useState(emptyForm)
  const [composed, setComposed] = useState('')
  const [drafts, setDrafts] = useState<Draft[]>([])

  // Đọc lịch sử từ localStorage sau khi mount (tránh SSR/build truy cập window).
  useEffect(() => {
    // Đẩy vào microtask: setState đồng bộ trong effect gây cascade render (React 19).
    void Promise.resolve().then(() => {
      try {
        setDrafts(parseDrafts(window.localStorage.getItem(STORAGE_KEY)))
      } catch {
        setDrafts([])
      }
    })
  }, [])

  const persist = (next: Draft[]) => {
    setDrafts(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      toast.warning({
        title: 'Không lưu được lịch sử',
        description: 'Trình duyệt có thể đang chặn bộ nhớ cục bộ.',
      })
    }
  }

  const handleCreate = () => {
    if (!form.title.trim() && !form.content.trim()) {
      toast.warning({ title: 'Chưa có nội dung', description: 'Nhập tiêu đề hoặc nội dung trước khi soạn.' })
      return
    }
    const text = composeMessage(form)
    setComposed(text)
    const draft: Draft = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
      title: form.title.trim(),
      content: text,
      channel: form.channel,
      recipient: form.recipient.trim(),
      projectLink: form.projectLink.trim(),
      alertLink: form.alertLink.trim(),
      createdAt: new Date().toISOString(),
    }
    persist([draft, ...drafts])
    toast.success({ title: 'Đã tạo nội dung', description: 'Bạn có thể sao chép hoặc mở ứng dụng để gửi.' })
  }

  const copy = async (text: string) => {
    if (!text.trim()) {
      toast.warning({ title: 'Chưa có nội dung để sao chép' })
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      toast.success({ title: 'Đã sao chép nội dung' })
    } catch {
      toast.error({ title: 'Sao chép thất bại', description: 'Trình duyệt không cho phép truy cập bảng nhớ tạm.' })
    }
  }

  // Chỉ mở ứng dụng khách (mailto:/zalo.me) với nội dung đã soạn — KHÔNG tự gửi.
  const openClient = () => {
    const text = composed || composeMessage(form)
    if (!text.trim()) {
      toast.warning({ title: 'Chưa có nội dung', description: 'Soạn nội dung trước khi mở ứng dụng.' })
      return
    }
    let url: string
    if (form.channel === 'email') {
      const subject = encodeURIComponent(form.title.trim() || 'Thông báo hệ thống FDI')
      const body = encodeURIComponent(text)
      const to = encodeURIComponent(form.recipient.trim())
      url = `mailto:${to}?subject=${subject}&body=${body}`
    } else if (form.channel === 'zalo') {
      const phone = form.recipient.trim().replace(/[^0-9]/g, '')
      url = phone ? `https://zalo.me/${phone}` : 'https://zalo.me'
    } else {
      url = 'https://zalo.me'
    }
    window.open(url, '_blank', 'noopener,noreferrer')
    toast.info({
      title: 'Đã mở ứng dụng',
      description: 'Nội dung chỉ được điền sẵn — bạn tự kiểm tra và gửi.',
    })
  }

  const removeDraft = (id: string) => {
    persist(drafts.filter((d) => d.id !== id))
    toast.info({ title: 'Đã xoá bản soạn' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Soạn thông báo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Soạn nội dung cho Email / Zalo / Nhóm, sau đó sao chép hoặc mở ứng dụng.
        </p>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-500">
        Ứng dụng này <strong>không tự động gửi</strong> thông báo. Nội dung chỉ được tạo để bạn sao chép hoặc mở
        sẵn trong ứng dụng email/Zalo.
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Soạn nội dung</CardTitle>
            <CardDescription>Điền thông tin rồi nhấn &ldquo;Tạo nội dung&rdquo;.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nt-title">Tiêu đề</Label>
              <Input
                id="nt-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="VD: Sự cố Switch tầng 3 đã được xử lý"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nt-content">Nội dung</Label>
              <Textarea
                id="nt-content"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Mô tả chi tiết cho người nhận..."
                className="min-h-32"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nt-channel">Kênh</Label>
              <Select
                id="nt-channel"
                value={form.channel}
                onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as Channel }))}
              >
                <option value="email">Email</option>
                <option value="zalo">Zalo</option>
                <option value="group">Nhóm (Group)</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nt-recipient">Người nhận</Label>
              <Input
                id="nt-recipient"
                value={form.recipient}
                onChange={(e) => setForm((f) => ({ ...f, recipient: e.target.value }))}
                placeholder="Email hoặc số điện thoại Zalo"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nt-project">Liên kết dự án</Label>
                <Input
                  id="nt-project"
                  value={form.projectLink}
                  onChange={(e) => setForm((f) => ({ ...f, projectLink: e.target.value }))}
                  placeholder="URL hoặc tên dự án"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nt-alert">Liên kết sự cố</Label>
                <Input
                  id="nt-alert"
                  value={form.alertLink}
                  onChange={(e) => setForm((f) => ({ ...f, alertLink: e.target.value }))}
                  placeholder="URL hoặc mã sự cố"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleCreate}>
                Tạo nội dung
              </Button>
              <Button type="button" variant="outline" onClick={() => void copy(composed)}>
                Sao chép
              </Button>
              <Button type="button" variant="secondary" onClick={openClient}>
                Mở email/Zalo
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nội dung đã soạn</CardTitle>
            <CardDescription>Bản xem trước để sao chép.</CardDescription>
          </CardHeader>
          <CardContent>
            {composed ? (
              <>
                <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground">
                  {composed}
                </pre>
                <Button type="button" className="mt-3" variant="outline" onClick={() => void copy(composed)}>
                  Sao chép nội dung này
                </Button>
              </>
            ) : (
              <EmptyState
                title="Chưa có nội dung"
                description="Nhấn “Tạo nội dung” để xem trước thông báo trước khi sao chép."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử soạn</CardTitle>
          <CardDescription>Lưu trên trình duyệt này (localStorage).</CardDescription>
        </CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <EmptyState title="Chưa có lịch sử" description="Các bản soạn sẽ xuất hiện ở đây." />
          ) : (
            <ul className="divide-y divide-border">
              {drafts.map((d) => (
                <li key={d.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{d.title || '(Không có tiêu đề)'}</span>
                      <Badge variant="default">{CHANNEL_LABEL[d.channel]}</Badge>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {d.content}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(d.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void copy(d.content)}
                    >
                      Sao chép lại
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeDraft(d.id)}>
                      Xoá
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
