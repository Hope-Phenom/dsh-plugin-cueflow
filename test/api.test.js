import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createStore } from '../lib/core/store.js'
import { createAdapters } from '../lib/core/adapters.js'
import { createCatalog } from '../lib/core/catalog.js'
import { createRunManager } from '../lib/core/runs.js'
import { createRoute } from '../lib/core/api.js'
import { createEmptyWorkflow } from '../shared/validation.js'
import { createNode } from '../shared/node-types.js'

function node(type, id, x = 0, config = {}) {
  return createNode(type, { id, position: { x, y: 0 }, config })
}

function edge(id, from, fromPort, to, toPort) {
  return { id, from: { node: from, port: fromPort }, to: { node: to, port: toPort } }
}

function simpleWorkflow() {
  return createEmptyWorkflow('test flow', {
    id: 'wf_api_test',
    nodes: [
      node('input', 'n1', 0, { defaultValue: 'hello' }),
      node('template', 'n2', 100, { template: '{{input}}' }),
      node('output', 'n3', 200, { name: 'Result' }),
    ],
    edges: [
      edge('e1', 'n1', 'value', 'n2', 'value'),
      edge('e2', 'n2', 'text', 'n3', 'value'),
    ],
    settings: { concurrency: 2 },
  })
}

function servicesState() {
  const parent = { id: 'session-test', status: 'idle', options: { provider: 'p', model: 'm' }, session: { header: { cwd: process.cwd() } } }
  const state = {
    agents: { list: () => [parent], get: id => (id === parent.id ? parent : undefined) },
    skills: {
      snapshot: async () => ({
        skills: [{ name: 'code-review', description: 'Review', source: 'user-dsh', invocation: { modelInvocable: false, userInvocable: true } }],
        complete: true,
      }),
      get: async () => undefined,
      list: async () => [],
    },
    commands: { list: async () => [{ name: 'simplify', description: 'Clean up' }] },
    subagents: null,
    shell: null,
    fs: null,
  }
  return {
    get: () => ({ ...state }),
  }
}

async function makeServer(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'cueflow-api-'))
  const store = createStore({ rootDir: root })
  const services = servicesState()
  const adapters = overrides.adapters ?? createAdapters({ getServices: () => services.get() })
  const runs = createRunManager({ store, adapters })
  adapters.setRunWorkflow?.(request => runs.runNested(request))
  const catalog = createCatalog({ getServices: () => services.get() })
  const route = createRoute({ store, runs, catalog, services, version: 'test' })
  const server = createServer((req, res) => route(req, res))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    base: `http://127.0.0.1:${port}`,
    root,
    store,
    runs,
    services,
    async close() {
      await new Promise(resolve => server.close(resolve))
      await runs.dispose()
      rmSync(root, { recursive: true, force: true })
    },
  }
}

