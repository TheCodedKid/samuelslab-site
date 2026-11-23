import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadPage, findAll, hasClass } from '../html.mjs'

const PAGES = [
  'index.html',
  'projects/boxxy---my-voron-printer.html',
  'writeups/nix.html',
  'main/index.html', // folder page
  '404.html',
]

for (const page of PAGES)
  test(`${page}: clean single-column layout`, () => {
    const t = loadPage(page)
    for (const cls of ['explorer', 'graph', 'backlinks', 'readermode'])
      assert.equal(findAll(t, (el) => hasClass(el, cls)).length, 0, `${page} has .${cls}`)
    assert.equal(findAll(t, (el) => hasClass(el, 'note-properties')).length, 0, `${page} shows Properties`)
    assert.ok(findAll(t, (el) => hasClass(el, 'search')).length > 0, `${page} lost search`)
  })
