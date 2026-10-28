import { performance } from 'node:perf_hooks'
import { normalizeWorkflow, validateWorkflow, createEmptyWorkflow } from '../shared/validation.js'
import { buildGraphIndex } from '../shared/graph.js'
import { createNode } from '../shared/node-types.js'

const NODES = 200
const EDGES = 500
const nodes = []
for (let i = 0; i < NODES; i += 1) {
  nodes.push(createNode('merge', {
    id: `n_${i}`,
    position: { x: (i % 20) * 300, y: Math.floor(i / 20) * 180 },
    config: { mode: 'first' },
  }))
}
const ports = ['a', 'b', 'c', 'd']
const used = new Map()
const edges = []
let seed = 17
const rand = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648
  return seed / 2147483648
}
for (let i = 0; edges.length < EDGES && i < EDGES * 50; i += 1) {
  const to = 1 + Math.floor(rand() * (NODES - 1))
  const from = Math.floor(rand() * to)
  const port = ports.find(candidate => !used.has(`${to}:${candidate}`))
  if (!port) continue
  used.set(`${to}:${port}`, true)
  edges.push({ id: `e_${edges.length}`, from: { node: `n_${from}`, port: 'value' }, to: { node: `n_${to}`, port } })
}
const workflow = createEmptyWorkflow('bench', { id: 'wf_bench', nodes, edges })
const json = JSON.stringify(workflow)
const t0 = performance.now()
const parsed = JSON.parse(json)
const normalized = normalizeWorkflow(parsed)
const tNorm = performance.now()
const report = validateWorkflow(normalized)
const tValidate = performance.now()
const index = buildGraphIndex(normalized)
const tIndex = performance.now()
console.log(JSON.stringify({
  nodes: nodes.length,
  edges: edges.length,
  valid: report.ok,
  issues: report.issues.length,
  parseMs: +(tNorm - t0).toFixed(2),
  validateMs: +(tValidate - tNorm).toFixed(2),
  indexMs: +(tIndex - tValidate).toFixed(2),
  indexNodes: index.nodeById.size,
}, null, 2))
if (!report.ok) process.exitCode = 1
if (tIndex - t0 > 2000) process.exitCode = 1