async function json(base, path, options = {}) {
  const response = await fetch(`${base}/api/dsh/dsh-plugin-cueflow${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', 'x-cueflow-request': '1', ...(options.headers ?? {}) },
  })
  const body = await response.json()
  return { response, body }
}

async function waitFor(base, id, statuses = ['completed', 'error', 'cancelled']) {
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    const { body } = await json(base, `/runs/${id}`)
    if (statuses.includes(body.run?.status)) return body
    await new Promise(resolve => setTimeout(resolve, 25))
  }
  throw new Error(`run ${id} did not settle`)
}

test('health, catalog and workflow CRUD', async () => {
  const app = await makeServer()
  try {
    const health = await json(app.base, '/health')
    assert.equal(health.response.status, 200)
    assert.equal(health.body.ok, true)
    assert.equal(health.body.capabilities.skills, true)

    const catalog = await json(app.base, '/catalog')
    assert.equal(catalog.response.status, 200)
    assert.equal(catalog.body.nodeTypes.length, 15)
    assert.equal(catalog.body.skills[0].name, 'code-review')
    assert.equal(catalog.body.skills[0].modelInvocable, false)
    assert.equal(catalog.body.commands[0].name, 'simplify')
    assert.equal(catalog.body.agents[0].id, 'session-test')
    assert.ok(catalog.body.templates.length >= 3)

    const workflow = simpleWorkflow()
    const saved = await json(app.base, '/workflows', { method: 'POST', body: JSON.stringify({ workflow }) })
    assert.equal(saved.response.status, 200, JSON.stringify(saved.body))
    assert.equal(saved.body.workflow.id, 'wf_api_test')

    const list = await json(app.base, '/workflows')
    assert.equal(list.body.workflows.length, 1)
    const read = await json(app.base, '/workflows/wf_api_test')
    assert.equal(read.body.workflow.name, 'test flow')

    const deleted = await json(app.base, '/workflows/wf_api_test', { method: 'DELETE' })
    assert.equal(deleted.response.status, 200)
    const missing = await json(app.base, '/workflows/wf_api_test')
    assert.equal(missing.response.status, 404)
  } finally {
    await app.close()
  }
})

test('workflow listing filters by workspace while keeping legacy items', async () => {
  const app = await makeServer()
  try {
    const a = simpleWorkflow()
    a.id = 'wf_ws_a'
    a.name = 'Workspace A'
    await json(app.base, '/workflows', { method: 'POST', body: JSON.stringify({ workflow: a, cwd: 'F:\\A' }) })
    const b = simpleWorkflow()
    b.id = 'wf_ws_b'
    b.name = 'Workspace B'
    await json(app.base, '/workflows', { method: 'POST', body: JSON.stringify({ workflow: b, cwd: 'F:\\B' }) })
    const legacy = simpleWorkflow()
    legacy.id = 'wf_ws_legacy'
    legacy.name = 'Legacy'
    await json(app.base, '/workflows', { method: 'POST', body: JSON.stringify({ workflow: legacy }) })

    const scoped = await json(app.base, `/workflows?workspace=${encodeURIComponent('F:\\A')}`)
    const ids = scoped.body.workflows.map(row => row.id)
    assert.ok(ids.includes('wf_ws_a'))
    assert.ok(!ids.includes('wf_ws_b'))
    assert.ok(ids.includes('wf_ws_legacy'))
  } finally {
    await app.close()
  }
})

test('workflow saves create versions and restore round-trips', async () => {
  const app = await makeServer()
  try {
    const workflow = simpleWorkflow()
    await json(app.base, '/workflows', { method: 'POST', body: JSON.stringify({ workflow }) })
    workflow.name = 'renamed flow'
    workflow.updatedAt = Date.now() + 1000
    await json(app.base, '/workflows', { method: 'POST', body: JSON.stringify({ workflow }) })

    const versions = await json(app.base, `/workflows/${workflow.id}/versions`)
    assert.equal(versions.response.status, 200)
    assert.equal(versions.body.versions.length, 1)
    const version = versions.body.versions[0].version
    const snapshot = await json(app.base, `/workflows/${workflow.id}/versions/${version}`)
    assert.equal(snapshot.body.workflow.name, 'test flow')

    const restored = await json(app.base, `/workflows/${workflow.id}/versions/${version}/restore`, { method: 'POST' })
    assert.equal(restored.response.status, 200)
    assert.equal(restored.body.workflow.name, 'test flow')
    const current = await json(app.base, `/workflows/${workflow.id}`)
    assert.equal(current.body.workflow.name, 'test flow')
  } finally {
    await app.close()
  }
})

test('a subflow node runs a saved child workflow', async () => {
  const app = await makeServer()
  try {
    const child = createEmptyWorkflow('child flow', {
      id: 'wf_child_test',
      nodes: [
        node('input', 'in', 0, { defaultValue: 'nested' }),
        node('template', 't', 100, { template: '{{input}}!' }),
        node('output', 'out', 200, { name: 'Result' }),
      ],
      edges: [
        edge('e1', 'in', 'value', 't', 'value'),
        edge('e2', 't', 'text', 'out', 'value'),
      ],
    })
    await json(app.base, '/workflows', { method: 'POST', body: JSON.stringify({ workflow: child }) })
    const parent = createEmptyWorkflow('parent flow', {
      id: 'wf_parent_test',
      nodes: [node('subflow', 'sub', 0, { workflowId: 'wf_child_test' })],
      edges: [],
    })
    const started = await json(app.base, '/runs', { method: 'POST', body: JSON.stringify({ workflow: parent }) })
    const settled = await waitFor(app.base, started.body.run.id)
    assert.equal(settled.run.status, 'completed', JSON.stringify(settled.run.error))
    assert.equal(settled.run.nodeStates.sub.status, 'success')
    assert.equal(settled.run.nodeStates.sub.outputs.json.out.value, 'nested!')
  } finally {
    await app.close()
  }
})

test('validation returns structured issues', async () => {
  const app = await makeServer()
  try {
    const workflow = simpleWorkflow()
    workflow.nodes[1].type = 'nope'
    const result = await json(app.base, '/validate', { method: 'POST', body: JSON.stringify({ workflow }) })
    assert.equal(result.response.status, 200)
    assert.equal(result.body.valid, false)
    assert.ok(result.body.issues.some(issue => issue.code === 'NODE_TYPE_UNKNOWN'))
  } finally {
    await app.close()
  }
})

test('a deterministic run completes and exposes output', async () => {
  const app = await makeServer()
  try {
    const result = await json(app.base, '/runs', {
      method: 'POST',
      body: JSON.stringify({ workflow: simpleWorkflow(), inputs: { n1: 'hi' } }),
    })
    assert.equal(result.response.status, 201, JSON.stringify(result.body))
    const settled = await waitFor(app.base, result.body.run.id)
    assert.equal(settled.run.status, 'completed')
    assert.equal(settled.run.triggeredBy, 'local')
    assert.equal(settled.run.outputs.n3.value, 'hi')
    assert.ok(settled.events.some(event => event.type === 'run/start'))
  } finally {
    await app.close()
  }
})

test('run bodies with a UTF-8 BOM are accepted', async () => {
  const app = await makeServer()
  try {
    const result = await json(app.base, '/runs', {
      method: 'POST',
      body: `\uFEFF${JSON.stringify({ workflow: simpleWorkflow(), inputs: { n1: 'bom' } })}`,
    })
    assert.equal(result.response.status, 201, JSON.stringify(result.body))
    const settled = await waitFor(app.base, result.body.run.id)
    assert.equal(settled.run.outputs.n3.value, 'bom')
  } finally {
    await app.close()
  }
})

test('missing required run input returns 422 before scheduling', async () => {
  const app = await makeServer()
  try {
    const result = await json(app.base, '/runs', {
      method: 'POST',
      body: JSON.stringify({ workflow: simpleWorkflow(), inputs: { n1: '' } }),
    })
    assert.equal(result.response.status, 422)
    assert.equal(result.body.code, 'VALIDATION_FAILED')
    assert.ok(result.body.details.issues.some(issue => issue.code === 'INPUT_REQUIRED'))
  } finally {
    await app.close()
  }
})

test('invalid workflow on save returns 422', async () => {
  const app = await makeServer()
  try {
    const result = await json(app.base, '/workflows', {
      method: 'POST',
      body: JSON.stringify({ workflow: { schemaVersion: 1, name: '', nodes: [{ type: 'nope' }], edges: [] } }),
    })
    assert.equal(result.response.status, 422)
    assert.equal(result.body.code, 'VALIDATION_FAILED')
    assert.ok(Array.isArray(result.body.details.issues))
  } finally {
    await app.close()
  }
})

test('path traversal ids are rejected', async () => {
  const app = await makeServer()
  try {
    const result = await json(app.base, '/workflows/..%2F..%2Fetc')
    assert.equal(result.response.status, 400)
    assert.equal(result.body.code, 'BAD_REQUEST')
  } finally {
    await app.close()
  }
})

test('mutating requests require the CueFlow CSRF header', async () => {
  const app = await makeServer()
  try {
    const response = await fetch(`${app.base}/api/dsh/dsh-plugin-cueflow/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workflow: simpleWorkflow() }),
    })
    assert.equal(response.status, 403)
    assert.equal((await response.json()).code, 'CSRF_REQUIRED')
  } finally {
    await app.close()
  }
})

