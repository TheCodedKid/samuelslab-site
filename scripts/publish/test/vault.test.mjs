import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanVault, isPublished } from '../vault.mjs'

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'vault')
const HOME = 'Sam’s World/Samuel’s Lab/Samuel’s Lab.md'

test('scanVault finds notes with parsed frontmatter', () => {
  const { notes } = scanVault(fixture)
  assert.ok(notes.has(HOME))
  const n = notes.get(HOME)
  assert.equal(n.data.publish, true)
  assert.ok(n.body.includes('Welcome to the lab'))
  assert.ok(n.raw.startsWith('---'))
  assert.ok(notes.has('Notes/Private Thing.md'))
  assert.ok(notes.has('Dailys/2026/secret-diary.md'))
})
test('scanVault excludes Templates, .obsidian', () => {
  const { notes, files } = scanVault(fixture)
  for (const p of [...notes.keys(), ...files]) {
    assert.ok(!p.startsWith('Templates/'), p)
    assert.ok(!p.startsWith('.obsidian/'), p)
  }
})
test('scanVault lists non-md files', () => {
  const { files } = scanVault(fixture)
  assert.deepEqual(
    files.filter((f) => f.startsWith('Media/')).sort(),
    ['Media/doc.pdf', 'Media/part.step', 'Media/pic.png'],
  )
  assert.ok(!files.some((f) => f.endsWith('.md')))
})
test('isPublished is strict boolean true', () => {
  assert.equal(isPublished({ publish: true }), true)
  assert.equal(isPublished({ publish: 'true' }), false)
  assert.equal(isPublished({}), false)
})

import fs from 'node:fs'
import os from 'node:os'

test('excluded top-level dirs are never scanned (temp vault)', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-'))
  try {
    for (const d of ['.obsidian', '.trash', '.claude', '.git', 'docs', 'Templates', 'Keep']) {
      fs.mkdirSync(path.join(root, d))
      fs.writeFileSync(path.join(root, d, 'x.md'), '---\npublish: true\n---\nbody\n')
      fs.writeFileSync(path.join(root, d, 'y.png'), 'x')
    }
    const { notes, files } = scanVault(root)
    assert.deepEqual([...notes.keys()], ['Keep/x.md'])
    assert.deepEqual(files, ['Keep/y.png'])
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
test('bad frontmatter throws with the vault-relative path', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-'))
  try {
    fs.writeFileSync(path.join(root, 'Bad.md'), '---\na: [unclosed\n---\nbody\n')
    assert.throws(() => scanVault(root), /Bad\.md/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
test('identical notes get distinct data objects', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-'))
  try {
    for (const n of ['A.md', 'B.md']) fs.writeFileSync(path.join(root, n), '---\npublish: true\n---\nsame\n')
    const { notes } = scanVault(root)
    const a = notes.get('A.md').data
    const b = notes.get('B.md').data
    assert.notEqual(a, b)
    a.mutated = 1
    assert.equal(b.mutated, undefined)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
test('abs / filesAbs point at real on-disk paths', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-'))
  try {
    const nfd = 'Café'
    fs.mkdirSync(path.join(root, nfd))
    fs.writeFileSync(path.join(root, nfd, 'n.md'), 'hi')
    fs.writeFileSync(path.join(root, nfd, 'p.png'), 'x')
    const { notes, files, filesAbs } = scanVault(root)
    const rel = 'Café/n.md'
    assert.ok(notes.has(rel))
    assert.ok(fs.existsSync(notes.get(rel).abs))
    assert.equal(notes.get(rel).abs, path.join(root, nfd, 'n.md'))
    assert.deepEqual(files, ['Café/p.png'])
    assert.equal(filesAbs.get('Café/p.png'), path.join(root, nfd, 'p.png'))
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
