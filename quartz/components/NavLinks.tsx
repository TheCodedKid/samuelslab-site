import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { FullSlug, resolveRelative } from "../util/path"

/** Site-wide link row: label → target slug. */
const LINKS: [label: string, slug: string][] = [
  ["projects", "main/projects"],
  ["code", "main/code"],
  ["writeups", "main/writeups"],
  ["ideas", "main/project-ideas"],
  ["resources", "main/resources"],
  ["about", "main/about"],
]

function NavLinks({ fileData, cfg, ctx }: QuartzComponentProps) {
  const here = fileData.slug as FullSlug
  // 404.html is served for missing URLs at any depth, so page-relative links break there.
  // Use the site root instead, the same way Quartz's own "Return to Homepage" link does.
  const siteRoot = ctx.argv.serve
    ? "/"
    : new URL(`https://${cfg.baseUrl ?? "example.com"}`).pathname
  const href = (slug: string) =>
    here === "404"
      ? `${siteRoot.replace(/\/?$/, "/")}${slug}`
      : resolveRelative(here, slug as FullSlug)
  return (
    <nav class="nav-links">
      {LINKS.map(([label, slug]) => (
        <a class="internal" href={href(slug)}>
          {label}
        </a>
      ))}
    </nav>
  )
}

export default (() => NavLinks) satisfies QuartzComponentConstructor
