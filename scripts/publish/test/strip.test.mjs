import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stripComments } from '../strip.mjs'

test('dataview-publisher block reduces to its static list', () => {
  const body =
    '%% DATAVIEW_PUBLISHER: start\n```dataview\nLIST FROM "Sam’s World"\n```\n%%\n\n- [[a]]\n\n%% DATAVIEW_PUBLISHER: end %%'
  const out = stripComments(body)
  assert.equal(out.trim(), '- [[a]]')
  assert.ok(!out.includes('FROM "Sam’s World'))
  assert.ok(!out.includes('%%'))
})

test('inline and multi-line comments removed', () => {
  assert.equal(stripComments('a %%secret%% b'), 'a  b')
  assert.equal(stripComments('x\n%%\nline1\nline2\n%%\ny\n'), 'x\ny\n')
})

test('%% inside a fenced block is unchanged', () => {
  const body = 'before\n```\n%% not a comment %%\n```\nafter %%gone%%\n'
  assert.equal(stripComments(body), 'before\n```\n%% not a comment %%\n```\nafter \n')
})

test('%% inside inline code is unchanged, escaped backtick respected', () => {
  assert.equal(stripComments('use `%% x %%` here'), 'use `%% x %%` here')
  assert.equal(stripComments('\\` %%gone%% `'), '\\`  `')
})

test('unmatched %% is left as literal text', () => {
  assert.equal(stripComments('50%% off'), '50%% off')
  assert.equal(stripComments('a %%x%% b %% c'), 'a  b %% c')
})
