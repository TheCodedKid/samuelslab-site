import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { sync, leakGuard } from '../sync.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixture = path.join(here, 'fixtures', 'vault')
const cli = path.join(here, '..', 'sync.mjs')
const LAB = path.join('Sam’s World', 'Samuel’s Lab')

const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), `sync-${p}-`))

/** Copy the fixture vault to a temp dir and add a published gallery note. */
function makeVault(extra = {}) {
  const v = tmp('vault')
  fs.cpSync(fixture, v, { recursive: true })
  const notes = {
    [path.join(LAB, 'Projects', 'Gallery.md')]:
      '---\npublish: true\n---\n# Gallery\n\n![[pic.png]]\n\nSee [[secret-diary]] and [[Parts List (V2)]].\n',
    ...extra,
  }
  for (const [rel, text] of Object.entries(notes)) {
    fs.mkdirSync(path.dirname(path.join(v, rel)), { recursive: true })
    fs.writeFileSync(path.join(v, rel), text)
  }
  return v
}

function makeOut() {
  const o = tmp('out')
  fs.writeFileSync(path.join(o, '.gitkeep'), '')
  return o
}

function listFiles(dir) {
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.relative(dir, path.join(e.parentPath, e.name)).split(path.sep).join('/').normalize('NFC'))
    .sort()
}

const quiet = async (fn) => {
  const orig = console.error
  console.error = () => {}
  try {
    return await fn()
  } finally {
    console.error = orig
  }
}

test('sync writes published notes and referenced attachments only', async () => {
  const vault = makeVault()
  const out = makeOut()
  fs.writeFileSync(path.join(out, 'stale.md'), 'old')
  fs.mkdirSync(path.join(out, 'old-dir'))
  fs.writeFileSync(path.join(out, 'old-dir', 'x.md'), 'old')
  const res = await quiet(() => sync({ vault, out }))
  const files = listFiles(out)
  for (const f of [
    'index.md',
    'Projects/Server Build/Parts List (V1)/CPU.md',
    'Projects/Server Build/Parts List (V2)/CPU.md',
    'Projects/Server Build/Parts List (V2)/Parts List (V2).md',
    'Projects/Headphones/Koss/Porta Pro & KPH40.md',
    'Projects/Gallery.md',
    'Media/pic.png',
    '.gitkeep',
  ])
    assert.ok(files.includes(f), `missing ${f}: ${files}`)
  assert.ok(!files.includes('stale.md'))
  assert.ok(!files.some((f) => f.startsWith('old-dir')))
  assert.ok(!files.some((f) => f.includes('Templates') || f === 't.md'), 'Templates decoy published')
  assert.ok(!files.some((f) => f.includes('Dailys')))
  assert.ok(!files.includes('Media/doc.pdf'))
  assert.ok(!files.includes('Media/part.step'))
  assert.ok(!files.some((f) => f.includes('diagram')))
  assert.ok(res.notes.includes('index.md'))
  assert.deepEqual(res.attachments, ['Media/pic.png'])
  assert.ok(res.linksRewritten >= 3)
  assert.deepEqual(res.warnings, [])
  // Template body never reached the output
  for (const f of files) assert.ok(!fs.readFileSync(path.join(out, f), 'utf8').includes('Template body'), f)
})

test('home note gets title and aliases; frontmatter preserved', async () => {
  const vault = makeVault({
    [path.join(LAB, 'Samuel’s Lab.md')]: '---\npublish: true\naliases: [Home, Samuel’s Lab]\ntags: [lab]\n---\n# Hi\n',
  })
  const out = makeOut()
  await quiet(() => sync({ vault, out }))
  const home = matter(fs.readFileSync(path.join(out, 'index.md'), 'utf8'))
  assert.equal(home.data.title, 'Samuel’s Lab')
  assert.deepEqual(home.data.aliases, ['Home', 'Samuel’s Lab'])
  assert.deepEqual(home.data.tags, ['lab'])
  assert.equal(home.data.publish, true)
  assert.ok(home.content.includes('# Hi'))
  const cpu = matter(fs.readFileSync(path.join(out, 'Projects/Server Build/Parts List (V2)/CPU.md'), 'utf8'))
  assert.equal(cpu.data.title, undefined)
})