test('cross-origin mutations and non-JSON bodies are rejected', async () => {
  const app = await makeServer()
  try {
    const crossOrigin = await fetch(`${app.base}/api/dsh/dsh-plugin-cueflow/runs`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-cueflow-request': '1',
        origin: 'https://evil.example',
      },
      body: JSON.stringify({ workflow: simpleWorkflow() }),
    })
    assert.equal(crossOrigin.status, 403)
    assert.equal((await crossOrigin.json()).code, 'ORIGIN_REJECTED')

    const textPlain = await fetch(`${app.base}/api/dsh/dsh-plugin-cueflow/runs`, {
      method: 'POST',
      headers: {
        'content-type': 'text/plain',
        'x-cueflow-request': '1',
      },
      body: JSON.stringify({ workflow: simpleWorkflow() }),
    })
    assert.equal(textPlain.status, 415)
    assert.equal((await textPlain.json()).code, 'UNSUPPORTED_MEDIA_TYPE')
  } finally {
    await app.close()
  }
})

test('shell approval pauses the run, then allows it once', async () => {
  const workflow = createEmptyWorkflow('approval flow', {
    id: 'wf_approval',
    nodes: [node('shell', 's', 0, { command: 'echo hi', approval: 'ask' })],
    edges: [],
  })
  const adapters = {
    async executeNode() {
      return { outputs: { stdout: 'hi', stderr: '', exitCode: 0, text: 'hi' } }
    },
  }
  const app = await makeServer({ adapters })
  try {
    const started = await json(app.base, '/runs', { method: 'POST', body: JSON.stringify({ workflow }) })
    assert.equal(started.response.status, 201, JSON.stringify(started.body))
    const runId = started.body.run.id

    let approval
    const deadline = Date.now() + 3000
    while (Date.now() < deadline) {
      const { body } = await json(app.base, `/runs/${runId}`)
      approval = Object.values(body.run?.approvals ?? {}).find(item => item.status === 'pending')
      if (approval) break
      await new Promise(resolve => setTimeout(resolve, 20))
    }
    assert.ok(approval, 'expected a pending approval')
    assert.equal(approval.action, 'shell')
    assert.equal(approval.detail.command, 'echo hi')

    const decided = await json(app.base, `/runs/${runId}/approvals/${approval.id}`, {
      method: 'POST',
      body: JSON.stringify({ decision: 'allow' }),
    })
    assert.equal(decided.response.status, 200, JSON.stringify(decided.body))
    assert.equal(decided.body.run.approvals[approval.id].status, 'allowed-once')

    const settled = await waitFor(app.base, runId)
    assert.equal(settled.run.status, 'completed')
    assert.equal(settled.run.nodeStates.s.status, 'success')
    assert.ok(settled.events.some(event => event.type === 'approval/asked'))
    assert.ok(settled.events.some(event => event.type === 'approval/decided'))
  } finally {
    await app.close()
  }
})

