import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { FullSlug, resolveRelative, slugTag, slugifyFilePath, FilePath } from "../util/path"

/**
 * Info strip for project notes: status · tags · year · repo, then an optional cover image.
 * Renders nothing unless the note's frontmatter has `status`.
 */
function ProjectMeta({ fileData }: QuartzComponentProps) {
  const fm = (fileData.frontmatter ?? {}) as Record<string, unknown>
  const status = typeof fm.status === "string" ? fm.status : undefined
  if (!status) return null

  const slug = fileData.slug as FullSlug
  const tags = Array.isArray(fm.tags)
    ? fm.tags.filter((t): t is string => typeof t === "string")
    : []
  const year =
    typeof fm.year === "number" || typeof fm.year === "string" ? String(fm.year) : undefined
  const repo = typeof fm.repo === "string" && /^https?:\/\//.test(fm.repo) ? fm.repo : undefined
  const cover = typeof fm.cover === "string" && fm.cover.trim() ? fm.cover.trim() : undefined
  const coverHref = cover
    ? resolveRelative(slug, slugifyFilePath(`Media/${cover}` as FilePath) as unknown as FullSlug)
    : undefined

  const summary =
    typeof fm.description === "string" && fm.description.trim() ? fm.description.trim() : undefined

  return (
    <>
      {summary && <p class="pm-summary">{summary}</p>}
      <div class="project-meta">
        <span class="pm-status">
          status <b>{status}</b>
        </span>
        {tags.length > 0 && (
          <span class="pm-tags">
            {tags.map((t) => (
              <a
                class="tag-link internal"
                href={resolveRelative(slug, `tags/${slugTag(t)}` as FullSlug)}
              >
                {t}
              </a>
            ))}
          </span>
        )}
        {year && <span class="pm-year">{year}</span>}
        {repo && (
          <a class="pm-repo external" href={repo}>
            github ↗
          </a>
        )}
      </div>
      {coverHref && <img class="pm-cover" src={coverHref} alt="" />}
    </>
  )
}

export default (() => ProjectMeta) satisfies QuartzComponentConstructor
