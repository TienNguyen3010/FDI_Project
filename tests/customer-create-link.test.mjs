// Regression: nút "Thêm mới" trên Customers list phải điều hướng tới /customers/new
// (CUS-L07), không mở modal generic của CrudPage.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const root = new URL('..', import.meta.url).pathname

test('CrudPage hỗ trợ createHref (link thay vì modal)', () => {
  const src = readFileSync(root + 'components/crud/CrudPage.tsx', 'utf8')
  assert.match(src, /createHref\?: string/, 'CrudConfig phải có createHref')
  assert.match(src, /config\.createHref \? \(/, 'phải nhánh sang Link khi có createHref')
  assert.match(src, /href=\{config\.createHref\}/, 'Link phải dùng config.createHref')
})

test('Customers config trỏ createHref tới /customers/new', () => {
  const src = readFileSync(root + 'app/(workspace)/customers/page.tsx', 'utf8')
  assert.match(src, /createHref: ['"]\/customers\/new['"]/)
})
