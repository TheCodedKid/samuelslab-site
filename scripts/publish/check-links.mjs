#!/usr/bin/env node
// Check every internal href/src in a built Quartz site resolves to a file.
// Usage: node scripts/publish/check-links.mjs <publicDir>
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SKIP = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i // http(s):, mailto:, data:, //host, #anchor ...
const ATTR = /\s(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi
const TAG =
  /<[a-zA-Z][\w-]*(?:\s+[^\s"'>=/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*\s*\/?>/g

const decodeEntities = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))

function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (e.name.endsWith('.html')) out.push(p)
  }
  return out
}

const isFile = (p) => fs.statSync(p, { throwIfNoEntry: false })?.isFile() ?? false

function exists(root, target, dirOnly) {
  const rel = path.relative(root, target)
  if (rel.startsWith('..')) return false
  // GitHub Pages 404s `X/` when only X.html exists, so a trailing slash needs X/index.html.
  if (dirOnly) return isFile(path.join(target, 'index.html'))
  return isFile(target) || isFile(target + '.html') || isFile(path.join(target, 'index.html'))
}

export function checkLinks(publicDir) {
  const root = path.resolve(publicDir)
  const broken = []
  const files = fs.statSync(root, { throwIfNoEntry: false })?.isDirectory() ? walk(root) : []
  for (const file of files) {
    const page = path.relative(root, file)
    // Only real markup: drop comments, script/style bodies, and code/pre text.
    const html = fs
      .readFileSync(file, 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(script|style|pre|code)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, (m) => m.match(/^<[^>]*>/)[0])
    for (const [tag] of html.matchAll(TAG)) {
      const cls = /\sclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(tag)
      const classes = (cls?.[1] ?? cls?.[2] ?? cls?.[3] ?? '').split(/\s+/)
      let reportedBroken = false
      for (const m of tag.matchAll(ATTR)) {
        const href = decodeEntities(m[1] ?? m[2] ?? m[3] ?? '')
        if (classes.includes('broken') && /^a\b/i.test(tag.slice(1)) && !reportedBroken) {
          broken.push({ page, href })
          reportedBroken = true
          continue
        }
        if (href === '' || SKIP.test(href)) continue
        let p = href.replace(/[?#].*$/, '')
        if (p === '') continue
        const dirOnly = p.endsWith('/')
        try {
          p = decodeURIComponent(p)
        } catch {
          // keep the raw path
        }
        const target = p.startsWith('/')
          ? path.join(root, p)
          : path.resolve(path.dirname(file), p)
        if (!exists(root, target, dirOnly)) broken.push({ page, href })
      }
      if (!reportedBroken && classes.includes('broken') && /^<a\b/i.test(tag)) {
        broken.push({ page, href: '' })
      }
    }
  }
  return { broken, pages: files.length }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const dir = process.argv[2]
  if (!dir) {
    console.error('usage: check-links.mjs <publicDir>')
    process.exit(2)
  }
  const { broken, pages } = checkLinks(dir)
  if (pages === 0) {
    console.error(`check-links: no .html pages found in ${dir}; wrong or empty publicDir`)
    process.exit(1)
  }
  for (const b of broken) console.log(`${b.page}: ${b.href}`)
  if (broken.length) {
    console.error(`${broken.length} broken link(s)`)
    process.exit(1)
  }
  console.log(`all internal links resolve (${pages} pages scanned)`)
}
