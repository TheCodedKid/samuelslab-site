import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanVault, isPublished } from '../vault.mjs'
import { buildResolver, rewriteLinks } from '../links.mjs'

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'vault')
const { notes, files } = scanVault(fixture)
const resolve = buildResolver([...notes.keys()], files)
const published = new Set([...notes].filter(([, n]) => isPublished(n.data)).map(([p]) => p))

const LAB = 'Sam’s World/Samuel’s Lab/'
const HOME = LAB + 'Samuel’s Lab.md'
const PORTA = LAB + 'Projects/Headphones/Koss/Porta Pro & KPH40.md'
const PARTS_V2 = LAB + 'Projects/Server Build/Parts List (V2)/Parts List (V2).md'

const rw = (body, from = HOME) => rewriteLinks(body, { from, resolve, published })
const out = (body, from) => rw(body, from).body

// --- resolver ---

test('resolver: exact vault path with and without .md', () => {
  assert.equal(resolve(PORTA.slice(0, -3), HOME), PORTA)
  assert.equal(resolve(PORTA, HOME), PORTA)
})
test('resolver: unique basename, case-insensitive', () => {
  assert.equal(resolve('porta pro & kph40', HOME), PORTA)
  assert.equal(resolve('pic.png', HOME), 'Media/pic.png')
})
test('resolver: relative to linking note folder', () => {
  assert.equal(resolve('../../Media/doc.pdf', HOME), 'Media/doc.pdf')
  assert.equal(resolve('Koss/Porta Pro & KPH40', LAB + 'Projects/Headphones/x.md'), PORTA)
})
test('resolver: ambiguous basename prefers longest shared folder prefix', () => {
  assert.equal(resolve('CPU', PARTS_V2), LAB + 'Projects/Server Build/Parts List (V2)/CPU.md')
  assert.equal(
    resolve('CPU', LAB + 'Projects/Server Build/Parts List (V1)/Other.md'),
    LAB + 'Projects/Server Build/Parts List (V1)/CPU.md',
  )
})
test('resolver: ambiguous with tie returns null; missing returns null', () => {
  assert.equal(resolve('CPU', HOME), null)
  assert.equal(resolve('Samuel’s Underground Fortress/Old/Gone', HOME), null)
})
test('resolver: NFD target normalized to NFC', () => {
  assert.equal(resolve(PORTA.normalize('NFD'), HOME), PORTA)
})

// --- rewriting: published targets ---

test('full-path wikilink with alias to published note', () => {
  assert.equal(
    out('[[Sam’s World/Samuel’s Lab/Projects/Headphones/Koss/Porta Pro & KPH40|Porta]]'),
    '[[Projects/Headphones/Koss/Porta Pro & KPH40|Porta]]',
  )
})
test('ambiguous basename resolves to sibling; display preserved', () => {
  const r = rw('- [[CPU]]', PARTS_V2)
  assert.equal(r.body, '- [[Projects/Server Build/Parts List (V2)/CPU|CPU]]')
  assert.equal(r.rewritten, 1)
})
test('heading link to published note keeps fragment, Obsidian-style display', () => {
  assert.equal(
    out('[[Porta Pro & KPH40#Mods]]'),
    '[[Projects/Headphones/Koss/Porta Pro & KPH40#Mods|Porta Pro & KPH40 > Mods]]',
  )
})
test('block ref to published note keeps #^abc', () => {
  const o = out('[[Porta Pro & KPH40#^abc]]')
  assert.ok(o.startsWith('[[Projects/Headphones/Koss/Porta Pro & KPH40#^abc'), o)
})
test('home note links to index', () => {
  assert.equal(out('[[Samuel’s Lab]]', PORTA), '[[index|Samuel’s Lab]]')
})
test('escaped pipe in table survives', () => {
  assert.equal(
    out('| [[Porta Pro & KPH40\\|Porta]] |'),
    '| [[Projects/Headphones/Koss/Porta Pro & KPH40\\|Porta]] |',
  )
})
test('embed of published note keeps embed', () => {
  assert.equal(out('![[Porta Pro & KPH40]]'), '![[Projects/Headphones/Koss/Porta Pro & KPH40]]')
})

// --- rewriting: unpublished / missing ---

