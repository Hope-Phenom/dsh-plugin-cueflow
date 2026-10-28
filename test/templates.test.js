import test from 'node:test'
import assert from 'node:assert/strict'

import { listTemplates, getTemplate } from '../lib/core/templates.js'
import { validateWorkflow } from '../shared/validation.js'

test('every built-in template is a valid workflow', () => {
  for (const template of listTemplates()) {
    const report = validateWorkflow(template.workflow)
    assert.equal(report.ok, true, `${template.id}: ${JSON.stringify(report.issues, null, 2)}`)
  }
})

test('templates expose stable ids and at least one non-blank flow', () => {
  const templates = listTemplates()
  assert.equal(new Set(templates.map(template => template.id)).size, templates.length)
  assert.ok(templates.some(template => template.workflow.nodes.length > 0))
  assert.equal(getTemplate('review-diff').workflow.nodes.length, 4)
  assert.equal(getTemplate('nope'), null)
})
