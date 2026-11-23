import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadPage, findAll, PUBLIC } from '../html.mjs'

// All emitted stylesheets (the main one is index-<hash>.css).
const css = fs
  .readdirSync(PUBLIC)
  .filter((f) => f.endsWith('.css'))
  .map((f) => fs.readFileSync(path.join(PUBLIC, f), 'utf8'))
  .join('\n')
const fontHrefs = () =>
  findAll(loadPage('index.html'), (el) => el.tagName === 'link' && String(el.properties.href ?? '').includes('fonts.googleapis.com/css'))
    .map((el) => decodeURIComponent(String(el.properties.href)).replace(/\+/g, ' '))
    .join(' ')

test('Space Mono, IBM Plex Sans and IBM Plex Mono are loaded', () => {
  const h = fontHrefs()
  for (const f of ['Space Mono', 'IBM Plex Sans', 'IBM Plex Mono']) assert.ok(h.includes(f), `${f} not in ${h}`)
})

test('Courier is gone', () => {
  assert.ok(!/Courier/.test(css), 'css still has Courier')
  assert.doesNotMatch(fontHrefs(), /Courier/)
})

test('headings and lists use Space Mono, paragraphs do not', () => {
  assert.ok(/--headerFont:[^;]*Space Mono/.test(css), 'missing: 29')
  assert.ok(/--bodyFont:[^;]*IBM Plex Sans/.test(css), 'missing: 30')
  assert.ok(/\.nav-links[^{]*\{[^}]*font-family:[^;}]*var\(--headerFont\)/.test(css), 'missing: 31')
})

test('homepage cursor blinks and respects reduced motion', () => {
  assert.ok(/@keyframes blink/.test(css), 'missing: 35')
  assert.ok(/prefers-reduced-motion/.test(css), 'missing: 36')
  assert.ok(/data-slug=["']?index["']?\][^{]*\.article-title:{1,2}after/.test(css), 'missing: 37')
})

test('tagline rule targets an all-italic first paragraph', () => {
  assert.ok(/p:first-of-type:has\(>\s*em:only-child\)/.test(css), 'missing: 41')
})

test('no horizontal page scroll from wide content', () => {
  assert.ok(/overflow-x:\s*auto/.test(css), 'missing: 45')
})