test('unpublished note links become plain text, no folder path', () => {
  assert.equal(out('[[secret-diary]]'), 'secret-diary')
  assert.equal(out('[[Dailys/2026/secret-diary|my day]]'), 'my day')
  assert.equal(out('[[Dailys/2026/secret-diary#Morning]]'), 'secret-diary > Morning')
  assert.equal(out('[[Dailys/2026/secret-diary#^blk]]'), 'secret-diary')
  const all = out(
    'a [[secret-diary]] b [[Dailys/2026/secret-diary|my day]] c [[Dailys/2026/secret-diary#Morning]] d [x](../../Dailys/2026/secret-diary.md)',
  )
  assert.ok(!all.includes('Dailys'), all)
})
test('escaped-pipe alias to unpublished note in table becomes alias', () => {
  assert.equal(out('| [[secret-diary\\|day]] |'), '| day |')
})
test('dead link becomes bare name', () => {
  assert.equal(out('[[Samuel’s Underground Fortress/Old/Gone]]'), 'Gone')
  assert.equal(out('[[Samuel’s Underground Fortress/Old/Gone.md#Top]]'), 'Gone > Top')
})
test('embed of unpublished note is removed', () => {
  assert.equal(out('![[secret-diary]]'), '')
  assert.equal(out('x ![[Private Thing]] y'), 'x  y')
})
test('markdown link to unpublished note becomes its text; embed removed', () => {
  assert.equal(out('[diary](../../Dailys/2026/secret-diary.md)'), 'diary')
  assert.equal(out('see [p](Private%20Thing.md).'), 'see p.')
})

// --- attachments ---

test('image embed with size rewritten to content path, recorded', () => {
  const r = rw('![[pic.png|300]]')
  assert.equal(r.body, '![[Media/pic.png|300]]')
  assert.deepEqual([...r.attachments], ['Media/pic.png'])
})
test('markdown links: relative attachment and %20-encoded note', () => {
  const r = rw('[doc](../../Media/doc.pdf) and [p](Porta%20Pro%20%26%20KPH40.md)')
  assert.equal(
    r.body,
    '[doc](Media/doc.pdf) and [p](Projects/Headphones/Koss/Porta%20Pro%20&%20KPH40)',
  )
  assert.ok(r.attachments.has('Media/doc.pdf'))
  assert.equal(r.rewritten, 2)
})
test('markdown link URL with parens and ’ is encoded', () => {
  assert.equal(
    out('[c](<Projects/Server Build/Parts List (V2)/CPU.md>)', HOME),
    '[c](Projects/Server%20Build/Parts%20List%20%28V2%29/CPU)',
  )
})
test('markdown image to attachment', () => {
  const r = rw('![x](Media/pic.png "t")')
  assert.equal(r.body, '![x](Media/pic.png "t")')
  assert.ok(r.attachments.has('Media/pic.png'))
})
test('missing attachment embed is removed with one warning', () => {
  const r = rw('a ![[nope.png]] b')
  assert.equal(r.body, 'a  b')
  assert.equal(r.warnings.length, 1)
  assert.equal(r.warnings[0], `missing attachment nope.png in ${HOME}`)
  assert.equal(r.attachments.size, 0)
})
test('missing markdown image is removed with warning', () => {
  const r = rw('![x](Media/nope.png)')
  assert.equal(r.body, '')
  assert.equal(r.warnings.length, 1)
})

// --- untouched ---

test('fenced and inline code untouched', () => {
  for (const s of [
    '```\n[[secret-diary]]\n```',
    '~~~md\n![[secret-diary]] [x](Dailys/2026/secret-diary.md)\n~~~',
    '`[[secret-diary]]`',
    'a ``x [[secret-diary]] ` y`` b',
  ]) {
    assert.equal(out(s), s)
  }
})
test('text around code still rewritten', () => {
  assert.equal(
    out('[[secret-diary]] `[[secret-diary]]`\n```\n[[secret-diary]]\n```\n[[secret-diary]]'),
    'secret-diary `[[secret-diary]]`\n```\n[[secret-diary]]\n```\nsecret-diary',
  )
})
test('external links and anchors untouched', () => {
  for (const s of ['[site](https://example.com)', '[m](mailto:a@b.c)', '[h](#heading)', '[[#Local]]']) {
    assert.equal(out(s), s)
  }
})
test('link wrapping an image: both resolved', () => {
  assert.equal(
    out('[![x](Media/pic.png)](Dailys/2026/secret-diary.md)'),
    '![x](Media/pic.png)',
  )
})
