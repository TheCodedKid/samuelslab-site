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
  let fence = null // { mark, quote, indent, inList }
  let buf = ''
  let listIndent = null // content indent of the list item we are in, if any
  for (const line of lines) {
    const c = containerOf(line)
    const blank = line.replace(/^[ \t>]*/, '').trim() === ''
    if (fence) {
      // Only container fences (blockquote, list item) close when their container ends;
      // a top-level fence (even indented 1-3 spaces) closes only on a matching fence.
      const leftContainer = c.quote < fence.quote || (fence.inList && !blank && c.indent < fence.indent)
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
    const lm = c.quote === 0 && line.match(/^[ \t]*(?:[-*+]|\d{1,9}[.)])(?:[ \t]+|(?=\n)|$)/)
    // a non-blank line indented less than the list content ends the list context
    if (!lm && !blank && listIndent !== null && (c.quote > 0 || c.indent < listIndent)) listIndent = null
    const open = line.match(/^[ \t>]*(`{3,}|~{3,})/)
    if (open && !(open[1][0] === '`' && line.slice(open[0].length).includes('`'))) {
      splitInline(buf, push)
      buf = line
      fence = { mark: open[1], ...c, inList: c.quote === 0 && listIndent !== null && c.indent >= listIndent }
      continue
    }
    if (lm) listIndent = lm[0].replace(/\t/g, '    ').length
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
const WIKI = String.raw`(!?)\[\[((?:${BR}|\n(?![ \t]*\n))*?)\]\]`
const MD =
  String.raw`(!?)\[(${BR}*)\]` +
  String.raw`\(\s*(<[^<>\n]*>|(?:[^()\n]|\([^()\n]*\))+?)` +
  String.raw`(\s+(?:"[^"\n]*"|'[^'\n]*'|\([^()\n]*\)))?\s*\)`
const REF = String.raw`(!?)\[(${BR}*)\](?:\[([^\[\]\n]*)\])?`
const LINK_RE = new RegExp(`${WIKI}|${MD}|${REF}`, 'g')
// [label]: dest "title" -- allowing a blockquote/list container prefix and the
// destination on the following line.
const DEF_RE =
  /^((?:[ \t]*>)*[ \t]*(?:(?:[-*+]|\d{1,9}[.)])[ \t]+)?[ \t]*)\[([^\]\n^][^\]\n]*)\]:[ \t]*(?:\n(?:[ \t]*>)*[ \t]*)?(<[^<>\n]*>|[^\s<]\S*)([ \t]+(?:"[^"\n]*"|'[^'\n]*'|\([^()\n]*\)))?[ \t]*(?:\n|$)/gm
// Attribute-aware tag matching: a '>' inside a quoted attribute value does not end the tag.
const ATTR_SRC = String.raw`\s+[^\s"'>=/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?`
const TAG_SRC = String.raw`<([a-zA-Z][\w-]*)((?:${ATTR_SRC})*)(\s*\/?)>`
const HTML_A = new RegExp(String.raw`<(a)((?:${ATTR_SRC})*)(\s*\/?)>([\s\S]*?)<\/a\s*>`, 'gi')
const HTML_TAG = new RegExp(TAG_SRC, 'g')
const ATTR_RE = /\s+([^\s"'>=/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g
const URL_ATTRS = new Set(['href', 'src', 'srcset', 'poster', 'data', 'action', 'formaction', 'cite', 'background'])

/** True if a URL attribute value (srcset: any candidate) is a relative URL. */
function isRelativeAttr(name, value) {
  const v = value.trim()
  const urls = name === 'srcset' ? v.split(',').map((x) => x.trim().split(/\s+/)[0]) : [v]
  return urls.some((u) => u && !isExternal(u))
}

/** Parsed attributes of an attribute string: [{ name (lowercased), value, raw }]. */
const parseAttrs = (attrs) =>
  [...attrs.matchAll(ATTR_RE)].map((m) => ({ name: m[1].toLowerCase(), value: m[2] ?? m[3] ?? m[4], raw: m[0] }))
const URL_ATTR =
  /(?:^|\s)(href|src|srcset|poster|data|action|formaction|cite|background)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi

/** True if an HTML tag (or attribute string) has any URL attribute with a relative value. */
function hasRelativeUrlAttr(tag) {
  for (const m of tag.matchAll(URL_ATTR)) {
    const v = (m[2] ?? m[3] ?? m[4] ?? '').trim()
    const urls = m[1].toLowerCase() === 'srcset' ? v.split(',').map((x) => x.trim().split(/\s+/)[0]) : [v]
    if (urls.some((u) => u && !isExternal(u))) return true
  }
  return false
}

const PH = /\uE000(\d+)\uE001/g
const normLabel = (l) => l.trim().replace(/\s+/g, ' ').toLowerCase()

const MD_TAIL =
  /\]\(\s*(<[^<>\n]*>|(?:[^()\n]|\([^()\n]*\))*?)(\s+(?:"[^"\n]*"|'[^'\n]*'|\([^()\n]*\)))?\s*\)/g

function isRelativeMdUrl(raw) {
  let u = raw.trim()
  if (u.startsWith('<') && u.endsWith('>')) u = u.slice(1, -1).trim()
  if (!u || isExternal(u)) return false
  return /\.md$/i.test(safeDecode(u.split('#')[0]).trim())
}

/** Replace every `[...](relative .md)` (any bracket nesting) by its text; embeds are removed. */
function stripMdLinks(text) {
  for (;;) {
    let hit = null
    for (const m of text.matchAll(MD_TAIL)) {
      if (isRelativeMdUrl(m[1])) {
        hit = m
        break
      }
    }
    if (!hit) return text
    const close = hit.index
    const end = close + hit[0].length
    let depth = 0
    let open = -1
    for (let j = close - 1; j >= 0; j--) {
      if (text[j] === ']') depth++
      else if (text[j] === '[') {
        if (depth === 0) {
          open = j
          break
        }
        depth--
      }
    }
    if (open === -1) {
      text = text.slice(0, close) + text.slice(end)
      continue
    }
    const bang = open > 0 && text[open - 1] === '!'
    text = text.slice(0, bang ? open - 1 : open) + (bang ? '' : text.slice(open + 1, close)) + text.slice(end)
  }
}

/**
 * Last line of defence, run on already-rewritten non-code text: any wikilink, embed,
 * relative Markdown link to a `.md` target, or HTML tag with a relative URL attribute that
 * is still present is reduced to plain text / removed.
 * (Links emitted by rewriteLinks are hidden behind placeholders while this runs.)
 */
export function failSafe(text) {
  text = text.replace(/(!?)\[\[((?:[^\n]|\n(?![ \t]*\n))*?)\]\]/g, (whole, bang, inner) => {
    const target = inner.split('|')[0].replace(/\\+$/, '')
    const pathPart = target.split('#')[0].trim()
    if (!pathPart) return whole
    return bang ? '' : stripMd(lastSeg(pathPart))
  })
  text = stripMdLinks(text)
  text = text.replace(new RegExp(TAG_SRC, 'g'), (tag, name, attrs) =>
    parseAttrs(attrs).some((a) => a.value !== undefined && URL_ATTRS.has(a.name) && isRelativeAttr(a.name, a.value))
      ? ''
      : tag,
  )
  // crude second sweep for malformed tags the attribute-aware pattern cannot match
  return text.replace(/<[a-zA-Z][^>]*>/g, (tag) => (hasRelativeUrlAttr(tag) ? '' : tag))
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
    return `\uE000${kept.length - 1}\uE001`
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
    return `${bang}[${newText}\uE000${kept.length - 1}\uE001`
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

  /**
   * Rewrite one HTML tag's URL attributes. Returns a held (placeholder) tag if href/src were
   * rewritten, `null` if the tag must be dropped (hidden target, or any other relative URL
   * attribute such as srcset/poster), or `undefined` to leave it unchanged.
   */
  const processTag = (tag, attrs, tail) => {
    const parsed = parseAttrs(attrs).filter((a) => a.value !== undefined && URL_ATTRS.has(a.name))
    if (!parsed.length) return undefined
    if (parsed.some((a) => a.name !== 'href' && a.name !== 'src' && isRelativeAttr(a.name, a.value))) return null
    const rewrites = new Map()
    for (const a of parsed) {
      if (a.name !== 'href' && a.name !== 'src') continue
      const c = classifyUrl(a.value)
      if (c === null) continue
      if (c.kind === 'hidden') return null
      rewrites.set(a.raw, ` ${a.raw.trim().match(/^[^\s"'>=/]+/)[0]}="${c.href}"`)
    }
    if (!rewrites.size) return undefined
    const newAttrs = attrs.replace(ATTR_RE, (m) => rewrites.get(m) ?? m)
    return hold(`<${tag}${newAttrs}${tail}>`)
  }

  const rewriteHtml = (text) =>
    text
      .replace(HTML_A, (whole, tag, attrs, tail, inner) => {
        const r = processTag(tag, attrs, tail)
        if (r === undefined) return whole
        return r === null ? inner : r + inner + '</a>'
      })
      // any other tag with URL attributes, including a lone or unclosed <a ...>
      .replace(HTML_TAG, (whole, tag, attrs, tail) => {
        const r = processTag(tag, attrs, tail)
        return r === undefined ? whole : (r ?? '')
      })

  // placeholder delimiters are reserved; neutralize any in the input
  const segs = splitCode(body.replace(/[\uE000\uE001]/g, '\uFFFD'))

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
