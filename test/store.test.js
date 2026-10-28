import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createStore } from '../lib/core/store.js'

test('migrateWorkflows upgrades pre-schema documents', () => {
  const root = mkdtempSync(join(tmpdir(), 'cueflow-migrate-'))
  const store = createStore({ rootDir: root })
  try {
    store.writeJson(join(store.paths().workflowsDir, 'wf_old.json'), {
      id: 'wf_old',
      name: 'Old workflow',
      nodes: [{ id: 'n1', type: 'input', position: { x: 1, y: 2 }, config: {} }],
      edges: [],
    })
    const migrated = store.migrateWorkflows()
    assert.deepEqual(migrated, ['wf_old'])
    const workflow = store.readWorkflow('wf_old')
    assert.equal(workflow.schemaVersion, 1)
    assert.equal(workflow.settings.concurrency, 2)
    assert.equal(workflow.nodes[0].config.valueType, 'text')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('run retention is configurable', () => {
  const root = mkdtempSync(join(tmpdir(), 'cueflow-retention-'))
  const store = createStore({ rootDir: root, runRetention: 2 })
  try {
    for (let i = 0; i < 4; i += 1) {
      store.writeRun({
        schemaVersion: 1,
        id: `run_ret_${i}`,
        workflowId: 'wf',
        workflowName: 'wf',
        status: 'completed',
        createdAt: i,
        endedAt: i,
        nodeStates: {},
        events: [],
      })
    }
    assert.equal(store.listRuns(10).runs.length, 2)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('migrateWorkflows leaves current and future schemas alone', () => {
  const root = mkdtempSync(join(tmpdir(), 'cueflow-migrate-'))
  const store = createStore({ rootDir: root })
  try {
    const current = { schemaVersion: 1, id: 'wf_current', name: 'Current', nodes: [], edges: [] }
    const future = { schemaVersion: 2, id: 'wf_future', name: 'Future', nodes: [], edges: [] }
    store.writeJson(join(store.paths().workflowsDir, 'wf_current.json'), current)
    store.writeJson(join(store.paths().workflowsDir, 'wf_future.json'), future)
    assert.deepEqual(store.migrateWorkflows(), [])
    assert.equal(store.readWorkflow('wf_current').name, 'Current')
    assert.equal(store.readWorkflow('wf_future').name, 'Future')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
