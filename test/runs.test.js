import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createStore } from '../lib/core/store.js'
import { createRunManager } from '../lib/core/runs.js'
import { createEmptyWorkflow } from '../shared/validation.js'
import { createNode } from '../shared/node-types.js'

function workflow(id) {
  return createEmptyWorkflow('queue test', {
    id,
    nodes: [createNode('agent', { id: 'a', position: { x: 0, y: 0 }, config: { prompt: 'wait', timeoutMs: 5000 } })],
    edges: [],
    settings: { concurrency: 1 },
  })
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

function makeManager(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'cueflow-runs-'))
  const store = createStore({ rootDir: root })
  const gates = []
  const release = () => {
    const next = gates.shift()
    if (next) next()
  }
  const adapters = {
    async executeNode(_node, _inputs, ctx) {
      await Promise.race([
        new Promise(resolve => gates.push(resolve)),
        delay(5000, ctx.signal),
      ])
      return { outputs: { text: 'ok', json: null } }
    },
  }
  const runs = createRunManager({ store, adapters, maxActiveRuns: 1, maxWallClockMs: 0, ...overrides })
  return { root, store, runs, release }
}

async function waitFor(runs, id, statuses = ['completed', 'error', 'cancelled']) {
  const deadline = Date.now() + 3000
  while (Date.now() < deadline) {
    const found = runs.get(id)
    if (found && statuses.includes(found.run.status)) return found.run
    await new Promise(resolve => setTimeout(resolve, 15))
  }
  throw new Error(`run ${id} did not settle`)
}

test('global queue runs at most one active run and promotes the next', async () => {
  const app = makeManager()
  try {
    const first = await app.runs.start({ workflow: workflow('wf_q1') })
    const second = await app.runs.start({ workflow: workflow('wf_q2') })
    assert.equal(first.status, 'running')
    assert.equal(second.status, 'queued')
    assert.equal(app.runs.activeCount(), 1)
    assert.equal(app.runs.queueCount(), 1)
    assert.equal(app.runs.get(second.id).run.queuePosition, 1)
    const activeList = app.runs.list(10)
    assert.equal(activeList.runs.find(row => row.id === first.id).status, 'running')
    assert.equal(activeList.runs.find(row => row.id === second.id).status, 'queued')

    app.release()
    const doneFirst = await waitFor(app.runs, first.id)
    assert.equal(doneFirst.status, 'completed')
    await waitFor(app.runs, second.id, ['running'])
    app.release()
    const doneSecond = await waitFor(app.runs, second.id)
    assert.equal(doneSecond.status, 'completed')
  } finally {
    await app.runs.dispose()
    rmSync(app.root, { recursive: true, force: true })
  }
})

test('a queued run can be cancelled before it starts', async () => {
  const app = makeManager()
  try {
    const first = await app.runs.start({ workflow: workflow('wf_c1') })
    const second = await app.runs.start({ workflow: workflow('wf_c2') })
    assert.equal(second.status, 'queued')
    const cancelled = app.runs.cancel(second.id)
    assert.equal(cancelled.status, 'cancelled')
    assert.equal(app.runs.queueCount(), 0)
    const persisted = app.store.readRun(second.id)
    assert.equal(persisted.status, 'cancelled')
    app.release()
    await waitFor(app.runs, first.id)
  } finally {
    await app.runs.dispose()
    rmSync(app.root, { recursive: true, force: true })
  }
})

test('wall-clock budget ends a running run with RUN_BUDGET_EXCEEDED', async () => {
  const app = makeManager({ maxWallClockMs: 30 })
  try {
    const run = await app.runs.start({ workflow: workflow('wf_budget') })
    const settled = await waitFor(app.runs, run.id)
    assert.equal(settled.status, 'error')
    assert.equal(settled.error.code, 'RUN_BUDGET_EXCEEDED')
    assert.ok(app.store.readRun(run.id).events.some(event => event.type === 'run/budget'))
  } finally {
    await app.runs.dispose()
    rmSync(app.root, { recursive: true, force: true })
  }
})
