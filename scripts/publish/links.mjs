import { toContentPath, toSlugTarget } from './paths.mjs'

const nfc = (s) => s.normalize('NFC')
const stripMd = (s) => (/\.md$/i.test(s) ? s.slice(0, -3) : s)
const lastSeg = (s) => s.split('/').filter(Boolean).at(-1) ?? s
const dirOf = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '')
const isNote = (p) => /\.md$/i.test(p)
const isExternal = (u) => /^[a-z][a-z0-9+.-]*:/i.test(u) || u.startsWith('//') || u.startsWith('#')
const looksLikeAttachment = (name) => /\.[A-Za-z0-9]{1,8}$/.test(name) && !/\.md$/i.test(name)

function safeDecode(s) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}
const encodeUrl = (s) => encodeURI(s).replace(/\(/g, '%28').replace(/\)/g, '%29')

/** Join `rel` onto folder `dir`, collapsing `.`/`..`. Returns null if it climbs above the vault root. */
function joinRel(dir, rel) {
  const out = dir ? dir.split('/') : []
  for (const seg of rel.split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') {
      if (!out.length) return null
      out.pop()
    } else out.push(seg)
  }
  return out.join('/')
}

function commonPrefixLen(a, b) {
  const x = a ? a.split('/') : []
  const y = b ? b.split('/') : []
  let i = 0
  while (i < x.length && i < y.length && x[i] === y[i]) i++
  return i
}

/**
 * Build an Obsidian-style link resolver over the vault's note and file paths.
 * Order: exact vault path (with/without .md), path relative to the linking note's
 * folder, then unique basename / path suffix (ties broken by longest shared folder prefix).
 * Returns the canonical vault-relative path or null.
 */
export function buildResolver(notePaths, filePaths) {
  const all = [...notePaths, ...filePaths].map(nfc)
  const exactCase = new Map()
  const exactLower = new Map()
  const entries = [] // [lowerKey, canonical]
  const add = (key, canonical) => {
    if (!exactCase.has(key)) exactCase.set(key, canonical)
    const lk = key.toLowerCase()
    if (!exactLower.has(lk)) exactLower.set(lk, canonical)
    entries.push([lk, canonical])
  }
  for (const p of all) {
    add(p, p)
    if (isNote(p)) add(p.slice(0, -3), p)
  }
  const lookup = (k) => exactCase.get(k) ?? exactLower.get(k.toLowerCase()) ?? null

  return (target, fromVaultRel = '') => {
    let t = nfc(String(target)).trim()
    const hash = t.indexOf('#')
    if (hash !== -1) t = t.slice(0, hash).trim()
    if (!t) return null
    const from = nfc(fromVaultRel)
    const fromDir = dirOf(from)

    // 1. exact vault path
    const abs = t.startsWith('/') ? t.replace(/^\/+/, '') : t
    if (!abs.startsWith('./') && !abs.startsWith('../')) {
      const hit = lookup(abs)
      if (hit) return hit
    }

    // 2. relative to the linking note's folder
    const rel = joinRel(fromDir, t)
    if (rel) {
      const hit = lookup(rel)
      if (hit) return hit
    }

    // 3. unique basename / path suffix
    if (t.startsWith('./') || t.startsWith('../')) return null
    const lt = abs.toLowerCase()
    const cands = [...new Set(entries.filter(([k]) => k === lt || k.endsWith('/' + lt)).map(([, c]) => c))]
    if (cands.length === 1) return cands[0]
    if (cands.length === 0) return null
    let best = null
    let bestScore = -1
    let tie = false
    for (const c of cands) {
      const s = commonPrefixLen(dirOf(c), fromDir)
      if (s > bestScore) {
        best = c
        bestScore = s
        tie = false
      } else if (s === bestScore) tie = true
    }
    return tie ? null : best
  }
}

