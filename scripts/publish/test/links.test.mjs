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
  assert.deepEqual([...r.attachments], [['Media/pic.png', 'Media/pic.png']])
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

// --- review fixes: leak cases ---

const noLeak = (o) => {
  assert.ok(!o.includes('Dailys'), `leaked Dailys: ${JSON.stringify(o)}`)
  assert.ok(!o.includes('secret-diary/'), `leaked secret-diary/: ${JSON.stringify(o)}`)
  assert.ok(!/secret[^\n]*\.md/.test(o), `leaked .md path: ${JSON.stringify(o)}`)
}

test('fix1: fence inside blockquote closes when the quote ends', () => {
  const o = out('> ```\n> code\n\nafter [[Dailys/2026/secret-diary]]')
  noLeak(o)
  assert.equal(o, '> ```\n> code\n\nafter secret-diary')
})
test('fix1: fence inside list item closes when indentation ends', () => {
  const o = out('- item\n  ```\n  code\n\npara [[Dailys/2026/secret-diary]]')
  noLeak(o)
  assert.equal(o, '- item\n  ```\n  code\n\npara secret-diary')
})
test('fix1: fence inside list item stays open across blank line at its indent', () => {
  const s = '- item\n  ```\n  a\n\n  [[secret-diary]]\n  ```\n'
  assert.equal(out(s), s)
})
test('fix2: escaped backtick does not open a code span', () => {
  const o = out('use \\` here [[Dailys/2026/secret-diary]] and `x`')
  noLeak(o)
  assert.equal(o, 'use \\` here secret-diary and `x`')
})
test('fix3: reference-style links to unpublished note are dropped', () => {
  const o = out('[x][r] and [R][] and [r]\n\n[r]: Dailys/2026/secret-diary.md "t"\n')
  noLeak(o)
  assert.equal(o, 'x and R and r\n\n')
  const img = out('![a][i]\n\n[i]: <Dailys/2026/secret-diary.md>')
  noLeak(img)
  assert.equal(img, '\n\n')
})
test('fix3: reference definition to published note / attachment is rewritten', () => {
  const r = rw('[p][r] ![i][m]\n\n[r]: Porta%20Pro%20%26%20KPH40.md\n[m]: ../../Media/pic.png')
  assert.equal(
    r.body,
    '[p][r] ![i][m]\n\n[r]: Projects/Headphones/Koss/Porta%20Pro%20&%20KPH40\n[m]: Media/pic.png',
  )
  assert.ok(r.attachments.has('Media/pic.png'))
})
test('fix3: footnotes and unrelated brackets untouched', () => {
  const s = 'a[^1] - [ ] task [note]\n\n[^1]: Dailys is a folder'
  assert.equal(out(s), s)
})
test('fix4: HTML a/img with relative targets', () => {
  const o = out('<a href="../../Dailys/2026/secret-diary.md">my <b>day</b></a> <img src="../../Dailys/2026/secret-diary.md">')
  noLeak(o)
  assert.equal(o, 'my <b>day</b> ')
  const r = rw('<a class="x" href="Porta%20Pro%20%26%20KPH40.md#Mods">P</a> <img alt="p" src=\'../../Media/pic.png\' />')
  assert.equal(
    r.body,
    '<a class="x" href="Projects/Headphones/Koss/Porta%20Pro%20&%20KPH40#Mods">P</a> <img alt="p" src="Media/pic.png" />',
  )
  assert.ok(r.attachments.has('Media/pic.png'))
  const m = rw('<img src="Media/nope.png">')
  assert.equal(m.body, '')
  assert.equal(m.warnings.length, 1)
  assert.equal(out('<a href="https://example.com">e</a>'), '<a href="https://example.com">e</a>')
})
test('fix5: wikilink target with nested brackets', () => {
  const o = out('[[Dailys/2026/secret [draft]]]')
  noLeak(o)
  assert.equal(o, 'secret [draft]')
})
test('fix6: markdown URL with spaces, bare and angle-bracketed', () => {
  for (const s of ['[x](Dailys/2026/secret diary.md)', '[x](<Dailys/2026/secret diary.md>)', '[x](Dailys/2026/secret diary.md "t")']) {
    const o = out(s)
    noLeak(o)
    assert.equal(o, 'x')
  }
  assert.equal(
    out('[p](Projects/Headphones/Koss/Porta Pro & KPH40.md)'),
    '[p](Projects/Headphones/Koss/Porta%20Pro%20&%20KPH40)',
  )
})
test('fix7: fail-safe pass strips any leftover wikilink or relative .md link', async () => {
  const { failSafe } = await import('../links.mjs')
  const o = failSafe('a [[Dailys/2026/secret-diary|x]] b ![[Dailys/2026/secret-diary]] c [y](Dailys/2026/secret-diary.md#h) d [[#Local]]\n[z](https://e.com/a.md)')
  noLeak(o.split('\n')[0])
  assert.equal(o, 'a secret-diary b  c y d [[#Local]]\n[z](https://e.com/a.md)')
  // rewritten published links survive the full pipeline including the fail-safe
  assert.equal(
    out('[[Porta Pro & KPH40|a [b]]] x'),
    '[[Projects/Headphones/Koss/Porta Pro & KPH40|a [b]]] x',
  )
})
test('fix7: fail-safe is wired into rewriteLinks (main regex misses 2-level nesting)', () => {
  const o = out('x [[Dailys/2026/secret [a [b]]]] y [q](Dailys/2026/x [a [b]].md)')
  noLeak(o)
})
test('fix8: attachment in a private folder flattened to Media/', () => {
  const r = rw('![[Sam’s World/Socki’s Dirt Hole/Secret Idea/diagram.png]] [d](<../Socki’s Dirt Hole/Secret Idea/diagram.png>)')
  assert.equal(r.body, '![[Media/diagram.png]] [d](Media/diagram.png)')
  assert.ok(!r.body.includes('Socki') && !r.body.includes('Secret Idea'))
  assert.deepEqual([...r.attachments], [['Sam’s World/Socki’s Dirt Hole/Secret Idea/diagram.png', 'Media/diagram.png']])
})
test('fix8: content-path collision fails closed with a warning', () => {
  const owners = new Map()
  const res = buildResolver([], ['Media/a.png', 'Other/a.png'])
  const r = rewriteLinks('![[Media/a.png]] ![[Other/a.png]] [l](Other/a.png)', { from: 'n.md', resolve: res, published, attachmentOwners: owners })
  assert.equal(r.body, '![[Media/a.png]]  l')
  assert.equal(r.attachments.size, 1)
  assert.ok(r.warnings.some((w) => w.includes('collision')))
  // shared owners across notes
  const r2 = rewriteLinks('![[Other/a.png]]', { from: 'm.md', resolve: res, published, attachmentOwners: owners })
  assert.equal(r2.body, '')
})
test('minor: trailing backslash in wikilink target dropped', () => {
  const o = out('[[Dailys/2026/secret-diary\\]]')
  noLeak(o)
  assert.equal(o, 'secret-diary')
})
