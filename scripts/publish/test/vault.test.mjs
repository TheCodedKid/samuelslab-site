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