/** Split into [{code, text}] segments: fenced blocks first, then inline code spans. */
function splitCode(body) {
  const segs = []
  const push = (code, text) => {
    if (!text) return
    const last = segs.at(-1)
    if (last && last.code === code) last.text += text
    else segs.push({ code, text })
  }
  const lines = body.split(/(?<=\n)/)
  let fence = null
  let buf = ''
  for (const line of lines) {
    if (fence) {
      buf += line
      const m = line.match(/^[ \t>]*(`{3,}|~{3,})\s*$/)
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) {
        push(true, buf)
        buf = ''
        fence = null
      }
      continue
    }
    const open = line.match(/^[ \t>]*(`{3,}|~{3,})/)
    if (open && !(open[1][0] === '`' && line.slice(line.indexOf(open[1]) + open[1].length).includes('`'))) {
      splitInline(buf, push)
      buf = line
      fence = open[1]
      continue
    }
    buf += line
  }
  if (fence) push(true, buf)
  else splitInline(buf, push)
  return segs
}

function splitInline(text, push) {
  let i = 0
  let start = 0
  while (i < text.length) {
    if (text[i] !== '`') {
      i++
      continue
    }
    let n = 0
    while (text[i + n] === '`') n++
    // find a closing run of exactly n backticks, not crossing a blank line
    const re = /`+/g
    re.lastIndex = i + n
    let close = -1
    let m
    while ((m = re.exec(text))) {
      if (m[0].length === n) {
        close = m.index
        break
      }
    }
    if (close !== -1 && !/\n[ \t]*\n/.test(text.slice(i, close))) {
      push(false, text.slice(start, i))
      push(true, text.slice(i, close + n))
      i = close + n
      start = i
    } else i += n
  }
  push(false, text.slice(start))
}

const WIKI = String.raw`(!?)\[\[([^\[\]\n]*?)\]\]`
const MD =
  String.raw`(!?)\[((?:[^\[\]\n]|\[[^\[\]\n]*\])*)\]` +
  String.raw`\(\s*(<[^<>\n]*>|(?:[^()\s]|\([^()\s]*\))+)` +
  String.raw`(\s+(?:"[^"\n]*"|'[^'\n]*'|\([^()\n]*\)))?\s*\)`
const LINK_RE = new RegExp(`${WIKI}|${MD}`, 'g')

/**
 * Rewrite wikilinks and Markdown links in `body` so that only published notes stay linked.
 * ctx: { from: vault-relative path of the note, resolve: buildResolver(...), published: Set<vaultRel> }
 */
export function rewriteLinks(body, ctx) {
  const { from, resolve, published } = ctx
  const attachments = new Set()
  const warnings = []
  let rewritten = 0

  const wiki = (whole, bang, inner) => {
    let target = inner
    let alias = null
    let sep = '|'
    const p = inner.indexOf('|')
    if (p !== -1) {
      if (p > 0 && inner[p - 1] === '\\') {
        sep = '\\|'
        target = inner.slice(0, p - 1)
      } else target = inner.slice(0, p)
      alias = inner.slice(p + 1)
    }
    target = nfc(target).trim()
    const h = target.indexOf('#')
    const pathPart = (h === -1 ? target : target.slice(0, h)).trim()
    const frag = h === -1 ? '' : target.slice(h)
    if (!pathPart) return whole // same-note heading link: no other note's name involved

    const seg = lastSeg(pathPart)
    const name = stripMd(seg)
    const heads = frag.split('#').filter(Boolean)
    const pubDisplay = heads.length ? `${name} > ${heads.join(' > ')}` : name
    const plainDisplay = heads.length && !heads[0].startsWith('^') ? `${name} > ${heads.join(' > ')}` : name

    const resolved = resolve(pathPart, from)
    if (resolved && isNote(resolved)) {
      if (!published.has(resolved)) return bang ? '' : (alias ?? plainDisplay)
      rewritten++
      const dest = toSlugTarget(resolved) + frag
      if (bang) return `![[${dest}${alias !== null ? sep + alias : ''}]]`
      return `[[${dest}${sep}${alias ?? pubDisplay}]]`
    }
    if (resolved) {
      const cp = toContentPath(resolved)
      attachments.add(cp)
      rewritten++
      if (bang) return `![[${cp}${frag}${alias !== null ? sep + alias : ''}]]`
      return `[[${cp}${frag}${sep}${alias ?? seg}]]`
    }
    if (looksLikeAttachment(seg)) {
      warnings.push(`missing attachment ${pathPart} in ${from}`)
      return bang ? '' : (alias ?? seg)
    }
    return bang ? '' : (alias ?? plainDisplay)
  }

  const md = (whole, bang, text, rawUrl, title = '') => {
    const newText = rewriteSegment(text)
    let url = rawUrl.startsWith('<') ? rawUrl.slice(1, -1) : rawUrl
    url = url.trim()
    if (!url || isExternal(url)) {
      return `${bang}[${newText}${whole.slice(bang.length + 1 + text.length)}`
    }
    const h = url.indexOf('#')
    const pathPart = nfc(safeDecode(h === -1 ? url : url.slice(0, h)))
    const fragOut = h === -1 ? '' : '#' + encodeURI(safeDecode(url.slice(h + 1)))
    const resolved = resolve(pathPart, from)
    if (resolved && isNote(resolved)) {
      if (!published.has(resolved)) return bang ? '' : newText
      rewritten++
      return `${bang}[${newText}](${encodeUrl(toSlugTarget(resolved))}${fragOut}${title})`
    }
    if (resolved) {
      const cp = toContentPath(resolved)
      attachments.add(cp)
      rewritten++
      return `${bang}[${newText}](${encodeUrl(cp)}${fragOut}${title})`
    }
    if (looksLikeAttachment(lastSeg(pathPart))) {
      warnings.push(`missing attachment ${pathPart} in ${from}`)
    }
    return bang ? '' : newText
  }

  function rewriteSegment(text) {
    return text.replace(LINK_RE, (whole, wb, wi, mb, mt, mu, mtitle) =>
      wi !== undefined ? wiki(whole, wb, wi) : md(whole, mb, mt, mu, mtitle ?? ''),
    )
  }

  const out = splitCode(body)
    .map((s) => (s.code ? s.text : rewriteSegment(s.text)))
    .join('')
  return { body: out, attachments, rewritten, warnings }
}