test('output contains no private names or paths', async () => {
  const vault = makeVault()
  const out = makeOut()
  await quiet(() => sync({ vault, out }))
  for (const f of listFiles(out)) {
    const text = fs.readFileSync(path.join(out, f)).toString('latin1') + fs.readFileSync(path.join(out, f), 'utf8')
    for (const bad of ['SECRET-DIARY-MARKER', 'secret-diary/', 'Dailys', 'Sam’s World', 'Private Thing'])
      assert.ok(!text.includes(bad), `${f} contains ${bad}`)
  }
  const gallery = fs.readFileSync(path.join(out, 'Projects/Gallery.md'), 'utf8')
  assert.ok(gallery.includes('See secret-diary and'), gallery)
  assert.ok(gallery.includes('![[Media/pic.png]]'), gallery)
})

test('unpublishing a note removes it on the next run', async () => {
  const vault = makeVault()
  const out = makeOut()
  await quiet(() => sync({ vault, out }))
  const cpu = 'Projects/Server Build/Parts List (V1)/CPU.md'
  assert.ok(fs.existsSync(path.join(out, cpu)))
  const src = path.join(vault, LAB, 'Projects', 'Server Build', 'Parts List (V1)', 'CPU.md')
  fs.writeFileSync(src, fs.readFileSync(src, 'utf8').replace('publish: true\n', ''))
  const res = await quiet(() => sync({ vault, out }))
  assert.ok(!fs.existsSync(path.join(out, cpu)))
  assert.ok(!res.notes.includes(cpu))
  assert.ok(fs.existsSync(path.join(out, '.gitkeep')))
})

