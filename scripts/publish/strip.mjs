const FENCE = /^ {0,3}(`{3,}|~{3,})/

/**
 * Remove Obsidian `%% … %%` comments (single- or multi-line) outside code.
 * - A `%%` outside code opens a comment running to the next `%%`, even across
 *   code fences inside it.
 * - `%%` inside a fence (not itself inside a comment) or an inline code span is kept.
 * - An unmatched opening `%%` is literal text.
 */
export function stripComments(body) {
  let out = ''
  let i = 0
  const n = body.length
  while (i < n) {
    const atLineStart = i === 0 || body[i - 1] === '\n'
    if (atLineStart) {
      const eol = body.indexOf('\n', i)
      const line = body.slice(i, eol === -1 ? n : eol)
      const m = FENCE.exec(line)
      if (m) {
        const marker = m[1]
        const closeRe = new RegExp(`^ {0,3}${marker[0] === '`' ? '`' : '~'}{${marker.length},}[ \\t]*$`)
        let j = eol === -1 ? n : eol + 1
        let end = n
        while (j < n) {
          const e = body.indexOf('\n', j)
          const l = body.slice(j, e === -1 ? n : e)
          if (closeRe.test(l)) {
            end = e === -1 ? n : e + 1
            break
          }
          j = e === -1 ? n : e + 1
        }
        out += body.slice(i, end)
        i = end
        continue
      }
    }
    const c = body[i]
    if (c === '\\' && body[i + 1] === '`') {
      out += '\\`'
      i += 2
      continue
    }
    if (c === '`') {
      let k = i
      while (body[k] === '`') k++
      const run = body.slice(i, k)
      let search = k
      let close = -1
      while (search < n) {
        const p = body.indexOf('`', search)
        if (p === -1) break
        let q = p
        while (body[q] === '`') q++
        if (q - p === run.length) {
          close = q
          break
        }
        search = q
      }
      if (close !== -1) {
        out += body.slice(i, close)
        i = close
      } else {
        out += run
        i = k
      }
      continue
    }
    if (c === '%' && body[i + 1] === '%') {
      const close = body.indexOf('%%', i + 2)
      if (close === -1) {
        out += '%%'
        i += 2
        continue
      }
      let end = close + 2
      // A comment alone on its line(s) takes its trailing newline with it.
      const lineStartOut = out.lastIndexOf('\n') + 1
      if (/^[ \t]*$/.test(out.slice(lineStartOut))) {
        const m = /^[ \t]*\r?\n/.exec(body.slice(end))
        if (m) {
          end += m[0].length
          out = out.slice(0, lineStartOut)
        }
      }
      i = end
      continue
    }
    out += c
    i++
  }
  return out
}
