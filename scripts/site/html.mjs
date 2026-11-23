// Test helpers: load a built page from public/ as a hast tree and query it.
import fs from 'node:fs'
import path from 'node:path'
import { fromHtml } from 'hast-util-from-html'
import { visit } from 'unist-util-visit'

export const PUBLIC = path.resolve(import.meta.dirname, '../../public')

/** Parse public/<relPath> into a hast Root. */
export function loadPage(relPath) {
  return fromHtml(fs.readFileSync(path.join(PUBLIC, relPath), 'utf8'))
}

/** Every element under `tree` for which `pred` is true. */
export function findAll(tree, pred) {
  const out = []
  visit(tree, 'element', (el) => {
    if (pred(el)) out.push(el)
  })
  return out
}

/** True when `el` carries the class token `cls`. */
export function hasClass(el, cls) {
  const c = el.properties?.className
  return Array.isArray(c) ? c.includes(cls) : false
}

/** Concatenated text content of `el`. */
export function text(el) {
  let s = ''
  visit(el, 'text', (t) => {
    s += t.value
  })
  return s
}
