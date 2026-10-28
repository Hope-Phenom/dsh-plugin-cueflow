import test from 'node:test'
import assert from 'node:assert/strict'

import { interpolate, renderTemplate, templateTokens } from '../shared/template.js'

test('interpolates input and node outputs', () => {
  const result = interpolate('Task: {{input}}\nDiff: {{n1.text}}', {
    input: 'fix parser',
    values: { n1: { text: 'diff --git a/x b/x' } },
  })
  assert.equal(result.text, 'Task: fix parser\nDiff: diff --git a/x b/x')
  assert.deepEqual(result.missing, [])
})

test('serializes objects and falsy values', () => {
  assert.equal(renderTemplate('{{input}}', { input: { a: 1 } }), '{\n  "a": 1\n}')
  assert.equal(renderTemplate('{{input}}', { input: 0 }), '0')
  assert.equal(renderTemplate('{{input}}', { input: false }), 'false')
  assert.equal(renderTemplate('{{input}}', { input: null }), '')
})

test('preserves unknown tokens and reports them', () => {
  const result = interpolate('Hello {{missing}} and {{n1.nope}}', { values: { n1: {} } })
  assert.equal(result.text, 'Hello {{missing}} and {{n1.nope}}')
  assert.deepEqual(result.missing, ['missing', 'n1.nope'])
})

test('supports vars', () => {
  assert.equal(renderTemplate('{{vars.branch}}', { vars: { branch: 'main' } }), 'main')
  const missing = interpolate('{{vars.nope}}', { vars: {} })
  assert.deepEqual(missing.missing, ['vars.nope'])
})

test('empty template returns empty text; templateTokens lists unique tokens', () => {
  assert.equal(renderTemplate('', { input: 'x' }), '')
  assert.deepEqual(templateTokens('{{a}} {{b}} {{a}}'), ['a', 'b'])
})
