// Regression 2026-11-24: Badge / text-muted phải đạt WCAG AA (contrast ≥ 4.5).
// Bẫy thật: --muted trước đây = #b8d0ce khiến Badge `default`
// (nền bg-sidebar-group + chữ text-muted) cho contrast 1.19 và
// `text-muted` trên nền trắng cho 1.00 ⇒ CHỮ VÔ HÌNH (đo getComputedStyle trên prod:
// chữ rgb(248,252,249) y hệt nền rgb(248,252,249)).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const root = new URL('..', import.meta.url).pathname
const css = readFileSync(root + 'app/globals.css', 'utf8')
const badge = readFileSync(root + 'components/ui/ui.tsx', 'utf8')

function hexAfter(src, name) {
  const re = new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})`)
  const m = src.match(re)
  return m ? m[1] : null
}

function lum(h) {
  const s = h.replace('#', '')
  const full = s.length === 3 ? s.split('').map((c) => c + c).join('') : s
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
  const f = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function contrast(fg, bg) {
  const L1 = lum(fg); const L2 = lum(bg)
  const hi = Math.max(L1, L2); const lo = Math.min(L1, L2)
  return (hi + 0.05) / (lo + 0.05)
}

test('P0: --muted không còn là màu nhạt gây mất chữ', () => {
  const muted = hexAfter(css, '--muted')
  assert.ok(muted, 'tìm thấy --muted trong globals.css')
  // Nền chữ thường nhất của bảng/card là trắng.
  assert.ok(contrast(muted, '#ffffff') >= 4.5, `--muted ${muted} phải đạt AA trên trắng`)
  // Và trên nền sidebar-group (#f8fcf9) — nơi Badge default đặt chữ.
  assert.ok(contrast(muted, '#f8fcf9') >= 4.5, `--muted ${muted} phải đạt AA trên sidebar-group`)
})

test('P0: Badge default có chữ tương phản với nền của chính nó', () => {
  // default = bg-sidebar-group + text-muted. Đây là variant dùng cho ô Ngành.
  assert.match(badge, /const neutral = 'bg-sidebar-group text-muted border border-border'/)
  const muted = hexAfter(css, '--muted')
  assert.ok(contrast(muted, '#f8fcf9') >= 4.5, 'Badge default phải đọc được')
})

test('P0: utility .text-muted PHẢI có rule (trước: không có → màu kế thừa trùng nền)', () => {
  // Nguyên nhân gốc thật: Tailwind chỉ sinh `.text-muted-foreground`, không sinh
  // `.text-muted`. Mọi chỗ dùng `text-muted` rơi về màu kế thừa ⇒ Badge vô hình.
  assert.match(css, /\.text-muted\s*\{\s*color:\s*var\(--muted\)/,
              '.text-muted phải được khai báo, trỏ vào --muted')
})

test('P1: variant critical / major đạt AA (trước: 3.45 và 2.23)', () => {
  // critical: chữ #b32833 trên risk/15 (~#fdf2f3)
  assert.match(badge, /critical: 'bg-risk\/15 text-\[#b32833\]/)
  assert.ok(contrast('#b32833', '#fdf2f3') >= 4.5, 'critical phải đạt AA')
  assert.match(badge, /major: 'bg-kpi-tickets\/15 text-\[#a45a05\]/)
  assert.ok(contrast('#a45a05', '#fef4e6') >= 4.5, 'major phải đạt AA')
})
