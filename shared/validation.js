/**
 * Workflow normalization and validation.
 *
 * `normalizeWorkflow` is permissive (fills ids/defaults) so imported documents
 * can be repaired; `validateWorkflow` is strict and returns structured issues.
 */

import {
  DEFAULT_WORKFLOW_SETTINGS,
  LIMITS,
  MAX_CONCURRENCY,
  MIN_CONCURRENCY,
  SCHEMA_VERSION,
  clampConcurrency,
  makeId,
} from './constants.js'
import { canConnect, topologicalOrder } from './graph.js'
import {
  getInputs,
  getNodeType,
  hasNodeType,
  normalizeConfig,
  normalizePosition,
} from './node-types.js'
import { isPlainObject } from './values.js'

/** Create a blank workflow. */
export function createEmptyWorkflow(name = 'Untitled workflow', options = {}) {
  const now = options.now ?? Date.now()
  return {
    schemaVersion: SCHEMA_VERSION,
    id: options.id || makeId('wf'),
    name,
    description: options.description ?? '',
    createdAt: now,
    updatedAt: now,
    nodes: options.nodes ?? [],
    edges: options.edges ?? [],
    settings: { ...DEFAULT_WORKFLOW_SETTINGS, ...(options.settings ?? {}) },
  }
}

/** Normalize a workflow document without validating graph semantics. */
export function normalizeWorkflow(input, options = {}) {
  const now = options.now ?? Date.now()
  const raw = isPlainObject(input) ? input : {}
  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : []
  const rawEdges = Array.isArray(raw.edges) ? raw.edges : []

  const nodes = rawNodes.map((node, index) => normalizeNode(node, index))
  const edges = rawEdges.map((edge, index) => normalizeEdgeInput(edge, index))

  const settings = isPlainObject(raw.settings) ? raw.settings : {}
  return {
    ...raw,
    schemaVersion: SCHEMA_VERSION,
    id: typeof raw.id === 'string' && raw.id ? raw.id : makeId('wf'),
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Untitled workflow',
    description: typeof raw.description === 'string' ? raw.description : '',
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : now,
    updatedAt: now,
    nodes,
    edges,
    settings: {
      ...DEFAULT_WORKFLOW_SETTINGS,
      ...settings,
      concurrency: clampConcurrency(settings.concurrency, DEFAULT_WORKFLOW_SETTINGS.concurrency),
    },
  }
}

function normalizeNode(node, index) {
  const raw = isPlainObject(node) ? node : {}
  const type = typeof raw.type === 'string' ? raw.type : ''
  const known = hasNodeType(type)
  return {
    ...raw,
    id: typeof raw.id === 'string' && raw.id ? raw.id : makeId('n', () => (index + 1) / 1000),
    type,
    title:
      typeof raw.title === 'string' && raw.title.trim()
        ? raw.title
        : known
          ? getNodeType(type).title
          : 'Unknown node',
    position: normalizePosition(raw.position),
    config: known ? normalizeConfig(type, raw.config) : isPlainObject(raw.config) ? raw.config : {},
    disabled: raw.disabled === true,
  }
}

function normalizeEdgeInput(edge, index) {
  const raw = isPlainObject(edge) ? edge : {}
  return {
    ...raw,
    id: typeof raw.id === 'string' && raw.id ? raw.id : makeId('e', () => (index + 1) / 1000),
    from: {
      node: String(raw.from?.node ?? ''),
      port: String(raw.from?.port ?? ''),
    },
    to: {
      node: String(raw.to?.node ?? ''),
      port: String(raw.to?.port ?? ''),
    },
  }
}

/**
 * Validate a normalized workflow.
 * @returns {{ ok: boolean, issues: Array<object> }}
 */
