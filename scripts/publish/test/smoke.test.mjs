import { test } from "node:test"
import assert from "node:assert/strict"

test("gray-matter is importable and parses frontmatter", async () => {
  const mod = await import("gray-matter")
  const matter = mod.default
  assert.equal(typeof matter, "function")
  const parsed = matter("---\npublish: true\n---\nbody\n")
  assert.equal(parsed.data.publish, true)
})
