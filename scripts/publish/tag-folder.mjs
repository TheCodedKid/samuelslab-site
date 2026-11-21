import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.isFile() && e.name.endsWith('.md')) out.push(p)
  }
  return out.sort()
}

// Returns { action: 'none'|'edit'|'skip', text?, reason? }. Text-level only.
function tagText(raw) {
  const bom = raw.startsWith('﻿') ? '﻿' : ''
  const s = raw.slice(bom.length)
  const crlf = (s.match(/\r\n/g) || []).length
  const lf = (s.match(/\n/g) || []).length - crlf
  const eol = crlf > lf ? '\r\n' : '\n'
  const open = /^---[ \t]*\r?\n/.exec(s)
  if (!open) {
    if (/^---[ \t]*$/.test(s)) return { action: 'skip', reason: 'lone --- with no closing line' }
    return { action: 'edit', text: `${bom}---${eol}publish: true${eol}---${eol}${s}` }
  }
  const lines = s.slice(open[0].length).split('\n')
  let closed = false
  for (const l of lines) {
    const line = l.replace(/\r$/, '')
    if (line === '---' || line === '...') { closed = true; break }
    if (/^publish[ \t]*:/.test(line)) return { action: 'none' }
  }
  if (!closed) return { action: 'skip', reason: 'frontmatter has no closing --- line' }
  const head = open[0]
  return {
    action: 'edit',
    text: `${bom}${head}publish: true${eol}${s.slice(head.length)}`,
  }
}

export function tagFolderDetailed(vaultRoot, folderVaultRel, { dryRun = false } = {}) {
  const changed = []
  const skipped = []
  for (const abs of walk(path.join(vaultRoot, folderVaultRel))) {
    const rel = path.relative(vaultRoot, abs).split(path.sep).join('/')
    const r = tagText(fs.readFileSync(abs, 'utf8'))
    if (r.action === 'skip') skipped.push({ path: rel, reason: r.reason })
    else if (r.action === 'edit') {
      if (!dryRun) fs.writeFileSync(abs, r.text)
      changed.push(rel)
    }
  }
  return { changed, skipped }
}

export function tagFolder(vaultRoot, folderVaultRel, opts = {}) {
  return tagFolderDetailed(vaultRoot, folderVaultRel, opts).changed
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2)
  const get = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined }
  const vault = get('--vault'), folder = get('--folder')
  if (!vault || !folder) {
    console.error('usage: tag-folder.mjs --vault <path> --folder <vault-rel> [--dry-run]')
    process.exit(2)
  }
  const { changed, skipped } = tagFolderDetailed(vault, folder, { dryRun: a.includes('--dry-run') })
  for (const c of changed) console.log(c)
  for (const s of skipped) console.error(`SKIPPED ${s.path}: ${s.reason}`)
}
