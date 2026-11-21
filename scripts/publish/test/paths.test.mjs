import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toContentPath, toSlugTarget } from '../paths.mjs'

const HOME = 'Sam’s World/Samuel’s Lab/Samuel’s Lab.md'

test('home note maps to index.md', () => {
  assert.equal(toContentPath(HOME), 'index.md')
})
test('lab prefix is stripped', () => {
  assert.equal(
    toContentPath('Sam’s World/Samuel’s Lab/Projects/Headphones/Koss/Porta Pro & KPH40.md'),
    'Projects/Headphones/Koss/Porta Pro & KPH40.md',
  )
})
test('other paths are kept', () => {
  assert.equal(toContentPath('Media/pic.png'), 'Media/pic.png')
  assert.equal(toContentPath('Dailys/2026/x.md'), 'Dailys/2026/x.md')
})
test('slug target drops .md, home is index', () => {
  assert.equal(toSlugTarget(HOME), 'index')
  assert.equal(toSlugTarget('Sam’s World/Samuel’s Lab/Projects/A B.md'), 'Projects/A B')
  assert.equal(toSlugTarget('Media/pic.png'), 'Media/pic.png')
})
test('NFD input is normalized to NFC', () => {
  assert.equal(toContentPath('Café/x.md'), 'Café/x.md')
})
