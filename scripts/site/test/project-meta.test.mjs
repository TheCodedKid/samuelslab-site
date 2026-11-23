import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadPage, findAll, hasClass, text } from '../html.mjs'

const meta = (page) => findAll(loadPage(page), (el) => hasClass(el, 'project-meta'))
const FINISHED_PAGES = [
  'projects/boxxy---my-voron-printer.html',
  'projects/headphones/index.html',
  'projects/server-build/index.html',
  'projects/project-tunnel-vision/index.html',
  'projects/onewheel-stuff.html',
  'code/poach-stopper.html',
  'code/5gsis.html',
  'code/pic18.html',
  'code/web.samtalks.us.html',
  'code/the-wizard-kit.html',
  'code/despas.html',
]

test('boxxy shows status, tags, year and cover', () => {
  const [pm] = meta('projects/boxxy---my-voron-printer.html')
  assert.ok(pm, 'no .project-meta')
  assert.match(text(pm), /finished/)
  assert.match(text(pm), /2022/)
  assert.ok(findAll(pm, (el) => hasClass(el, 'tag-link')).length >= 1)
  const t = loadPage('projects/boxxy---my-voron-printer.html')
  assert.equal(findAll(t, (el) => hasClass(el, 'pm-cover')).length, 1)
})

test('repo link present when the note has one', () => {
  const [pm] = meta('code/poach-stopper.html')
  const [a] = findAll(pm, (el) => hasClass(el, 'pm-repo'))
  assert.equal(a.properties.href, 'https://github.com/TheCodedKid/poachstopper')
})

test('no repo link or year when the note lacks them', () => {
  const [pm] = meta('projects/headphones/index.html')
  assert.equal(findAll(pm, (el) => hasClass(el, 'pm-repo')).length, 0)
  assert.equal(findAll(pm, (el) => hasClass(el, 'pm-year')).length, 0)
})

test('no meta on non-project pages', () => {
  assert.equal(meta('writeups/nix.html').length, 0)
  assert.equal(meta('index.html').length, 0)
})

test('no undefined/null or dangling separators on any finished project', () => {
  for (const p of FINISHED_PAGES) {
    const [pm] = meta(p)
    assert.ok(pm, `${p}: no .project-meta`)
    assert.doesNotMatch(text(pm), /undefined|null|·\s*·|·\s*$|^\s*·/, p)
  }
})

test('tag links are relative', () => {
  const [pm] = meta('code/pic18.html')
  for (const a of findAll(pm, (el) => hasClass(el, 'tag-link')))
    assert.ok(!String(a.properties.href).startsWith('/'), a.properties.href)
})

test('info strip sits right under the title, before the date line', () => {
  const t = loadPage('code/pic18.html')
  const order = findAll(t, (el) => ['article-title', 'content-meta', 'project-meta'].some((c) => hasClass(el, c)))
    .map((el) => ['article-title', 'content-meta', 'project-meta'].find((c) => hasClass(el, c)))
  assert.deepEqual(order, ['article-title', 'project-meta', 'content-meta'])
})
