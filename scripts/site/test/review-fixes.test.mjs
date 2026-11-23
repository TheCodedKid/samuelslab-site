// Regression tests for the final-review findings (Important 1–5).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadPage, findAll, hasClass, text, PUBLIC } from '../html.mjs'

const css = fs
  .readdirSync(PUBLIC)
  .filter((f) => f.endsWith('.css'))
  .map((f) => fs.readFileSync(path.join(PUBLIC, f), 'utf8'))
  .join('\n')

// 1. Empty properties are omitted by bases-page, so styling must not depend on column position.
test('base list columns are styled by content, not position', () => {
  assert.ok(!/\.bases-list-property:nth-child/.test(css), 'still positional')
  assert.ok(/\.bases-list-property:has\(\.bases-text\)/.test(css), 'description by content')
  assert.ok(/\.bases-list-property:has\(\.bases-number\)/.test(css), 'year by content')
  // the markers those selectors rely on exist in the rendered rows
  const [boxxy] = findAll(loadPage('index.html'), (el) => hasClass(el, 'bases-list-item'))
  assert.ok(findAll(boxxy, (el) => hasClass(el, 'bases-text')).length === 1)
  assert.ok(findAll(boxxy, (el) => hasClass(el, 'bases-number')).length === 1)
})

// 2. 404.html is served at any depth, so its nav must not be page-relative; and no stray title/meta.
test('404 nav links are site-absolute', () => {
  const [nav] = findAll(loadPage('404.html'), (el) => hasClass(el, 'nav-links'))
  for (const a of findAll(nav, (el) => el.tagName === 'a')) assert.match(String(a.properties.href), /^\/main\//)
})
test('404 has no article title or date line', () => {
  const t = loadPage('404.html')
  for (const c of ['article-title', 'content-meta']) assert.equal(findAll(t, (el) => hasClass(el, c)).length, 0, c)
})

// 3. "all →" under writeups lists every writeup.
test('writeups page lists every writeup automatically', () => {
  const [list] = findAll(loadPage('main/writeups.html'), (el) => hasClass(el, 'bases-list-wrapper'))
  assert.ok(list, 'no base list on main/writeups')
  const rows = findAll(list, (el) => hasClass(el, 'bases-list-item')).map((r) => text(r))
  assert.ok(rows.length >= 5, `got ${rows.length}`)
  assert.ok(rows.some((r) => /Nix/.test(r)))
})

// 4. Samuel's asides from the old homepage live on their section pages.
for (const [page, aside] of [
  ['main/code.html', "be nice to me"],
  ['main/writeups.html', 'me blabbering'],
  ['main/project-ideas.html', 'ideas I might pick up'],
  ['main/projects.html', "things I’ve built or am still building"],
  ['main/resources.html', 'help me write this section'],
])
  test(`${page} keeps the aside "${aside}"`, () => {
    assert.ok(text(loadPage(page)).replace(/'/g, '’').includes(aside.replace(/'/g, '’')), aside)
  })

// 5. Project pages show the one-line summary.
test('project page shows the description as a one-line summary', () => {
  const [s] = findAll(loadPage('code/poach-stopper.html'), (el) => hasClass(el, 'pm-summary'))
  assert.ok(s, 'no .pm-summary')
  assert.equal(text(s).trim(), 'Inline soft-start / relay protection for MIT Mini Cheetah motor controllers')
})