test('rejecting an approval fails the node', async () => {
  const workflow = createEmptyWorkflow('reject approval', {
    id: 'wf_reject',
    nodes: [node('shell', 's', 0, { command: 'echo no', approval: 'ask' })],
    edges: [],
  })
  const app = await makeServer({
    adapters: { async executeNode() { return { outputs: {} } } },
  })
  try {
    const started = await json(app.base, '/runs', { method: 'POST', body: JSON.stringify({ workflow }) })
    const runId = started.body.run.id
    let approval
    const deadline = Date.now() + 3000
    while (Date.now() < deadline) {
      const { body } = await json(app.base, `/runs/${runId}`)
      approval = Object.values(body.run?.approvals ?? {}).find(item => item.status === 'pending')
      if (approval) break
      await new Promise(resolve => setTimeout(resolve, 20))
    }
    assert.ok(approval)
    const decided = await json(app.base, `/runs/${runId}/approvals/${approval.id}`, {
      method: 'POST',
      body: JSON.stringify({ decision: 'reject' }),
    })
    assert.equal(decided.response.status, 200)
    const settled = await waitFor(app.base, runId)
    assert.equal(settled.run.status, 'error')
    assert.equal(settled.run.nodeStates.s.error.code, 'APPROVAL_REJECTED')
  } finally {
    await app.close()
  }
})

test('a failed run can resume from its failed node', async () => {
  const workflow = createEmptyWorkflow('rerun me', {
    id: 'wf_rerun',
    nodes: [node('shell', 's', 0, { command: 'echo retry', approval: 'allow' })],
    edges: [],
  })
  let calls = 0
  const adapters = {
    async executeNode() {
      calls += 1
      if (calls === 1) throw Object.assign(new Error('first attempt fails'), { code: 'TRANSIENT' })
      return { outputs: { stdout: 'retry', stderr: '', exitCode: 0, text: 'retry' } }
    },
  }
  const app = await makeServer({ adapters })
  try {
    const started = await json(app.base, '/runs', { method: 'POST', body: JSON.stringify({ workflow }) })
    const first = await waitFor(app.base, started.body.run.id)
    assert.equal(first.run.status, 'error')
    assert.equal(first.run.nodeStates.s.error.code, 'TRANSIENT')

    const resumed = await json(app.base, `/runs/${started.body.run.id}/rerun`, {
      method: 'POST',
      body: '{}',
    })
    assert.equal(resumed.response.status, 201, JSON.stringify(resumed.body))
    assert.equal(resumed.body.fromNodeId, 's')
    const second = await waitFor(app.base, resumed.body.run.id)
    assert.equal(second.run.status, 'completed')
    assert.equal(second.run.nodeStates.s.outputs.stdout, 'retry')
    assert.ok(calls >= 2)
  } finally {
    await app.close()
  }
})

test('a run can be cancelled while an agent node is waiting', async () => {
  const workflow = createEmptyWorkflow('cancel me', {
    id: 'wf_cancel',
    nodes: [node('agent', 'a', 0, { prompt: 'wait' })],
    edges: [],
  })
  const adapters = {
    async executeNode(_node, _inputs, ctx) {
      await new Promise((resolve, reject) => {
        ctx.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true })
      })
      return { outputs: {} }
    },
  }
  const app = await makeServer({ adapters })
  try {
    const started = await json(app.base, '/runs', { method: 'POST', body: JSON.stringify({ workflow }) })
    assert.equal(started.response.status, 201, JSON.stringify(started.body))
    await new Promise(resolve => setTimeout(resolve, 30))
    const cancelled = await json(app.base, `/runs/${started.body.run.id}/cancel`, { method: 'POST' })
    assert.equal(cancelled.response.status, 200)
    const settled = await waitFor(app.base, started.body.run.id)
    assert.equal(settled.run.status, 'cancelled')
    assert.equal(settled.run.nodeStates.a.status, 'cancelled')
  } finally {
    await app.close()
  }
})
