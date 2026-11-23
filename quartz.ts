import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { NavLinks, ProjectMeta } from "./quartz/components"
import type { QuartzComponent } from "./quartz/components"

const config = await loadQuartzConfig()
export default config

// Local components the YAML config can't place: insert into the YAML-derived slots.
const base = await loadQuartzLayout()
const beforeBody: QuartzComponent[] = [...(base.defaults.beforeBody ?? [])]
const titleIdx = beforeBody.findIndex((c) => (c.displayName ?? c.name) === "ArticleTitle")
beforeBody.splice(titleIdx === -1 ? beforeBody.length : titleIdx + 1, 0, ProjectMeta())

const header: QuartzComponent[] = [...(base.defaults.header ?? [])]
const pageTitleIdx = header.findIndex((c) => (c.displayName ?? c.name) === "PageTitle")
header.splice(pageTitleIdx + 1, 0, NavLinks())

export const layout = await loadQuartzLayout({
  defaults: { beforeBody, header },
})
