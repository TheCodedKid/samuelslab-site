import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, copyFile, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scrubAttachment } from '../scrub.mjs'

const run = promisify(execFile)
const media = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'vault', 'Media')
const tmp = () => mkdtemp(path.join(tmpdir(), 'scrub-'))

// Minimal valid 1x1 JPEG.
const JPEG_B64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDi6KKK+ZP3E//Z'

test('JPEG GPS tag is removed', async () => {
  const f = path.join(await tmp(), 'p.jpg')
  await writeFile(f, Buffer.from(JPEG_B64, 'base64'))
  await run('exiftool', ['-GPSLatitude=1', '-GPSLatitudeRef=N', '-Artist=Sam', '-overwrite_original', f])
  assert.match((await run('exiftool', ['-GPSLatitude', f])).stdout, /GPS Latitude/)
  await scrubAttachment(f)
  assert.equal((await run('exiftool', ['-GPSLatitude', '-Artist', f])).stdout.trim(), '')
})

test('PNG and PDF copies are scrubbed without touching fixtures', async () => {
  const d = await tmp()
  for (const name of ['pic.png', 'doc.pdf']) {
    const f = path.join(d, name)
    await copyFile(path.join(media, name), f)
    await run('exiftool', ['-Author=Sam Secret', '-overwrite_original', f]).catch(() => {})
    await scrubAttachment(f)
    assert.ok(!(await run('exiftool', ['-Author', f])).stdout.includes('Sam Secret'))
  }
})

test('STEP FILE_NAME header is blanked, rest preserved byte-for-byte', async () => {
  const f = path.join(await tmp(), 'a.step')
  const before = "ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('x'),'2;1');\nFILE_NAME('x.step','2026',('Samuel'),\n('Org'),'pp','SolidWorks','');\nFILE_SCHEMA(('AP214'));\nENDSEC;\nDATA;\n#1=POINT('Samuel',(0.,0.,0.));\nENDSEC;\nEND-ISO-10303-21;\n"
  await writeFile(f, before)
  await scrubAttachment(f)
  const after = await readFile(f, 'utf8')
  for (const s of ['Samuel\'),', 'Org', 'SolidWorks', 'x.step']) assert.ok(!after.slice(0, after.indexOf('DATA;')).includes(s), s)
  assert.ok(after.includes("FILE_NAME('','',(''),(''),'','','');"))
  assert.ok(after.includes("FILE_DESCRIPTION(('x'),'2;1');\n"))
  assert.ok(after.endsWith("ENDSEC;\nDATA;\n#1=POINT('Samuel',(0.,0.,0.));\nENDSEC;\nEND-ISO-10303-21;\n"))
})

test('other types untouched; exiftool failure throws naming the file', async () => {
  const d = await tmp()
  const t = path.join(d, 'n.txt')
  await writeFile(t, 'hi')
  await scrubAttachment(t)
  assert.equal(await readFile(t, 'utf8'), 'hi')
  const bad = path.join(d, 'broken.png')
  await writeFile(bad, 'not an image')
  await assert.rejects(scrubAttachment(bad), /broken\.png/)
  await assert.rejects(scrubAttachment(path.join(d, 'missing.jpg')), /missing\.jpg/)
})
