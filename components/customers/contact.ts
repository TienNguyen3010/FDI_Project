'use client'

/**
 * Contact helpers dùng chung cho màn khách hàng (bảng danh sách + right panel).
 *
 * 2026-11-25: gộp 2 cột Email / Điện thoại thành MỘT cột "Liên hệ" —
 * SĐT là link `tel:` + nút copy, email là link `mailto:` + nút copy.
 * Panel "Liên hệ bổ sung" (contact_technical/commercial/emergency) parse chuỗi
 * tự do bằng splitContactText rồi dùng chính các hàm này để sinh href.
 *
 * Lưu ý: file là `.ts` (không phải `.tsx`) nên component viết bằng
 * React.createElement, KHÔNG dùng JSX.
 */
import { createElement, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { Check, Copy } from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  Pure helpers                                                              */
/* -------------------------------------------------------------------------- */

/** Chuẩn hoá SĐT cho href tel: — trim + chỉ giữ số và dấu '+' đầu. Rỗng → ''. */
export function normalizePhone(value?: string | null): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/[^0-9]/g, '')
  return hasPlus ? `+${digits}` : digits
}

/** Giá trị hiển thị cho người dùng — chỉ trim, giữ nguyên format gốc. */
export function phoneDisplay(value?: string | null): string {
  if (!value) return ''
  const trimmed = value.trim()
  return trimmed || ''
}

/** Coi là email khi có dạng local@domain.tld (không nhận chuỗi rỗng). */
export function isEmailLike(value?: string | null): boolean {
  if (!value) return false
  return /[^@\s]+@[^@\s]+\.[^@\s]+/.test(value.trim())
}

/** Sinh href mailto: — rỗng/không hợp lệ → '' (KHÔNG render link rỗng). */
export function emailHref(value?: string | null): string {
  if (!isEmailLike(value)) return ''
  return `mailto:${value?.trim()}`
}

/**
 * Tách chuỗi liên hệ tự do ("Nguyễn Văn A 0901.234.567", "sale@fdi.local",
 * "0901234567") thành { name, phone, email }. Rỗng hết → cả 3 ''.
 *
 * - email: cụm trông như email (`[^@\s]+@[^@\s]+\.[^@\s]+`) → email;
 * - phone: cụm 9–11 chữ số liền nhau (cho phép '.', '-', space ngăn); bắt đầu
 *   bằng 0 thì giữ nguyên, bắt đầu bằng 84/+84 thì chuẩn hoá về +84...;
 * - phần còn lại → name.
 */
export function splitContactText(raw?: string | null): {
  name: string
  phone: string
  email: string
} {
  const empty = { name: '', phone: '', email: '' }
  if (!raw) return empty
  const text = raw.trim()
  if (!text) return empty

  let rest = text
  let email = ''
  let phone = ''
  let name = ''

  // 1) Email trước — nó luôn mời nhầm cả name lẫn số.
  const emailMatch = rest.match(/[^@\s]+@[^@\s]+\.[^@\s]+/)
  if (emailMatch && emailMatch.index !== undefined) {
    email = emailMatch[0]
    rest = `${rest.slice(0, emailMatch.index)} ${rest.slice(emailMatch.index + email.length)}`.trim()
  }

  // 2) Số điện thoại: cụm chữ số (cho phép '.', '-', space ngăn), 9–11 số.
  const phoneMatch = rest.match(/[0-9][0-9.\-\s]{7,14}[0-9]/)
  if (phoneMatch && phoneMatch.index !== undefined) {
    const compact = phoneMatch[0].replace(/[^0-9]/g, '')
    if (/^[0-9]{9,11}$/.test(compact)) {
      if (/^84/.test(compact)) {
        phone = `+${compact}`
      } else {
        phone = normalizePhone(compact)
      }
      rest = `${rest.slice(0, phoneMatch.index)} ${rest.slice(phoneMatch.index + phoneMatch[0].length)}`.trim()
    }
  }

  // 3) Phần còn lại là tên.
  name = rest.trim()

  return { name, phone, email }
}

