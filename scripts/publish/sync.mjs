#!/usr/bin/env node
// Sync published vault notes into the Quartz content dir.
// Usage: node scripts/publish/sync.mjs --vault <path> --out <dir>
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { scanVault, isPublished } from './vault.mjs'
import { toContentPath } from './paths.mjs'
import { buildResolver, rewriteLinks } from './links.mjs'
import { stripComments } from './strip.mjs'
import { scrubAttachment } from './scrub.mjs'

const HOME_TITLE = 'Samuel’s Lab'
const KEEP = '.gitkeep'
const nfc = (s) => s.normalize('NFC')
const toPosix = (p) => p.split(path.sep).join('/')

/** Absolute path with symlinks resolved, even when the tail does not exist yet. */
const realish = (p) => {
  let head = path.resolve(p)
  const tail = []
  for (;;) {
    try {
      return path.join(fs.realpathSync(head), ...tail)
    } catch {
      // A dangling symlink: follow its target instead of treating it as a missing name.
      const st = fs.lstatSync(head, { throwIfNoEntry: false })
      if (st?.isSymbolicLink()) {
        if (tail.length > 64) throw new Error(`sync: symlink loop at ${head}`)
        head = path.resolve(path.dirname(head), fs.readlinkSync(head))
        continue
      }
      const parent = path.dirname(head)
      if (parent === head) return path.resolve(p)
      tail.unshift(path.basename(head))
      head = parent
    }
  }
}
const isInside = (child, parent) => {
  const rel = path.relative(parent, child)
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

/** Throw unless `out` is a safe directory to wipe (not /, not the vault, not in or above it). */
function assertSafeOut(vault, out) {
  if (out === path.parse(out).root) throw new Error(`sync: refusing to use filesystem root as out: ${out}`)
  if (out === vault) throw new Error(`sync: refusing to use the vault root as out: ${out}`)
  if (isInside(out, vault)) throw new Error(`sync: refusing to use a directory inside the vault as out: ${out}`)
  if (isInside(vault, out)) throw new Error(`sync: refusing to use a directory containing the vault as out: ${out}`)
}

/** Every file and folder in the vault (including excluded dirs, but not .git internals). */
function walkVault(vault) {
  const files = []
  const dirs = []
  for (const e of fs.readdirSync(vault, { recursive: true, withFileTypes: true })) {
    const rel = nfc(toPosix(path.relative(vault, path.join(e.parentPath, e.name))))
    if (rel === '.git' || rel.startsWith('.git/')) continue
    if (e.isDirectory()) dirs.push(rel)
    else if (e.isFile()) files.push(rel)
  }
  return { files, dirs }
}

/**
 * Recursively rewrite link-bearing strings (values and object keys) in cloned frontmatter.
 * Only the top-level `publish` key is left untouched.
 */
function rewriteFrontmatter(data, rewrite) {
  const hasLink = (s) => s.includes('[[') || s.includes('](')
  const walk = (v, top = false) => {
    if (typeof v === 'string') return hasLink(v) ? rewrite(v) : v
    if (Array.isArray(v)) return v.map((x) => walk(x))
    if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
      const o = {}
      for (const [k, x] of Object.entries(v)) {
        const key = top && k === 'publish' ? k : hasLink(k) ? rewrite(k) : k
        const val = top && k === 'publish' ? x : walk(x)
        // defineProperty so a YAML key like `__proto__` stays an ordinary own key
        Object.defineProperty(o, key, { value: val, enumerable: true, writable: true, configurable: true })
      }
      return o
    }
    return v
  }
  return walk(data, true)
}

const encodeUrl = (s) => encodeURI(s).replace(/\(/g, '%28').replace(/\)/g, '%29')
const formsOf = (p) => {
  const n = nfc(p)
  return [...new Set([n, encodeURI(n), encodeUrl(n), n.replaceAll(' ', '%20')])]
}

const isBinary = (buf) => buf.subarray(0, 8192).includes(0)

/**
 * Scan every text file under `outDir` for private vault paths.
 * unpublishedPaths: vault-relative note paths (with .md); each is checked with and without `.md`.
 * privateFolders: vault-relative folder paths.
 * Returns hits as `<content file>: <matched string>` (at most one per file per private path).
 */
export function leakGuard(outDir, { unpublishedPaths = [], privateFolders = [] }) {
  const needles = [] // [forms (lowercase, longest first), ...]
  for (const p of unpublishedPaths) {
    const noExt = p.replace(/\.md$/i, '')
    needles.push([...formsOf(p), ...formsOf(noExt)])
  }
  for (const p of privateFolders) needles.push(formsOf(p))
  const prepared = needles.map((forms) =>
    [...new Set(forms)].sort((a, b) => b.length - a.length).map((f) => [f, f.toLowerCase()]),
  )

  const hits = []
  for (const e of fs.readdirSync(outDir, { recursive: true, withFileTypes: true })) {
    if (!e.isFile()) continue
    const abs = path.join(e.parentPath, e.name)
    const buf = fs.readFileSync(abs)
    if (!abs.endsWith('.md') && isBinary(buf)) continue
    const text = nfc(buf.toString('utf8')).toLowerCase()
    const rel = nfc(toPosix(path.relative(outDir, abs)))
    for (const forms of prepared) {
      const m = forms.find(([, lower]) => text.includes(lower))
      if (m) hits.push(`${rel}: ${m[0]}`)
    }
  }
  return hits
}

