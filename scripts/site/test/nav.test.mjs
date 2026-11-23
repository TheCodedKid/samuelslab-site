import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadPage, findAll, hasClass, text, PUBLIC } from '../html.mjs'

const LABELS = ['projects', 'code', 'writeups', 'ideas', 'resources', 'about']
const PAGES = [
  'index.html',
  'projects/boxxy---my-voron-printer.html',
  'resources/samuel’s-keyboard-palace/index.html', // slug with a typographic apostrophe
  'tags/python.html',
  '404.html',
]

const navLinks = (page) => {
  const [nav] = findAll(loadPage(page), (el) => hasClass(el, 'nav-links'))
  assert.ok(nav, `${page}: no .nav-links`)
  return findAll(nav, (el) => el.tagName === 'a')
}

/** Resolve a relative href from a built page to a file under public/. */
const target = (page, href) => {
  const clean = decodeURIComponent(href.split('#')[0])
  const abs = path.resolve(path.dirname(path.join(PUBLIC, page)), clean)
  return [abs + '.html', path.join(abs, 'index.html'), abs].find((f) => fs.existsSync(f) && fs.statSync(f).isFile())
}

for (const page of PAGES) {
  test(`${page}: nav row has the six links in order`, () => {
    assert.deepEqual(navLinks(page).map((a) => text(a).trim()), LABELS)
  })
  test(`${page}: nav links are relative and resolve`, () => {
    for (const a of navLinks(page)) {
      const href = String(a.properties.href)
      assert.ok(!href.startsWith('/'), href)
      assert.ok(target(page, href), `${page}: ${href} does not resolve`)
    }
  })
}

test('nav row sits in the page header', () => {
  const [header] = findAll(loadPage('index.html'), (el) => hasClass(el, 'page-header'))
  assert.equal(findAll(header, (el) => hasClass(el, 'nav-links')).length, 1)
})

test('footer links "you matter"', () => {
  const [footer] = findAll(loadPage('index.html'), (el) => el.tagName === 'footer')
  const a = findAll(footer, (el) => el.tagName === 'a' && /you matter/.test(text(el)))
  assert.equal(a.length, 1)
  assert.equal(a[0].properties.href, 'https://lab.samuel.fail/writeups/you-matter')
})
