import { toAttachmentPath, toSlugTarget } from './paths.mjs'

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

/** Container context of a line: blockquote depth and (outside quotes) leading indent width. */
function containerOf(line) {
  const prefix = line.match(/^[ \t>]*/)[0]
  const quote = (prefix.match(/>/g) || []).length
  const indent = quote ? 0 : prefix.replace(/\t/g, '    ').length
  return { quote, indent }
}

/**
 * Split into [{code, text}] segments: fenced blocks first, then inline code spans.
 * A fence opened inside a blockquote or list item closes when that container ends.
 */
function splitCode(body) {
  const segs = []
  const push = (code, text) => {
    if (!text) return
    const last = segs.at(-1)
    if (last && last.code === code) last.text += text
    else segs.push({ code, text })
  }
  const lines = body.split(/(?<=\n)/)
  let fence = null // { mark, quote, indent }
  let buf = ''
  for (const line of lines) {
    if (fence) {
      const c = containerOf(line)
      const blank = line.replace(/^[ \t>]*/, '').trim() === ''
      const leftContainer =
        c.quote < fence.quote || (fence.quote === 0 && fence.indent > 0 && !blank && c.indent < fence.indent)
      if (leftContainer) {
        push(true, buf)
        buf = ''
        fence = null
        // fall through: handle this line as ordinary text
      } else {
        buf += line
        const m = line.match(/^[ \t>]*(`{3,}|~{3,})\s*$/)
        if (m && m[1][0] === fence.mark[0] && m[1].length >= fence.mark.length) {
          push(true, buf)
          buf = ''
          fence = null
        }
        continue
      }
    }
    const open = line.match(/^[ \t>]*(`{3,}|~{3,})/)
    if (open && !(open[1][0] === '`' && line.slice(open[0].length).includes('`'))) {
      splitInline(buf, push)
      buf = line
      fence = { mark: open[1], ...containerOf(line) }
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
    // a backslash-escaped backtick is literal and cannot open a code span
    let bs = 0
    while (i - bs - 1 >= 0 && text[i - bs - 1] === '\\') bs++
    if (bs % 2 === 1) {
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
    if (close !== -1 && !/\n[ \t>]*\n/.test(text.slice(i, close))) {
      push(false, text.slice(start, i))
      push(true, text.slice(i, close + n))
      i = close + n
      start = i
    } else i += n
  }
  push(false, text.slice(start))
}

const BR = String.raw`(?:[^\[\]\n]|\[[^\[\]\n]*\])` // one char, or one level of nested [..]
const WIKI = String.raw`(!?)\[\[(${BR}*?)\]\]`
const MD =
  String.raw`(!?)\[(${BR}*)\]` +
  String.raw`\(\s*(<[^<>\n]*>|(?:[^()\n]|\([^()\n]*\))+?)` +
  String.raw`(\s+(?:"[^"\n]*"|'[^'\n]*'|\([^()\n]*\)))?\s*\)`
const REF = String.raw`(!?)\[(${BR}*)\](?:\[([^\[\]\n]*)\])?`
const LINK_RE = new RegExp(`${WIKI}|${MD}|${REF}`, 'g')
const DEF_RE =
  /^( {0,3})\[([^\]\n^][^\]\n]*)\]:[ \t]*(<[^<>\n]*>|\S+)([ \t]+(?:"[^"\n]*"|'[^'\n]*'|\([^()\n]*\)))?[ \t]*(?:\n|$)/gm
const HTML_A =
  /<a\b([^>]*?)(?<=\s)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))([^>]*)>([\s\S]*?)<\/a\s*>/gi
const HTML_IMG = /<img\b([^>]*?)(?<=\s)src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))([^>]*)>/gi

const PH = /(\d+)/g
const normLabel = (l) => l.trim().replace(/\s+/g, ' ').toLowerCase()

