const LAB_PREFIX = 'Sam’s World/Samuel’s Lab/'
const HOME_NOTE = LAB_PREFIX + 'Samuel’s Lab.md'

const nfc = (p) => p.normalize('NFC').replaceAll('\\', '/')

/** Vault-relative path -> content-relative path (keeps extension). */
export function toContentPath(vaultRel) {
  const p = nfc(vaultRel)
  if (p === HOME_NOTE) return 'index.md'
  if (p.startsWith(LAB_PREFIX)) return p.slice(LAB_PREFIX.length)
  return p
}

/** Vault-relative path -> content-relative link target without .md (`index` for home). */
export function toSlugTarget(vaultRel) {
  const c = toContentPath(vaultRel)
  return c.endsWith('.md') ? c.slice(0, -3) : c
}

/**
 * Vault-relative attachment path -> content-relative path. Lab attachments keep their
 * folder (prefix stripped); anything else is flattened to `Media/<basename>` so private
 * folder names never reach the output.
 */
export function toAttachmentPath(vaultRel) {
  const p = nfc(vaultRel)
  if (p.startsWith(LAB_PREFIX)) return p.slice(LAB_PREFIX.length)
  return 'Media/' + p.split('/').at(-1)
}
