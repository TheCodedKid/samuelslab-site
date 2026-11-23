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

function NavLinks({ fileData }: QuartzComponentProps) {
  const here = fileData.slug as FullSlug
  return (
    <nav class="nav-links">
      {LINKS.map(([label, slug]) => (
        <a class="internal" href={resolveRelative(here, slug as FullSlug)}>
          {label}
        </a>
      ))}
    </nav>
  )
}

export default (() => NavLinks) satisfies QuartzComponentConstructor
