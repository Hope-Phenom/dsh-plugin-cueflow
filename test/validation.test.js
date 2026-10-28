import test from 'node:test'
import assert from 'node:assert/strict'

import { createNode } from '../shared/node-types.js'
import { createEmptyWorkflow, normalizeWorkflow, validateWorkflow } from '../shared/validation.js'

function node(type, id, x = 0, config = {}) {
  return createNode(type, { id, position: { x, y: 0 }, config })
}

function edge(id, from, fromPort, to, toPort) {
  return { id, from: { node: from, port: fromPort }, to: { node: to, port: toPort } }
}

function wf(nodes, edges = [], extra = {}) {
  return { schemaVersion: 1, id: 'wf_test', name: 'test', nodes, edges, settings: {}, ...extra }
}

test('a minimal linear workflow is valid', () => {
  const workflow = wf([
    node('input', 'n1'),
    node('template', 'n2', 200, { template: '{{input}}' }),
    node('output', 'n3', 400),
  ], [
    edge('e1', 'n1', 'value', 'n2', 'value'),
    edge('e2', 'n2', 'text', 'n3', 'value'),
  ])
  const report = validateWorkflow(workflow)
  assert.equal(report.ok, true, JSON.stringify(report.issues, null, 2))
  assert.deepEqual(report.issues, [])
})

test('unknown node type is an error', () => {
  const report = validateWorkflow(wf([{ id: 'x', type: 'nope', title: 'X', position: { x: 0, y: 0 }, config: {} }]))
  assert.equal(report.ok, false)
  assert.ok(report.issues.some(issue => issue.code === 'NODE_TYPE_UNKNOWN'))
})

test('duplicate node ids and edge ids are errors', () => {
  const report = validateWorkflow(wf([
    node('input', 'same'),
    node('input', 'same'),
  ], [
    edge('e', 'same', 'value', 'same', 'value'),
    edge('e', 'same', 'value', 'same', 'value'),
  ]))
  assert.ok(report.issues.some(issue => issue.code === 'NODE_ID_DUPLICATE'))
  assert.ok(report.issues.some(issue => issue.code === 'EDGE_ID_DUPLICATE'))
})

test('two edges into one input are rejected', () => {
  const report = validateWorkflow(wf([
    node('input', 'a'),
    node('input', 'b'),
    node('template', 't'),
  ], [
    edge('e1', 'a', 'value', 't', 'value'),
    edge('e2', 'b', 'value', 't', 'value'),
  ]))
  assert.ok(report.issues.some(issue => issue.code === 'EDGE_INPUT_OCCUPIED'))
})

test('incompatible types and cycles are rejected', () => {
  const report = validateWorkflow(wf([
    node('condition', 'c'),
    node('agent', 'a'),
  ], [
    edge('e1', 'c', 'true', 'a', 'prompt'),
    edge('e2', 'a', 'text', 'c', 'value'),
  ]))
  assert.ok(report.issues.some(issue => issue.code === 'EDGE_CYCLE' || issue.code === 'CYCLE'))
})

test('required input without a connection is an error', () => {
  const report = validateWorkflow(wf([node('output', 'o')]))
  assert.ok(report.issues.some(issue => issue.code === 'REQUIRED_INPUT_UNCONNECTED'))
})

test('disabled nodes produce a warning, not an error', () => {
  const workflow = wf([node('output', 'o')])
  workflow.nodes[0].disabled = true
  const report = validateWorkflow(workflow)
  assert.equal(report.ok, true)
  assert.ok(report.issues.some(issue => issue.code === 'NODE_DISABLED'))
})

test('normalizeWorkflow fills ids, defaults and settings', () => {
  const workflow = normalizeWorkflow({
    schemaVersion: 1,
    name: 'Imported',
    nodes: [{ type: 'input', position: { x: '12', y: 3 }, config: {} }],
    edges: [],
  })
  assert.match(workflow.id, /^wf_/)
  assert.match(workflow.nodes[0].id, /^n_/)
  assert.equal(workflow.nodes[0].position.x, 12)
  assert.equal(workflow.nodes[0].config.valueType, 'text')
  assert.equal(workflow.settings.concurrency, 2)
})

test('empty workflow is saveable but warns', () => {
  const report = validateWorkflow(createEmptyWorkflow())
  assert.equal(report.ok, true)
  assert.ok(report.issues.some(issue => issue.code === 'EMPTY_WORKFLOW'))
})

test('unsupported session mode is rejected', () => {
  const workflow = createEmptyWorkflow('session mode')
  workflow.settings.sessionMode = 'parent'
  const report = validateWorkflow(workflow)
  assert.equal(report.ok, false)
  assert.ok(report.issues.some(issue => issue.code === 'SESSION_MODE'))
})

test('unsupported schemaVersion is rejected', () => {
  const workflow = createEmptyWorkflow()
  workflow.schemaVersion = 99
  const report = validateWorkflow(workflow)
  assert.ok(report.issues.some(issue => issue.code === 'SCHEMA_VERSION'))
})
