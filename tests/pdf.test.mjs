// Unit test cho font Inter nhúng (pdf-lib) — giữ lại sau khi dọn code legacy P2.
// Không import TS trực tiếp (Node không chạy TS): kiểm tra cấu trúc thật trên đĩa.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const FONTS = ['assets/fonts/Inter-Regular.ttf', 'assets/fonts/Inter-Bold.ttf']

test('file font Inter tồn tại và có magic bytes TTF 00010000', () => {
  for (const rel of FONTS) {
    assert.ok(existsSync(resolve(root, rel)), `thiếu file font ${rel}`)
    const magic = readFileSync(resolve(root, rel)).subarray(0, 4).toString('hex')
    assert.equal(magic, '00010000', `${rel} không phải TTF hợp lệ (magic=${magic})`)
  }
})
