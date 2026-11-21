import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { tagFolder, tagFolderDetailed } from '../tag-folder.mjs'

const F = 'Sam’s World/Samuel’s Lab'
function mk(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tag-'))
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(root, F, rel)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, content)
  }
  return root
}
const rd = (root, rel) => fs.readFileSync(path.join(root, F, rel), 'utf8')

test('no frontmatter gains block, body identical', () => {
  const root = mk({ 'a.md': '# Hi\n\nbody\n' })
  const out = tagFolder(root, F, { dryRun: false })
  assert.deepEqual(out, [`${F}/a.md`])
  assert.equal(rd(root, 'a.md'), '---\npublish: true\n---\n# Hi\n\nbody\n')
})
test('frontmatter keeps tags and gains publish first', () => {
  const root = mk({ 'b.md': '---\ntags: [a]\n---\nx\n' })
  tagFolder(root, F, { dryRun: false })
  assert.equal(rd(root, 'b.md'), '---\npublish: true\ntags: [a]\n---\nx\n')
})
test('publish false / true untouched and unlisted', () => {
  const f = '---\npublish: false\n---\nx\n'
  const t = '---\ntitle: x\npublish: true\n---\nx\n'
  const root = mk({ 'c.md': f, 'd.md': t })
  assert.deepEqual(tagFolder(root, F, { dryRun: false }), [])
  assert.equal(rd(root, 'c.md'), f)
  assert.equal(rd(root, 'd.md'), t)
})
test('dry run writes nothing but lists', () => {
  const root = mk({ 'a.md': 'x\n', 'b.md': '---\nk: 1\n---\n' })
  const out = tagFolder(root, F, { dryRun: true })
  assert.equal(out.length, 2)
  assert.equal(rd(root, 'a.md'), 'x\n')
  assert.equal(rd(root, 'b.md'), '---\nk: 1\n---\n')
})
test('CRLF and BOM preserved', () => {
  const root = mk({ 'a.md': '﻿---\r\nk: 1\r\n---\r\nbody\r\n', 'b.md': 'hi\r\nthere\r\n' })
  tagFolder(root, F, { dryRun: false })
  assert.equal(rd(root, 'a.md'), '﻿---\r\npublish: true\r\nk: 1\r\n---\r\nbody\r\n')
  assert.equal(rd(root, 'b.md'), '---\r\npublish: true\r\n---\r\nhi\r\nthere\r\n')
})
test('nested publish key is not top-level; unclosed frontmatter skipped', () => {
  const root = mk({
    'n.md': '---\nmeta:\n  publish: false\n---\nx\n',
    'u.md': '---\nk: 1\nno close\n',
  })
  const r = tagFolderDetailed(root, F, { dryRun: false })
  assert.deepEqual(r.changed, [`${F}/n.md`])
  assert.equal(rd(root, 'n.md'), '---\npublish: true\nmeta:\n  publish: false\n---\nx\n')
  assert.equal(r.skipped.length, 1)
  assert.equal(r.skipped[0].path, `${F}/u.md`)
  assert.equal(rd(root, 'u.md'), '---\nk: 1\nno close\n')
})
test('recurses into subfolders, ignores non-md', () => {
  const root = mk({ 'sub/deep/a.md': 'x', 'img.png': 'x' })
  assert.deepEqual(tagFolder(root, F, { dryRun: true }), [`${F}/sub/deep/a.md`])
})
