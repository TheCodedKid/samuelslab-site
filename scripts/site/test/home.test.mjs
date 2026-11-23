import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadPage, findAll, hasClass, text } from '../html.mjs'

const home = () => loadPage('index.html')
/** The base list views on the homepage, in document order. */
const lists = (t) => findAll(t, (el) => hasClass(el, 'bases-list-wrapper'))
const rows = (list) => findAll(list, (el) => hasClass(el, 'bases-list-item'))

test('homepage lists 1–6 finished projects, each a link, no undefined', () => {
  const [projects] = lists(home())
  assert.ok(projects, 'no finished-projects list')
  const r = rows(projects)
  assert.ok(r.length >= 1 && r.length <= 6, `got ${r.length} rows`)
  for (const row of r) {
    assert.ok(findAll(row, (el) => el.tagName === 'a').length > 0, 'row without a link')
    assert.doesNotMatch(text(row), /undefined|null/)
  }
})

test('dated projects sort before undated ones', () => {
  const [projects] = lists(home())
  const first = rows(projects)[0]
  assert.match(text(first), /Boxxy/, 'Boxxy (the only dated project) should lead the list')
})

test('homepage lists 1–3 writeups and not "You matter"', () => {
  const [, writeups] = lists(home())
  assert.ok(writeups, 'no writeups list')
  const r = rows(writeups)
  assert.ok(r.length >= 1 && r.length <= 3, `got ${r.length} rows`)
  assert.doesNotMatch(text(writeups), /You matter/)
})

test('homepage has a now block', () => {
  assert.ok(findAll(home(), (el) => el.tagName === 'h2' && /^now$/i.test(text(el).trim())).length === 1)
})

test('moved sections are gone from homepage', () => {
  const h = text(home())
  for (const s of ['Contributed To', 'Done for Now', 'Tools I like/use', 'Other Stuff', 'Silly resources', 'BEFORE READING'])
    assert.ok(!h.includes(s), s)
})

test('moved sections landed', () => {
  assert.match(text(loadPage('main/resources.html')), /Tools I like ?\/ ?use/)
  assert.match(text(loadPage('code/open-source-contributions.html')), /spotatui/)
  assert.match(text(loadPage('code/open-source-contributions.html')), /EasyEffects/)
  const about = loadPage('main/about.html')
  assert.ok(findAll(about, (el) => el.tagName === 'img').length >= 2, 'about needs selfie + other stuff')
  assert.match(text(about), /xkcd/)
  assert.ok(findAll(about, (el) => el.tagName === 'a' && String(el.properties.href).includes('github.com/TheCodedKid')).length >= 1)
})

test('projects page lists every finished project', () => {
  const [all] = lists(loadPage('main/projects.html'))
  assert.ok(all, 'no list on main/projects')
  assert.ok(rows(all).length >= 11, `got ${rows(all).length}`)
})

test('homepage links stay relative', () => {
  for (const a of findAll(home(), (el) => el.tagName === 'a')) {
    const href = String(a.properties.href ?? '')
    assert.ok(!href.startsWith('/'), href)
  }
})