/**
 * Last line of defence, run on already-rewritten non-code text: any wikilink, embed or
 * relative Markdown link to a `.md` target still present is reduced to plain text.
 * (Links emitted by rewriteLinks are hidden behind placeholders while this runs.)
 */
export function failSafe(text) {
  return text
    .replace(/(!?)\[\[([^\n]*?)\]\]/g, (whole, bang, inner) => {
      const target = inner.split('|')[0].replace(/\\+$/, '')
      const pathPart = target.split('#')[0].trim()
      if (!pathPart) return whole
      return bang ? '' : stripMd(lastSeg(pathPart))
    })
    .replace(/(!?)\[([^\[\]\n]*)\]\(((?:[^()\n]|\([^()\n]*\))*)\)/g, (whole, bang, text, url) => {
      let u = url.trim()
      if (u.startsWith('<')) u = u.slice(1, u.indexOf('>') === -1 ? undefined : u.indexOf('>'))
      else u = u.replace(/\s+(?:"[^"]*"|'[^']*'|\([^()]*\))\s*$/, '')
      u = u.trim()
      if (!u || isExternal(u)) return whole
      const p = safeDecode(u.split('#')[0]).trim()
      if (!/\.md$/i.test(p)) return whole
      return bang ? '' : text
    })
}

/**
 * Rewrite wikilinks, Markdown links (inline and reference-style) and HTML a/img links in
 * `body` so that only published notes stay linked.
 * ctx: { from: vault-relative path of the note, resolve: buildResolver(...),
 *        published: Set<vaultRel>, attachmentOwners?: Map<contentPath, vaultRel> (share
 *        across notes to detect content-path collisions globally) }
 * Returns { body, attachments: Map<vaultRel, contentPath>, rewritten, warnings }.
 */
export function rewriteLinks(body, ctx) {
  const { from, resolve, published } = ctx
  const owners = ctx.attachmentOwners ?? new Map()
  const attachments = new Map()
  const warnings = []
  const kept = [] // emitted link strings, hidden behind placeholders until the end
  let rewritten = 0

  const hold = (s) => {
    rewritten++
    kept.push(s)
    return `${kept.length - 1}`
  }

  /** Resolve a decoded path. -> {kind:'pub', url} | {kind:'att', url} | {kind:'hidden'} */
  const classify = (pathPart) => {
    const r = resolve(pathPart, from)
    if (r && isNote(r)) return published.has(r) ? { kind: 'pub', url: toSlugTarget(r) } : { kind: 'hidden' }
    if (r) {
      const cp = toAttachmentPath(r)
      const owner = owners.get(cp)
      if (owner !== undefined && owner !== r) {
        warnings.push(`attachment path collision ${cp} (${r} vs ${owner}) in ${from}`)
        return { kind: 'hidden' }
      }
      owners.set(cp, r)
      attachments.set(r, cp)
      return { kind: 'att', url: cp }
    }
    if (looksLikeAttachment(lastSeg(pathPart))) warnings.push(`missing attachment ${pathPart} in ${from}`)
    return { kind: 'hidden' }
  }

  /** Classify a raw URL as written in Markdown/HTML. null = external/anchor (leave alone). */
  const classifyUrl = (rawUrl) => {
    let url = rawUrl.trim()
    if (url.startsWith('<') && url.endsWith('>')) url = url.slice(1, -1).trim()
    if (!url || isExternal(url)) return null
    const h = url.indexOf('#')
    const pathPart = nfc(safeDecode(h === -1 ? url : url.slice(0, h))).trim()
    const frag = h === -1 ? '' : '#' + encodeURI(safeDecode(url.slice(h + 1)))
    if (!pathPart) return null
    const c = classify(pathPart)
    return c.kind === 'hidden' ? c : { ...c, href: encodeUrl(c.url) + frag }
  }

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
    target = nfc(target).replace(/\\+$/, '').trim()
    const h = target.indexOf('#')
    const pathPart = (h === -1 ? target : target.slice(0, h)).trim()
    const frag = h === -1 ? '' : target.slice(h)
    if (!pathPart) return whole // same-note heading link: no other note's name involved

    const seg = lastSeg(pathPart)
    const name = stripMd(seg)
    const heads = frag.split('#').filter(Boolean)
    const pubDisplay = heads.length ? `${name} > ${heads.join(' > ')}` : name
    const plainDisplay = heads.length && !heads[0].startsWith('^') ? `${name} > ${heads.join(' > ')}` : name

    const c = classify(pathPart)
    if (c.kind === 'pub') {
      if (bang) return hold(`![[${c.url}${frag}${alias !== null ? sep + alias : ''}]]`)
      return hold(`[[${c.url}${frag}${sep}${alias ?? pubDisplay}]]`)
    }
    if (c.kind === 'att') {
      if (bang) return hold(`![[${c.url}${frag}${alias !== null ? sep + alias : ''}]]`)
      return hold(`[[${c.url}${frag}${sep}${alias ?? seg}]]`)
    }
    if (bang) return ''
    return alias ?? (looksLikeAttachment(seg) ? seg : plainDisplay)
  }

  const md = (whole, bang, text, rawUrl, title = '') => {
    const newText = rewriteSegment(text)
    const c = classifyUrl(rawUrl)
    if (c === null) return `${bang}[${newText}${whole.slice(bang.length + 1 + text.length)}`
    if (c.kind === 'hidden') return bang ? '' : newText
    rewritten++
    kept.push(`](${c.href}${title})`)
    return `${bang}[${newText}${kept.length - 1}`
  }

  const ref = (whole, bang, text, label) => {
    const key = normLabel(label ? label : text)
    if (dropped.has(key)) return bang ? '' : rewriteSegment(text)
    return `${bang}[${rewriteSegment(text)}]${label !== undefined ? `[${label}]` : ''}`
  }

  function rewriteSegment(text) {
    return text.replace(LINK_RE, (whole, wb, wi, mb, mt, mu, mtitle, rb, rt, rl) => {
      if (wi !== undefined) return wiki(whole, wb, wi)
      if (mu !== undefined) return md(whole, mb, mt, mu, mtitle ?? '')
      return ref(whole, rb, rt, rl)
    })
  }

  const rewriteHtml = (text) =>
    text
      .replace(HTML_A, (whole, before, q1, q2, q3, after, inner) => {
        const c = classifyUrl(q1 ?? q2 ?? q3 ?? '')
        if (c === null) return whole
        if (c.kind === 'hidden') return inner
        return hold(`<a${before}href="${c.href}"${after}>`) + inner + '</a>'
      })
      .replace(HTML_IMG, (whole, before, q1, q2, q3, after) => {
        const c = classifyUrl(q1 ?? q2 ?? q3 ?? '')
        if (c === null) return whole
        if (c.kind === 'hidden') return ''
        return hold(`<img${before}src="${c.href}"${after}>`)
      })

  const segs = splitCode(body)

  // Pass 1: reference definitions (global, since they may follow their uses).
  const dropped = new Set()
  for (const s of segs) {
    if (s.code) continue
    s.text = s.text.replace(DEF_RE, (whole, indent, label, rawUrl, title = '') => {
      const c = classifyUrl(rawUrl)
      if (c === null) return whole
      if (c.kind === 'hidden') {
        dropped.add(normLabel(label))
        return ''
      }
      const nl = whole.endsWith('\n') ? '\n' : ''
      return hold(`${indent}[${label}]: ${c.href}${title}`) + nl
    })
  }

  // Pass 2: HTML, then Markdown/wiki links, then the fail-safe; finally restore held links.
  const out = segs
    .map((s) => (s.code ? s.text : failSafe(rewriteSegment(rewriteHtml(s.text)))))
    .join('')
    .replace(PH, (_, i) => kept[Number(i)])
  return { body: out, attachments, rewritten, warnings }
}
