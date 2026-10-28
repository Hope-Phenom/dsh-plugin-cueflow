import test from 'node:test'
import assert from 'node:assert/strict'

import { createNode } from '../shared/node-types.js'
import { createRunRecord, executeRun } from '../lib/core/executor.js'

function node(type, id, x = 0, config = {}) {
  return createNode(type, { id, position: { x, y: 0 }, config })
}

function edge(id, from, fromPort, to, toPort) {
  return { id, from: { node: from, port: fromPort }, to: { node: to, port: toPort } }
}

function wf(nodes, edges = [], settings = { concurrency: 2 }) {
  return { schemaVersion: 1, id: 'wf_test', name: 'test', nodes, edges, settings }
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    }, { once: true })
  })
}

function makeExecutor(overrides = {}) {
  const stats = { active: 0, maxActive: 0 }
  const executeNode = async (node, inputs, ctx) => {
    stats.active += 1
    stats.maxActive = Math.max(stats.maxActive, stats.active)
    try {
      if (overrides[node.type]) return await overrides[node.type](node, inputs, ctx)
      switch (node.type) {
        case 'input':
          return { outputs: { value: ctx.run.inputs[node.id] ?? node.config.defaultValue } }
        case 'template':
          return { outputs: { text: `${inputs.value ?? ''}!` } }
        case 'condition':
          return { outputs: inputs.value ? { true: inputs.value } : { false: inputs.value } }
        case 'merge':
          return { outputs: { value: inputs.a ?? inputs.b ?? inputs.c ?? inputs.d } }
        case 'output':
          return { outputs: { value: inputs.value }, runOutput: { name: node.config.name, value: inputs.value } }
        case 'agent':
          await delay(Number(node.config.sleep ?? 1), ctx.signal)
          if (node.config.fail) throw Object.assign(new Error('agent failed'), { code: 'AGENT_FAILED' })
          return { outputs: { text: `agent:${inputs.prompt ?? ''}`, json: null } }
        default:
          return { outputs: {} }
      }
    } finally {
      stats.active -= 1
    }
  }
  return { executeNode, stats }
}

test('linear graph completes and collects output', async () => {
  const workflow = wf([
    node('input', 'n1', 0, { defaultValue: 'hello' }),
    node('template', 'n2', 100, { template: '{{input}}' }),
    node('output', 'n3', 200, { name: 'result' }),
  ], [
    edge('e1', 'n1', 'value', 'n2', 'value'),
    edge('e2', 'n2', 'text', 'n3', 'value'),
  ])
  const run = createRunRecord({ workflow, inputs: { n1: 'hi' } })
  const { executeNode } = makeExecutor()
  await executeRun(run, { executeNode, concurrency: 2 })
  assert.equal(run.status, 'completed')
  assert.equal(run.nodeStates.n1.status, 'success')
  assert.equal(run.nodeStates.n2.outputs.text, 'hi!')
  assert.equal(run.outputs.n3.value, 'hi!')
  assert.ok(run.events.some(event => event.type === 'run/start'))
  assert.ok(run.events.some(event => event.type === 'run/end'))
})

test('concurrency never exceeds the configured limit', async () => {
  const workflow = wf([
    node('agent', 'a', 0, { prompt: 'a', sleep: 40 }),
    node('agent', 'b', 100, { prompt: 'b', sleep: 40 }),
    node('agent', 'c', 200, { prompt: 'c', sleep: 40 }),
  ], [], { concurrency: 2 })
  const run = createRunRecord({ workflow })
  const { executeNode, stats } = makeExecutor()
  await executeRun(run, { executeNode, concurrency: 2 })
  assert.equal(run.status, 'completed')
  assert.equal(stats.maxActive, 2)
})

test('condition routes one branch and skips the other', async () => {
  const workflow = wf([
    node('input', 'n1', 0, { defaultValue: true }),
    node('condition', 'c', 100, { operator: 'truthy' }),
    node('output', 't', 200, { name: 'yes' }),
    node('output', 'f', 200, { name: 'no' }),
  ], [
    edge('e1', 'n1', 'value', 'c', 'value'),
    edge('e2', 'c', 'true', 't', 'value'),
    edge('e3', 'c', 'false', 'f', 'value'),
  ])
  const run = createRunRecord({ workflow })
  const { executeNode } = makeExecutor()
  await executeRun(run, { executeNode })
  assert.equal(run.status, 'completed')
  assert.equal(run.nodeStates.c.status, 'success')
  assert.equal(run.nodeStates.t.status, 'success')
  assert.equal(run.nodeStates.f.status, 'skipped')
  assert.equal(run.outputs.t.value, true)
  assert.equal(run.outputs.f, undefined)
})

test('missing required input skips a node without failing the run', async () => {
  const workflow = wf([
    node('condition', 'c', 0),
    node('output', 'o', 100),
  ], [
    edge('e1', 'c', 'true', 'o', 'value'),
  ])
  const run = createRunRecord({ workflow })
  const { executeNode } = makeExecutor()
  await executeRun(run, { executeNode })
  assert.equal(run.status, 'completed')
  assert.equal(run.nodeStates.o.status, 'skipped')
})

test('node failure fails the run and skips downstream work', async () => {
  const workflow = wf([
    node('agent', 'a', 0, { prompt: 'x', fail: true }),
    node('output', 'o', 100),
  ], [
    edge('e1', 'a', 'text', 'o', 'value'),
  ])
  const run = createRunRecord({ workflow })
  const { executeNode } = makeExecutor()
  await executeRun(run, { executeNode })
  assert.equal(run.status, 'error')
  assert.equal(run.nodeStates.a.status, 'error')
  assert.equal(run.nodeStates.a.error.code, 'AGENT_FAILED')
  assert.equal(run.nodeStates.o.status, 'skipped')
})

