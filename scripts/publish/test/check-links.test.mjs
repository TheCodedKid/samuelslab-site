import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { checkLinks } from '../check-links.mjs'

function site(files) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'links-'))
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true })
    fs.writeFileSync(path.join(d, rel), text)
  }
  return d
}

test('reports only missing internal links', () => {
  const d = site({
    'index.html': `<a href="./ok">ok</a> <a href="./sub/">sub</a>
      <a href="./Parts%20%26%20Bits%20Sam%E2%80%99s">enc</a>
      <a href="./missing">m</a> <a href="#top">t</a> <a href="mailto:a@b.c">m</a>
      <a href="https://example.com/x">e</a> <a href="//cdn.x/y.js">c</a>
      <a href="./ok?x=1#frag">q</a> <link href="/index.css"><script src="./prescript.js"></script>
      <a href="data:text/plain,hi">d</a>
      <script>var a = '<a href="./inscript">'</script>
      <code>&lt;a href="./incode"&gt;</code><pre><a href="./inpre">x</a></pre>`,
    'ok.html': '',
    'sub/index.html': '',
    'index.css': '',
    'prescript.js': '',
    'Parts & Bits Sam’s.html': '',
  })
  const { broken } = checkLinks(d)
  assert.deepEqual(broken, [{ page: 'index.html', href: './missing' }])
})

test('resolves relative to page and root-absolute', () => {
  const d = site({
    'a/b.html': '<a href="../top">t</a><a href="/top">r</a><a href="./c">c</a><a href="../nope">n</a>',
    'top.html': '',
    'a/c/index.html': '',
  })
  assert.deepEqual(checkLinks(d).broken, [{ page: path.join('a', 'b.html'), href: '../nope' }])
})

test('reports anchors with a broken class', () => {
  const d = site({
    'index.html': '<a class="internal broken" href="./ok">x</a><a class="internal" href="./ok">y</a>',
    'ok.html': '',
  })
  const { broken } = checkLinks(d)
  assert.equal(broken.length, 1)
  assert.equal(broken[0].page, 'index.html')
})
