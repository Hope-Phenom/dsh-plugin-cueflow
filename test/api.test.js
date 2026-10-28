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
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
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
    assert.equal(catalog.body.nodeTypes.length, 11)
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
    assert.equal(settled.run.outputs.n3.value, 'hi')
    assert.ok(settled.events.some(event => event.type === 'run/start'))
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