/** Sync published notes from `vault` into `out`. */
export async function sync({ vault, out }) {
  if (!vault || !out) throw new Error('sync: --vault and --out are required')
  const vaultAbs = realish(vault)
  const outAbs = realish(out)
  assertSafeOut(vaultAbs, outAbs)
  if (!fs.statSync(vaultAbs, { throwIfNoEntry: false })?.isDirectory())
    throw new Error(`sync: vault is not a directory: ${vaultAbs}`)

  const { notes, files, filesAbs } = scanVault(vaultAbs)
  const published = new Set([...notes].filter(([, n]) => isPublished(n.data)).map(([rel]) => rel))
  const resolve = buildResolver([...notes.keys()], files)

  // Plan everything before touching `out`.
  const attachmentOwners = new Map()
  const attachments = new Map() // vaultRel -> contentPath
  const outputs = new Map() // contentPath -> text
  const warnings = []
  let linksRewritten = 0
  for (const rel of [...published].sort()) {
    const note = notes.get(rel)
    const cp = toContentPath(rel)
    if (outputs.has(cp)) throw new Error(`sync: two published notes map to ${cp}`)
    const r = rewriteLinks(stripComments(note.body), { from: rel, resolve, published, attachmentOwners })
    linksRewritten += r.rewritten
    warnings.push(...r.warnings)
    for (const [a, acp] of r.attachments) attachments.set(a, acp)

    const data = rewriteFrontmatter(structuredClone(note.data), (v) => {
      const fr = rewriteLinks(v, { from: rel, resolve, published, attachmentOwners })
      linksRewritten += fr.rewritten
      warnings.push(...fr.warnings)
      for (const [a, acp] of fr.attachments) attachments.set(a, acp)
      return fr.body
    })
    if (cp === 'index.md') {
      data.title = HOME_TITLE
      const prev = data.aliases == null ? [] : Array.isArray(data.aliases) ? data.aliases : [data.aliases]
      data.aliases = [...new Set([...prev, HOME_TITLE])]
    }
    outputs.set(cp, matter.stringify(r.body, data))
  }
  for (const acp of attachments.values())
    if (outputs.has(acp)) throw new Error(`sync: attachment and note both map to ${acp}`)

  // Wipe `out`, keeping only .gitkeep.
  const wipe = () => {
    for (const name of fs.readdirSync(outAbs)) {
      if (name === KEEP) continue
      fs.rmSync(path.join(outAbs, name), { recursive: true, force: true })
    }
  }
  fs.mkdirSync(outAbs, { recursive: true })
  let hits
  try {
    wipe()
    for (const [cp, text] of outputs) {
      const dest = path.join(outAbs, cp)
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.writeFileSync(dest, text)
    }
    for (const [rel, cp] of attachments) {
      const src = filesAbs.get(rel)
      if (!src) throw new Error(`sync: attachment source missing for ${cp}`)
      const dest = path.join(outAbs, cp)
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.copyFileSync(src, dest)
      await scrubAttachment(dest)
    }

    // Leak guard (fail closed): every private note path / folder must be absent from `out`.
    const { files: allFiles, dirs } = walkVault(vaultAbs)
    const unpublishedPaths = allFiles.filter((f) => /\.md$/i.test(f) && !published.has(f))
    const pubDirs = new Set()
    for (const p of published) {
      const segs = p.split('/')
      for (let i = 1; i < segs.length; i++) pubDirs.add(segs.slice(0, i).join('/'))
    }
    const privateFolders = dirs.filter((d) => d.includes('/') && !pubDirs.has(d))
    hits = leakGuard(outAbs, { unpublishedPaths, privateFolders })
  } catch (err) {
    // Never leave a partial (possibly unscrubbed) output behind.
    try {
      wipe()
    } catch (wipeErr) {
      console.error(`sync: cleanup of ${outAbs} failed: ${wipeErr.message}`)
    }
    throw err
  }
  // A leak-guard failure deliberately leaves `out` in place for inspection.
  if (hits.length) {
    for (const h of hits) console.error(`LEAK ${h}`)
    const err = new Error(`sync: leak guard found ${hits.length} private path(s) in ${outAbs}; output left for inspection`)
    err.hits = hits
    throw err
  }

  return {
    notes: [...outputs.keys()].sort(),
    attachments: [...new Set(attachments.values())].sort(),
    linksRewritten,
    warnings,
  }
}

async function main() {
  const { values } = parseArgs({ options: { vault: { type: 'string' }, out: { type: 'string' } } })
  try {
    const res = await sync({ vault: values.vault, out: values.out })
    // Warnings may name vault paths: stderr only.
    for (const w of res.warnings) console.error(`warning: ${w}`)
    const { warnings, ...summary } = res
    console.log(JSON.stringify({ ...summary, warningCount: warnings.length }, null, 2))
  } catch (err) {
    console.error(err.message)
    process.exitCode = 1
  }
}

if (process.argv[1] && realish(process.argv[1]) === realish(fileURLToPath(import.meta.url))) await main()