test('missing attachment embed: one warning, CLI exits 0, warning on stderr only', async () => {
  const vault = makeVault({
    [path.join(LAB, 'Broken.md')]: '---\npublish: true\n---\nBefore ![[nope.png]] after\n',
  })
  const out = makeOut()
  const res = await quiet(() => sync({ vault, out }))
  assert.equal(res.warnings.length, 1)
  assert.match(res.warnings[0], /nope\.png/)
  const body = fs.readFileSync(path.join(out, 'Broken.md'), 'utf8')
  assert.ok(!body.includes('nope.png'))

  const r = spawnSync(process.execPath, [cli, '--vault', vault, '--out', out], { encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  const summary = JSON.parse(r.stdout)
  assert.ok(summary.notes.includes('Broken.md'))
  assert.equal(summary.warningCount, 1)
  assert.ok(!r.stdout.includes('nope.png'))
  assert.match(r.stderr, /nope\.png/)
})

test('leak guard: private path inside a code block fails the sync', async () => {
  const vault = makeVault({
    [path.join(LAB, 'Leaky.md')]: '---\npublish: true\n---\n```\n[[Dailys/2026/secret-diary]]\n```\n',
  })
  const out = makeOut()
  const errs = []
  const orig = console.error
  console.error = (...a) => errs.push(a.join(' '))
  try {
    await assert.rejects(() => sync({ vault, out }), /leak/i)
  } finally {
    console.error = orig
  }
  assert.ok(errs.some((e) => e.includes('Leaky.md: ') && /dailys\/2026\/secret-diary/i.test(e)), errs.join('\n'))
  assert.ok(fs.existsSync(path.join(out, 'Leaky.md')), 'out left in place for inspection')

  const r = spawnSync(process.execPath, [cli, '--vault', vault, '--out', out], { encoding: 'utf8' })
  assert.notEqual(r.status, 0)
  assert.equal(r.stdout, '')
})

test('leakGuard unit: forms, case, encodings, folders, binary skipped', () => {
  const out = tmp('lg')
  fs.mkdirSync(path.join(out, 'a'))
  fs.writeFileSync(path.join(out, 'a', 'one.md'), 'x DAILYS/2026/Secret-Diary.MD y')
  fs.writeFileSync(path.join(out, 'two.md'), 'link Dailys/2026/secret%20diary%202 here')
  fs.writeFileSync(path.join(out, 'three.txt'), 'in Sam%E2%80%99s%20World/Socki%E2%80%99s%20Dirt%20Hole')
  fs.writeFileSync(path.join(out, 'bin.png'), Buffer.from([0, 1, 2, ...Buffer.from('Dailys/2026/secret-diary')]))
  fs.writeFileSync(path.join(out, 'clean.md'), 'secret-diary alone is fine; Dailys too')
  const hits = leakGuard(out, {
    unpublishedPaths: ['Dailys/2026/secret-diary.md', 'Dailys/2026/secret diary 2.md'],
    privateFolders: ['Sam’s World/Socki’s Dirt Hole'],
  })
  assert.equal(hits.length, 3, hits.join('\n'))
  assert.ok(hits.some((h) => h.startsWith('a/one.md: ')))
  assert.ok(hits.some((h) => h.startsWith('two.md: ')))
  assert.ok(hits.some((h) => h.startsWith('three.txt: ')))
})

test('normal fixture sync has no leak-guard hits', async () => {
  const out = makeOut()
  const res = await quiet(() => sync({ vault: fixture, out }))
  assert.ok(res.notes.includes('index.md'))
  assert.ok(!listFiles(out).some((f) => f.includes('Templates')))
})

test('refuses dangerous out dirs', async () => {
  const vault = makeVault()
  await assert.rejects(() => sync({ vault, out: '/' }), /refus/i)
  await assert.rejects(() => sync({ vault, out: vault }), /refus/i)
  await assert.rejects(() => sync({ vault, out: path.join(vault, 'Media') }), /refus/i)
  await assert.rejects(() => sync({ vault, out: path.dirname(vault) }), /refus/i)
  assert.ok(fs.existsSync(path.join(vault, 'Media', 'pic.png')))
})

test('fixture vault is not mutated', () => {
  const out = execFileSync('git', ['status', '--porcelain', '--', fixture], { encoding: 'utf8' })
  assert.equal(out, '')
})

test('frontmatter wikilinks are rewritten like body links', async () => {
  const vault = makeVault({
    [path.join(LAB, 'Front.md')]:
      '---\npublish: true\nup: "[[Private Thing]]"\nrelated: ["[[Private Thing]]", "[[secret-diary]]", "[[Porta Pro & KPH40]]"]\nnested:\n  deep: "[[Private Thing#Heading]]"\ncover: "![[pic.png]]"\ntitle: "[[Keep Title]]"\n---\nBody\n',
  })
  const out = makeOut()
  const res = await quiet(() => sync({ vault, out }))
  const raw = fs.readFileSync(path.join(out, 'Front.md'), 'utf8')
  assert.ok(!raw.includes('[[Private Thing'), raw)
  assert.ok(!raw.includes('[[secret-diary'), raw)
  const fm = matter(raw).data
  assert.equal(fm.up, 'Private Thing')
  assert.equal(fm.related[0], 'Private Thing')
  assert.equal(fm.related[1], 'secret-diary')
  assert.equal(fm.related[2], '[[Projects/Headphones/Koss/Porta Pro & KPH40|Porta Pro & KPH40]]')
  assert.equal(fm.nested.deep, 'Private Thing > Heading')
  assert.equal(fm.cover, '![[Media/pic.png]]')
  assert.equal(fm.title, 'Keep Title')
  assert.ok(res.attachments.includes('Media/pic.png'))
  assert.ok(fs.existsSync(path.join(out, 'Media/pic.png')))
})

test('refuses not-yet-existing out under a symlink into the vault', async () => {
  const vault = makeVault()
  const link = path.join(tmp('lnk'), 'L')
  fs.symlinkSync(vault, link)
  await assert.rejects(() => sync({ vault, out: path.join(link, 'newdir', 'sub') }), /refus/i)
  assert.ok(!fs.existsSync(path.join(vault, 'newdir')))
})

test('a failed scrub wipes out back to .gitkeep', async () => {
  const vault = makeVault({
    [path.join(LAB, 'Doc.md')]: '---\npublish: true\n---\n![[broken.pdf]]\n',
  })
  fs.writeFileSync(path.join(vault, 'Media', 'broken.pdf'), 'this is not a pdf at all\n')
  const out = makeOut()
  await assert.rejects(() => quiet(() => sync({ vault, out })), /scrub/i)
  assert.deepEqual(fs.readdirSync(out), ['.gitkeep'])
})

test('frontmatter: aliases, tags, title and object keys are rewritten too', async () => {
  const vault = makeVault({
    [path.join(LAB, 'Keys.md')]:
      '---\npublish: true\ntitle: "[[Private Thing]]"\naliases: ["[[Private Thing]]", plain]\ntags: ["[[secret-diary]]"]\nmap:\n  "[[Private Thing]]": x\n  "[[Porta Pro & KPH40]]": y\n---\nBody\n',
    [path.join(LAB, 'Samuel’s Lab.md')]: '---\npublish: true\naliases: ["[[Private Thing]]"]\n---\n# Hi\n',
  })
  const out = makeOut()
  await quiet(() => sync({ vault, out }))
  const raw = fs.readFileSync(path.join(out, 'Keys.md'), 'utf8')
  assert.ok(!raw.includes('[[Private Thing'), raw)
  assert.ok(!raw.includes('[[secret-diary'), raw)
  const fm = matter(raw).data
  assert.equal(fm.title, 'Private Thing')
  assert.deepEqual(fm.aliases, ['Private Thing', 'plain'])
  assert.deepEqual(fm.tags, ['secret-diary'])
  assert.deepEqual(Object.keys(fm.map), ['Private Thing', '[[Projects/Headphones/Koss/Porta Pro & KPH40|Porta Pro & KPH40]]'])
  assert.equal(fm.map['Private Thing'], 'x')
  const home = matter(fs.readFileSync(path.join(out, 'index.md'), 'utf8')).data
  assert.equal(home.title, 'Samuel’s Lab')
  assert.deepEqual(home.aliases, ['Private Thing', 'Samuel’s Lab'])
})

test('refuses a dangling symlink out pointing into the vault', async () => {
  const vault = makeVault()
  const link = path.join(tmp('dangle'), 'L')
  fs.symlinkSync(path.join(vault, 'newdir'), link)
  await assert.rejects(() => sync({ vault, out: link }), /refus/i)
  assert.ok(!fs.existsSync(path.join(vault, 'newdir')))
})

test('no published home note fails closed and wipes out back to .gitkeep', async () => {
  const vault = makeVault({
    [path.join(LAB, 'Samuel’s Lab.md')]: '---\npublish: false\n---\n# Hi\n',
  })
  const out = makeOut()
  fs.writeFileSync(path.join(out, 'stale.md'), 'old')
  await assert.rejects(
    () => quiet(() => sync({ vault, out })),
    /no home note: Sam’s World\/Samuel’s Lab\/Samuel’s Lab\.md is not marked publish: true/,
  )
  assert.deepEqual(fs.readdirSync(out), ['.gitkeep'])
})

test('leak guard: top-level unpublished note is not matched by its bare name', async () => {
  const vault = makeVault({
    'Readme.md': '# private readme\n',
    [path.join(LAB, 'Projects', 'Prose.md')]: '---\npublish: true\n---\nPlease see the readme for details.\n',
  })
  const out = makeOut()
  const res = await quiet(() => sync({ vault, out }))
  assert.ok(res.notes.length > 0)
})

test('leak guard: top-level unpublished note is matched by its .md name', async () => {
  const vault = makeVault({
    'Readme.md': '# private readme\n',
    [path.join(LAB, 'Projects', 'Named.md')]: '---\npublish: true\n---\n```\nsee Readme.md\n```\n',
  })
  const out = makeOut()
  const errs = []
  const orig = console.error
  console.error = (...a) => errs.push(a.join(' '))
  try {
    await assert.rejects(() => sync({ vault, out }), /leak/i)
  } finally {
    console.error = orig
  }
  assert.ok(errs.some((e) => /Named\.md: readme\.md/i.test(e)), errs.join('\n'))
})
