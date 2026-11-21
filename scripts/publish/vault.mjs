import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const EXCLUDED = ['.obsidian', '.trash', '.git', '.claude', 'Templates', 'docs']

export function isPublished(data) {
  return data?.publish === true
}

export function scanVault(vaultRoot) {
  const notes = new Map()
  const files = []
  const filesAbs = new Map()
  const entries = fs.readdirSync(vaultRoot, { recursive: true, withFileTypes: true })
  for (const e of entries) {
    if (!e.isFile()) continue
    const abs = path.join(e.parentPath ?? e.path, e.name)
    const rel = path.relative(vaultRoot, abs).split(path.sep).join('/').normalize('NFC')
    if (EXCLUDED.includes(rel.split('/')[0])) continue
    if (rel.endsWith('.md')) {
      const raw = fs.readFileSync(abs, 'utf8')
      let parsed
      try {
        // passing an options object disables gray-matter's input-string cache
        parsed = matter(raw, {})
      } catch (err) {
        throw new Error(`Failed to parse frontmatter in ${rel}: ${err.message}`, { cause: err })
      }
      notes.set(rel, { data: parsed.data, body: parsed.content, raw, abs })
    } else {
      files.push(rel)
      filesAbs.set(rel, abs)
    }
  }
  return { notes, files, filesAbs }
}
