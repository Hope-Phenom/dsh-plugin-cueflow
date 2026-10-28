import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { createStore } from '../lib/core/store.js'
import { createRunManager } from '../lib/core/runs.js'
import { createEmptyWorkflow } from '../shared/validation.js'
import { createNode } from '../shared/node-types.js'

const root = mkdtempSync(join(tmpdir(), 'cueflow-bench-runs-'))
const store = createStore({ rootDir: root })
const runs = createRunManager({
  store,
  adapters: {
    async executeNode() {
      await new Promise(resolve => setTimeout(resolve, 25))
      return { outputs: { text: 'ok', json: null } }
    },
  },
  maxActiveRuns: 2,
  maxWallClockMs: 30_000,
})
try {
  const workflow = createEmptyWorkflow('run bench', {
    id: 'wf_run_bench',
    nodes: [createNode('agent', { id: 'a', position: { x: 0, y: 0 }, config: { prompt: 'x' } })],
    edges: [],
    settings: { concurrency: 1 },
  })
  const startedAt = performance.now()
  const started = await Promise.all(Array.from({ length: 10 }, () => runs.start({ workflow })))
  let peakActive = 0
  let peakQueue = 0
  while (runs.activeCount() || runs.queueCount()) {
    peakActive = Math.max(peakActive, runs.activeCount())
    peakQueue = Math.max(peakQueue, runs.queueCount())
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  const elapsed = performance.now() - startedAt
  const terminal = started.map(run => runs.get(run.id)?.run.status)
  console.log(JSON.stringify({
    runs: started.length,
    maxActiveRuns: 2,
    peakActive,
    peakQueue,
    elapsedMs: +elapsed.toFixed(1),
    terminal,
  }, null, 2))
  if (peakActive > 2 || terminal.some(status => status !== 'completed')) process.exitCode = 1
} finally {
  await runs.dispose()
  rmSync(root, { recursive: true, force: true })
}
