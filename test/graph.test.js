import test from 'node:test'
import assert from 'node:assert/strict'

import { createNode } from '../shared/node-types.js'
import {
  canConnect,
  detectCycle,
  resolveNodeInputs,
  topologicalOrder,
  typeCompatible,
  wouldCreateCycle,
} from '../shared/graph.js'

function node(type, id, x = 0, config = {}) {
  return createNode(type, { id, position: { x, y: 0 }, config })
}

function wf(nodes, edges = []) {
  return { schemaVersion: 1, id: 'wf_test', name: 'test', nodes, edges, settings: {} }
}

function edge(id, from, fromPort, to, toPort) {
  return { id, from: { node: from, port: fromPort }, to: { node: to, port: toPort } }
}

test('topological order is deterministic by position then id', () => {
  const workflow = wf([
    node('output', 'n3', 300),
    node('input', 'n1', 0),
    node('template', 'n2', 150),
  ], [
    edge('e1', 'n1', 'value', 'n2', 'value'),
    edge('e2', 'n2', 'text', 'n3', 'value'),
  ])
  const { order, cycle } = topologicalOrder(workflow)
  assert.deepEqual(order.map(n => n.id), ['n1', 'n2', 'n3'])
  assert.deepEqual(cycle, [])
})

test('detects a two-node cycle', () => {
  const workflow = wf([
    node('agent', 'a'),
    node('agent', 'b'),
  ], [
    edge('e1', 'a', 'text', 'b', 'prompt'),
    edge('e2', 'b', 'text', 'a', 'prompt'),
  ])
  const cycle = detectCycle(workflow)
  assert.ok(cycle)
  assert.ok(cycle.length >= 3)
  assert.equal(cycle[0], cycle[cycle.length - 1])
})

test('wouldCreateCycle and canConnect reject cycles', () => {
  const workflow = wf([
    node('agent', 'a'),
    node('agent', 'b'),
  ], [
    edge('e1', 'a', 'text', 'b', 'prompt'),
  ])
  assert.equal(wouldCreateCycle(workflow, 'b', 'a'), true)
  const result = canConnect(workflow, { node: 'b', port: 'text' }, { node: 'a', port: 'prompt' })
  assert.equal(result.ok, false)
  assert.equal(result.code, 'CYCLE')
})

test('type compatibility matrix', () => {
  assert.equal(typeCompatible('text', 'text'), true)
  assert.equal(typeCompatible('text', 'json'), true)
  assert.equal(typeCompatible('json', 'text'), true)
  assert.equal(typeCompatible('number', 'text'), true)
  assert.equal(typeCompatible('text', 'number'), true)
  assert.equal(typeCompatible('number', 'boolean'), false)
  assert.equal(typeCompatible('any', 'number'), true)
})

test('canConnect rejects self links, missing ports and incompatible types', () => {
  const workflow = wf([
    node('agent', 'a'),
    node('condition', 'c'),
  ])
  assert.equal(canConnect(workflow, { node: 'a', port: 'text' }, { node: 'a', port: 'prompt' }).code, 'SELF_LINK')
  assert.equal(canConnect(workflow, { node: 'a', port: 'nope' }, { node: 'c', port: 'value' }).code, 'PORT_MISSING')
  assert.equal(canConnect(workflow, { node: 'c', port: 'true' }, { node: 'a', port: 'prompt' }).ok, true)
})

test('canConnect replaces an occupied input only when asked', () => {
  const workflow = wf([
    node('input', 'n1'),
    node('input', 'n2'),
    node('template', 't'),
  ], [
    edge('e1', 'n1', 'value', 't', 'value'),
  ])
  const occupied = canConnect(workflow, { node: 'n2', port: 'value' }, { node: 't', port: 'value' })
  assert.equal(occupied.ok, false)
  assert.equal(occupied.code, 'INPUT_OCCUPIED')
  const replaced = canConnect(workflow, { node: 'n2', port: 'value' }, { node: 't', port: 'value' }, { replace: true })
  assert.equal(replaced.ok, true)
  assert.equal(replaced.replaceEdge.id, 'e1')
})

test('resolveNodeInputs uses upstream values, defaults and required flags', () => {
  const workflow = wf([
    node('condition', 'c'),
    node('template', 't'),
    node('output', 'o'),
  ], [
    edge('e1', 'c', 'true', 't', 'value'),
    edge('e2', 't', 'text', 'o', 'value'),
  ])
  const values = { c: { true: 'hello' }, t: { text: 'HELLO' } }
  const templateInputs = resolveNodeInputs(workflow, workflow.nodes[1], values)
  assert.equal(templateInputs.inputs.value, 'hello')
  assert.deepEqual(templateInputs.missing, [])
  const outputInputs = resolveNodeInputs(workflow, workflow.nodes[2], values)
  assert.equal(outputInputs.inputs.value, 'HELLO')
  assert.deepEqual(outputInputs.missing, [])
})

test('resolveNodeInputs reports a missing required value', () => {
  const workflow = wf([node('condition', 'c'), node('output', 'o')])
  const result = resolveNodeInputs(workflow, workflow.nodes[1], {})
  assert.deepEqual(result.missing, ['value'])
})
