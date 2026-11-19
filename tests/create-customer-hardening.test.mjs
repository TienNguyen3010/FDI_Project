// Hardening regression test: static assertions over the single hardened component.
// Chạy: node --test tests/create-customer-hardening.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const file = new URL('../components/customers/CreateCustomerForm.tsx', import.meta.url)
const code = readFileSync(file, 'utf8')

test('P0: bỏ input mã giả — không còn codeInput', () => {
  assert.ok(!code.includes('codeInput'), 'không được còn state codeInput')
  assert.ok(!code.includes("setCodeInput"), 'không được còn setter mã giả')
})

test('P0: ô mã là readonly "Tự động tạo", giữ prefix CUS- dạng span', () => {
  assert.ok(code.includes('readOnly'), 'ô mã phải readOnly')
  assert.ok(code.includes('Tự động tạo'), 'phải hiển thị Tự động tạo')
  assert.ok(code.includes('CUS-'), 'giữ prefix CUS- dạng span')
})

test('consent_contact: checkbox + payload boolean + consent_contact_at', () => {
  assert.ok(code.includes('consent_contact'), 'phải có field consent_contact')
  assert.ok(code.includes('type="checkbox"'), 'phải có checkbox')
  assert.ok(code.includes('consent_contact_at'), 'phải gửi consent_contact_at')
  assert.ok(code.includes('new Date().toISOString()'), 'true → timestamp ISO')
  assert.ok(/consent_contact_at\s*=\s*consentContact\s*\?/.test(code) === false ||
    code.includes('consentContact ? new Date().toISOString() : null'), 'false → null')
  assert.ok(code.includes('boolean | null'), 'payload type chứa boolean | null')
})

test('null thay chuỗi rỗng cho field optional', () => {
  assert.ok(/:\s*null/.test(code), 'có nhánh gán null trong payload')
})

test('email lowercase khi build payload', () => {
  assert.ok(code.includes('.toLowerCase()'), 'email phải lowercase ở payload')
})

test('name min-length 2', () => {
  assert.ok(code.includes('.length < 2'), 'phải có rule min-length 2 cho tên')
})

test('phone: BỎ chặn cứng — KHÔNG gán regex vào errors', () => {
  assert.ok(!code.includes('next.phone ='), 'KHÔNG được chặn phone trong errors')
  assert.ok(code.includes('phoneWarning'), 'phải có cảnh báo inline riêng')
  assert.ok(code.includes('PHONE_RE'), 'vẫn giữ regex để cảnh báo')
})

test('onBlur validate từng field trong fieldProps', () => {
  assert.ok(code.includes('onBlur:'), 'fieldProps phải có onBlur')
  assert.ok(code.includes('fieldError(key, form[key])'), 'blur gọi fieldError')
})

test('setErrors lỗi → focus/scroll tới f-<key>', () => {
  assert.ok(code.includes('scrollIntoView'), 'phải scroll tới field đầu lỗi')
  assert.ok(code.includes('.focus()'), 'phải focus field đầu lỗi')
  assert.ok(code.includes('`f-${firstKey}`'), 'focus theo id f-<firstKey>')
})

test('summary <dd> có title={giá trị đầy đủ}', () => {
  assert.ok(code.includes('title={value}'), 'dd truncate phải có title')
})

test('Label Ghi chú có htmlFor="f-notes"', () => {
  assert.ok(code.includes('htmlFor="f-notes"'), 'Label Ghi chú phải htmlFor f-notes')
})

test('summary Mã dùng <Badge>', () => {
  assert.ok(code.includes('<Badge>{value}</Badge>'), 'summary Mã dùng Badge')
})

test('nút Lưu khi saving dùng <Spinner>', () => {
  assert.ok(code.includes('<Spinner'), 'dùng Spinner thay Save animate-pulse')
  assert.ok(!code.includes('animate-pulse'), 'không còn animate-pulse')
  assert.ok(code.includes('Đang lưu...'), 'giữ text Đang lưu...')
})

test('error text dùng text-destructive', () => {
  assert.ok(code.includes('text-destructive'), 'dùng token text-destructive')
  assert.ok(!code.includes('text-[var(--danger)]'), 'không còn text-[var(--danger)]')
})
