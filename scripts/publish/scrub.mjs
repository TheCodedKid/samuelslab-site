import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const run = promisify(execFile)
const EXIF_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.heic', '.tiff', '.pdf'])
const STEP_EXT = new Set(['.step', '.stp'])
const BLANK_FILE_NAME = "FILE_NAME('','',(''),(''),'','','')"

/** Replace the FILE_NAME(...) header record (may span lines, ends at `);`), leaving the rest intact. */
export function scrubStepText(text) {
  return text.replace(/FILE_NAME\s*\([\s\S]*?\)\s*;/, `${BLANK_FILE_NAME};`)
}

/** Strip metadata in place on a copied attachment. Throws (fail closed) on failure. */
export async function scrubAttachment(absPath) {
  const ext = path.extname(absPath).toLowerCase()
  if (EXIF_EXT.has(ext)) {
    try {
      await run('exiftool', ['-all=', '-overwrite_original', absPath])
    } catch (err) {
      throw new Error(`scrubAttachment: exiftool failed for ${absPath}: ${err.stderr || err.message}`)
    }
  } else if (STEP_EXT.has(ext)) {
    const buf = await readFile(absPath)
    const text = buf.toString('latin1')
    if (!/FILE_NAME\s*\(/.test(text)) return
    await writeFile(absPath, Buffer.from(scrubStepText(text), 'latin1'))
  }
}