test('node timeout is reported as NODE_TIMEOUT', async () => {
  const workflow = wf([node('agent', 'a', 0, { prompt: 'x', sleep: 200, timeoutMs: 40 })])
  const run = createRunRecord({ workflow })
  const { executeNode } = makeExecutor()
  await executeRun(run, { executeNode })
  assert.equal(run.status, 'error')
  assert.equal(run.nodeStates.a.status, 'error')
  assert.equal(run.nodeStates.a.error.code, 'NODE_TIMEOUT')
})

test('cancellation marks running and pending nodes cancelled', async () => {
  const workflow = wf([
    node('agent', 'a', 0, { prompt: 'a', sleep: 200 }),
    node('agent', 'b', 100, { prompt: 'b', sleep: 200 }),
    node('output', 'o', 200),
  ], [
    edge('e1', 'a', 'text', 'o', 'value'),
    edge('e2', 'b', 'text', 'o', 'value'),
  ])
  const run = createRunRecord({ workflow })
  const { executeNode } = makeExecutor()
  const controller = new AbortController()
  const promise = executeRun(run, { executeNode, signal: controller.signal, concurrency: 2 })
  await delay(20)
  controller.abort()
  await promise
  assert.equal(run.status, 'cancelled')
  assert.equal(run.nodeStates.a.status, 'cancelled')
  assert.equal(run.nodeStates.b.status, 'cancelled')
  assert.equal(run.nodeStates.o.status, 'cancelled')
})

test('events are monotonic and filterable', async () => {
  const workflow = wf([node('agent', 'a', 0, { prompt: 'a' })])
  const run = createRunRecord({ workflow })
  const { executeNode } = makeExecutor()
  await executeRun(run, { executeNode })
  const seqs = run.events.map(event => event.seq)
  assert.deepEqual(seqs, [...seqs].sort((a, b) => a - b))
  const after = run.events.filter(event => event.seq > 0)
  assert.ok(after.length < run.events.length)
})

test('ask approval pauses a shell node and allows once', async () => {
  const workflow = wf([node('shell', 's', 0, { command: 'echo hi', approval: 'ask' })])
  const run = createRunRecord({ workflow })
  const { executeNode } = makeExecutor({
    shell: async () => ({ outputs: { stdout: 'hi', text: 'hi' } }),
  })
  let requested = null
  const requestApproval = async request => {
    requested = request
    return { id: 'apr_test', result: Promise.resolve('allowed-once') }
  }
  await executeRun(run, { executeNode, requestApproval })
  assert.equal(run.status, 'completed')
  assert.equal(run.nodeStates.s.status, 'success')
  assert.equal(requested.action, 'shell')
  assert.equal(requested.detail.command, 'echo hi')
  assert.equal(run.nodeStates.s.pendingApproval, null)
})

test('rejected approval fails the node and run', async () => {
  const workflow = wf([node('command', 'c', 0, { command: 'status', approval: 'ask' })])
  const run = createRunRecord({ workflow })
  const { executeNode } = makeExecutor()
  await executeRun(run, {
    executeNode,
    requestApproval: async () => ({ id: 'apr_reject', result: Promise.resolve('rejected') }),
  })
  assert.equal(run.status, 'error')
  assert.equal(run.nodeStates.c.status, 'error')
  assert.equal(run.nodeStates.c.error.code, 'APPROVAL_REJECTED')
})

test('deny approval never invokes the executor', async () => {
  const workflow = wf([node('shell', 's', 0, { command: 'echo hi', approval: 'deny' })])
  const run = createRunRecord({ workflow })
  let executed = false
  const { executeNode } = makeExecutor({
    shell: async () => {
      executed = true
      return { outputs: {} }
    },
  })
  await executeRun(run, { executeNode })
  assert.equal(executed, false)
  assert.equal(run.status, 'error')
  assert.equal(run.nodeStates.s.error.code, 'APPROVAL_DENIED')
})

test('ask approval fails closed when no approval channel exists', async () => {
  const workflow = wf([node('shell', 's', 0, { command: 'echo hi' })])
  const run = createRunRecord({ workflow })
  let executed = false
  const { executeNode } = makeExecutor({
    shell: async () => {
      executed = true
      return { outputs: {} }
    },
  })
  await executeRun(run, { executeNode })
  assert.equal(executed, false)
  assert.equal(run.status, 'error')
  assert.equal(run.nodeStates.s.error.code, 'APPROVAL_UNAVAILABLE')
})

test('cancelling while approval is pending cancels the node', async () => {
  const workflow = wf([node('shell', 's', 0, { command: 'echo hi' })])
  const run = createRunRecord({ workflow })
  const { executeNode } = makeExecutor()
  const controller = new AbortController()
  const requestApproval = async request => ({
    id: 'apr_cancel',
    result: new Promise(resolve => {
      request.signal.addEventListener('abort', () => resolve('cancelled'), { once: true })
    }),
  })
  const promise = executeRun(run, { executeNode, signal: controller.signal, requestApproval })
  await delay(20)
  assert.equal(run.nodeStates.s.status, 'waiting-approval')
  controller.abort()
  await promise
  assert.equal(run.status, 'cancelled')
  assert.equal(run.nodeStates.s.status, 'cancelled')
})

test('disabled nodes are skipped', async () => {
  const workflow = wf([node('agent', 'a', 0, { prompt: 'a' })])
  workflow.nodes[0].disabled = true
  const run = createRunRecord({ workflow })
  const { executeNode } = makeExecutor()
  await executeRun(run, { executeNode })
  assert.equal(run.status, 'completed')
  assert.equal(run.nodeStates.a.status, 'skipped')
})