export function validateWorkflow(workflow) {
  const issues = []
  const error = (code, message, extra = {}) => issues.push({ severity: 'error', code, message, ...extra })
  const warn = (code, message, extra = {}) => issues.push({ severity: 'warning', code, message, ...extra })

  if (!isPlainObject(workflow)) {
    error('WORKFLOW_INVALID', 'Workflow must be a JSON object.')
    return result(issues)
  }
  if (workflow.schemaVersion !== SCHEMA_VERSION) {
    error('SCHEMA_VERSION', `Unsupported workflow schemaVersion ${String(workflow.schemaVersion)}; expected ${SCHEMA_VERSION}.`)
  }
  if (typeof workflow.id !== 'string' || !workflow.id) error('WORKFLOW_ID', 'Workflow id is required.')
  if (typeof workflow.name !== 'string' || !workflow.name.trim()) error('WORKFLOW_NAME', 'Workflow name is required.')
  if (workflow.description !== undefined && typeof workflow.description !== 'string') {
    error('WORKFLOW_DESCRIPTION', 'Workflow description must be a string.')
  }

  const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : null
  const edges = Array.isArray(workflow.edges) ? workflow.edges : null
  if (!nodes) error('NODES_INVALID', 'workflow.nodes must be an array.')
  if (!edges) error('EDGES_INVALID', 'workflow.edges must be an array.')
  if (!nodes || !edges) return result(issues)

  if (nodes.length > LIMITS.maxNodes) error('NODE_LIMIT', `Workflow has ${nodes.length} nodes; the limit is ${LIMITS.maxNodes}.`)
  if (edges.length > LIMITS.maxEdges) error('EDGE_LIMIT', `Workflow has ${edges.length} edges; the limit is ${LIMITS.maxEdges}.`)

  const nodeById = new Map()
  for (const [index, node] of nodes.entries()) {
    if (!isPlainObject(node)) {
      error('NODE_INVALID', `nodes[${index}] must be an object.`)
      continue
    }
    if (typeof node.id !== 'string' || !node.id) {
      error('NODE_ID', `nodes[${index}] is missing an id.`)
    } else if (nodeById.has(node.id)) {
      error('NODE_ID_DUPLICATE', `Duplicate node id "${node.id}".`, { nodeId: node.id })
    } else {
      nodeById.set(node.id, node)
    }
    if (typeof node.type !== 'string' || !hasNodeType(node.type)) {
      error('NODE_TYPE_UNKNOWN', `Node "${node.id}" has unknown type "${String(node.type)}".`, { nodeId: node.id })
      continue
    }
    if (typeof node.title !== 'string' || !node.title.trim()) {
      warn('NODE_TITLE', `Node "${node.id}" has no title.`, { nodeId: node.id })
    }
    if (!node.position || !Number.isFinite(node.position.x) || !Number.isFinite(node.position.y)) {
      warn('NODE_POSITION', `Node "${node.id}" has an invalid position.`, { nodeId: node.id })
    }
    if (!isPlainObject(node.config)) {
      error('NODE_CONFIG', `Node "${node.id}" config must be an object.`, { nodeId: node.id })
    } else {
      const def = getNodeType(node.type)
      const known = new Set(def.fields.map(field => field.key))
      for (const key of Object.keys(node.config)) {
        if (!known.has(key)) {
          warn('CONFIG_UNKNOWN_FIELD', `Node "${node.id}" has unknown config field "${key}".`, {
            nodeId: node.id,
            port: key,
          })
        }
      }
    }
  }

  const edgeIds = new Set()
  const occupiedInputs = new Map()
  for (const [index, edge] of edges.entries()) {
    if (!isPlainObject(edge)) {
      error('EDGE_INVALID', `edges[${index}] must be an object.`)
      continue
    }
    if (typeof edge.id !== 'string' || !edge.id) {
      error('EDGE_ID', `edges[${index}] is missing an id.`)
    } else if (edgeIds.has(edge.id)) {
      error('EDGE_ID_DUPLICATE', `Duplicate edge id "${edge.id}".`)
    } else {
      edgeIds.add(edge.id)
    }
    const fromNode = nodeById.get(edge.from?.node)
    const toNode = nodeById.get(edge.to?.node)
    if (!fromNode) {
      error('EDGE_FROM_NODE', `Edge "${edge.id}" references missing source node "${String(edge.from?.node)}".`)
      continue
    }
    if (!toNode) {
      error('EDGE_TO_NODE', `Edge "${edge.id}" references missing target node "${String(edge.to?.node)}".`)
      continue
    }
    if (!hasNodeType(fromNode.type) || !hasNodeType(toNode.type)) continue

    const check = canConnect(workflow, edge.from, edge.to, { replace: false, ignoreEdgeId: edge.id })
    if (!check.ok && check.code !== 'INPUT_OCCUPIED') {
      error(`EDGE_${check.code}`, `Edge "${edge.id}": ${check.reason}`, { nodeId: toNode.id, port: edge.to?.port })
      continue
    }
    if (check.code === 'INPUT_OCCUPIED') {
      error(
        'EDGE_INPUT_OCCUPIED',
        `Input "${edge.to.port}" on node "${toNode.id}" has more than one incoming edge.`,
        { nodeId: toNode.id, port: edge.to?.port },
      )
      continue
    }
    occupiedInputs.set(`${toNode.id}:${edge.to.port}`, edge.id)
  }

  const topo = topologicalOrder(workflow)
  if (topo.cycle.length) {
    const cycle = topo.cycle.filter((id, i, arr) => i === 0 || id !== arr[i - 1])
    error('CYCLE', `Workflow contains a cycle: ${cycle.join(' → ')}.`, { nodeIds: cycle })
  }

  for (const node of nodes) {
    if (!isPlainObject(node) || !hasNodeType(node.type)) continue
    if (node.disabled) {
      warn('NODE_DISABLED', `Node "${node.title || node.id}" is disabled.`, { nodeId: node.id })
      continue
    }
    const inputs = getInputs(node.type, node.config)
    for (const port of inputs) {
      if (!port.required) continue
      const hasEdge = occupiedInputs.has(`${node.id}:${port.id}`)
      const hasDefault = port.default !== undefined
      if (!hasEdge && !hasDefault) {
        error(
          'REQUIRED_INPUT_UNCONNECTED',
          `Node "${node.title || node.id}" input "${port.label}" is required but not connected.`,
          { nodeId: node.id, port: port.id },
        )
      }
    }
  }

  if (!nodes.some(node => node?.type !== 'note')) {
    warn('EMPTY_WORKFLOW', 'Workflow has no executable nodes yet.')
  }

  const concurrency = workflow.settings?.concurrency
  if (concurrency !== undefined) {
    const n = Number(concurrency)
    if (!Number.isFinite(n) || n < MIN_CONCURRENCY || n > MAX_CONCURRENCY) {
      error('CONCURRENCY', `settings.concurrency must be between ${MIN_CONCURRENCY} and ${MAX_CONCURRENCY}.`)
    }
  }

  return result(issues)
}

function result(issues) {
  return { ok: !issues.some(issue => issue.severity === 'error'), issues }
}

/**
 * Validate run-time Input node values before scheduling. The workflow document
 * cannot know these values, so this is a separate check used by POST /runs.
 * @returns {{ ok: boolean, issues: Array<object> }}
 */
export function validateRunInputs(workflow, inputs = {}) {
  const issues = []
  for (const node of workflow?.nodes ?? []) {
    if (node?.type !== 'input') continue
    if (node.disabled) continue
    const required = node.config?.required !== false
    if (!required) continue
    const raw = inputs?.[node.id] ?? node.config?.defaultValue ?? ''
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      issues.push({
        severity: 'error',
        code: 'INPUT_REQUIRED',
        message: `Input "${node.config?.label || node.title || node.id}" is required.`,
        nodeId: node.id,
        port: 'value',
      })
    }
  }
  return { ok: issues.length === 0, issues }
}

/** Human-readable one-line summary for a set of issues. */
export function summarizeIssues(issues) {
  const errors = issues.filter(issue => issue.severity === 'error').length
  const warnings = issues.length - errors
  if (!errors && !warnings) return 'No issues.'
  return `${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}.`
}