/* -------------------------------------------------------------------------- */
/*  CopyButton                                                                */
/* -------------------------------------------------------------------------- */

const COPY_RESET_MS = 1500
const COPY_BUTTON_CLASS =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--sidebar-group)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]'
const LINK_CLASS =
  'truncate text-[var(--muted)] hover:text-[var(--primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

async function copyText(text: string): Promise<boolean> {
  // 1) Clipboard API — có thể bị chặn ở iframe / origin không tin cậy.
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    /* fallthrough */
  }
  // 2) Fallback: textarea tạm + execCommand('copy').
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-9999px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/**
 * Nút icon copy: tự xử lý copy + fallback, tự quản copied state nội bộ
 * (icon Copy → Check 1500ms). Không render gì khi `text` rỗng.
 * `label` dùng cho cả title và aria-label ("Sao chép số điện thoại"...).
 */
export function CopyButton({
  text,
  label,
  onCopied,
}: {
  text: string
  label: string
  onCopied?: () => void
}) {
  const value = text ?? ''
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const timer = timerRef.current
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [])

  if (!value) return null

  const handleCopy = async (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const ok = await copyText(value)
    if (!ok) return
    setCopied(true)
    onCopied?.()
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), COPY_RESET_MS)
  }

  return createElement(
    'button',
    {
      type: 'button',
      onClick: handleCopy,
      title: label,
      'aria-label': label,
      className: COPY_BUTTON_CLASS,
    },
    copied
      ? createElement(Check, { size: 16, className: 'text-[var(--success)]', 'aria-hidden': true })
      : createElement(Copy, { size: 16, 'aria-hidden': true }),
  )
}

/* -------------------------------------------------------------------------- */
/*  ContactCell                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Ô cột "Liên hệ": 2 dòng — SĐT (tel:) + copy, Email (mailto:) + copy.
 * Mỗi dòng `flex items-center gap-1.5`, giá trị truncate max-w-[180px] có title.
 * Rỗng cả hai → '—'. Không bao giờ render link tel:/mailto: rỗng.
 * Click không bubble lên <tr> (row có onClick mở detail panel).
 */
export function ContactCell({
  phone,
  email,
}: {
  phone?: string | null
  email?: string | null
}) {
  const tel = normalizePhone(phone)
  const telLabel = phoneDisplay(phone)
  const mail = emailHref(email)
  const emailValue = isEmailLike(email) ? (email as string).trim() : ''

  if (!tel && !mail) {
    return createElement('span', { className: 'text-[var(--muted)]' }, '—')
  }

  const stop = (e: ReactMouseEvent<HTMLElement>) => e.stopPropagation()

  const rows: ReturnType<typeof createElement>[] = []
  if (tel) {
    rows.push(
      createElement(
        'span',
        { key: 'phone', className: 'flex items-center gap-1.5' },
        createElement(
          'a',
          {
            href: `tel:${tel}`,
            title: telLabel,
            className: LINK_CLASS,
            onClick: stop,
          },
          createElement('span', { className: 'max-w-[180px] truncate' }, telLabel),
        ),
        createElement(CopyButton, { text: tel, label: 'Sao chép số điện thoại' }),
      ),
    )
  }
  if (mail) {
    rows.push(
      createElement(
        'span',
        { key: 'email', className: 'flex items-center gap-1.5' },
        createElement(
          'a',
          {
            href: mail,
            title: emailValue,
            className: LINK_CLASS,
            onClick: stop,
          },
          createElement('span', { className: 'max-w-[180px] truncate' }, emailValue),
        ),
        createElement(CopyButton, { text: emailValue, label: 'Sao chép email' }),
      ),
    )
  }

  return createElement(
    'div',
    { className: 'flex flex-col gap-1 py-1', onClick: stop },
    ...rows,
  )
}
