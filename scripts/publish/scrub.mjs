import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile, rename, rm, access } from 'node:fs/promises'
import path from 'node:path'

const run = promisify(execFile)
const EXIF_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.heic', '.tiff', '.pdf'])
const STEP_EXT = new Set(['.step', '.stp'])
const BLANK_FILE_NAME = "FILE_NAME('','',(''),(''),'','','')"

/** Replace the FILE_NAME(...) header record, leaving the rest intact. Quote-aware: `''` escapes a quote. */
export function scrubStepText(text) {
  const m = /FILE_NAME\s*\(/.exec(text)
  if (!m) return text
  let i = m.index + m[0].length
  let depth = 1
  let inStr = false
  for (; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (c === "'") inStr = false // a doubled '' re-opens on the next char
    } else if (c === "'") inStr = true
    else if (c === '(') depth++
    else if (c === ')' && --depth === 0) break
  }
  if (depth !== 0) return text
  let end = i + 1
  while (/\s/.test(text[end] ?? '')) end++
  if (text[end] !== ';') return text
  return text.slice(0, m.index) + BLANK_FILE_NAME + ';' + text.slice(end + 1)
}

async function scrubPdf(absPath) {
  await run('exiftool', ['-all:all=', '-overwrite_original', absPath])
  // exiftool edits PDFs incrementally; rewrite with qpdf so old revisions are dropped.
  const tmp = `${absPath}.qpdf.tmp`
  try {
    try {
      await run('qpdf', ['--object-streams=generate', absPath, tmp])
    } catch (err) {
      if (err.code !== 3) throw err // 3 = warnings only
      await access(tmp)
    }
    await rename(tmp, absPath)
  } finally {
    await rm(tmp, { force: true })
  }
}

/** Strip metadata in place on a copied attachment. Throws (fail closed) on failure. */
export async function scrubAttachment(absPath) {
  const ext = path.extname(absPath).toLowerCase()
  if (EXIF_EXT.has(ext)) {
    try {
      if (ext === '.pdf') await scrubPdf(absPath)
      else await run('exiftool', ['-all=', '-overwrite_original', absPath])
    } catch (err) {
      throw new Error(`scrubAttachment: scrub failed for ${absPath}: ${err.stderr || err.message}`)
    }
  } else if (STEP_EXT.has(ext)) {
    const buf = await readFile(absPath)
    const text = buf.toString('latin1')
    if (!/FILE_NAME\s*\(/.test(text)) return
    await writeFile(absPath, Buffer.from(scrubStepText(text), 'latin1'))
  }
}
