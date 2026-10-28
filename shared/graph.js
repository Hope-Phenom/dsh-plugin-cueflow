/**
 * Pure graph utilities. No React, no Node APIs, no DSH imports.
 */

import { PORT_TYPES } from './constants.js'
import { estimateNodeHeight, findPort, getInputs, getOutputs, normalizePosition } from './node-types.js'

/** Build lookup structures once per run/validation. */
export function buildGraphIndex(workflow) {
  const nodes = Array.isArray(workflow?.nodes) ? workflow.nodes : []
  const edges = Array.isArray(workflow?.edges) ? workflow.edges : []
  const nodeById = new Map()
  const edgeById = new Map()
  /** @type {Map<string, Map<string, object>>} */
  const incoming = new Map()
  /** @type {Map<string, object[]>} */
  const outgoing = new Map()
  /** @type {Map<string, Set<string>>} */
  const incomingNodes = new Map()
  /** @type {Map<string, Set<string>>} */
  const outgoingNodes = new Map()

  for (const node of nodes) {
    nodeById.set(node.id, node)
    incoming.set(node.id, new Map())
    outgoing.set(node.id, [])
    incomingNodes.set(node.id, new Set())
    outgoingNodes.set(node.id, new Set())
  }

  for (const edge of edges) {
    if (!edge || !edge.id) continue
    edgeById.set(edge.id, edge)
    const fromId = edge.from?.node
    const toId = edge.to?.node
    if (nodeById.has(fromId)) {
      outgoing.get(fromId).push(edge)
      outgoingNodes.get(fromId)?.add(toId)
    }
    if (nodeById.has(toId)) {
      incoming.get(toId).set(edge.to?.port, edge)
      incomingNodes.get(toId)?.add(fromId)
    }
  }

  return { nodes, edges, nodeById, edgeById, incoming, outgoing, incomingNodes, outgoingNodes }
}

/** Compare nodes deterministically by position then id. */
export function compareNodes(a, b) {
  const ax = Number(a?.position?.x) || 0
  const bx = Number(b?.position?.x) || 0
  if (ax !== bx) return ax - bx
  const ay = Number(a?.position?.y) || 0
  const by = Number(b?.position?.y) || 0
  if (ay !== by) return ay - by
  return String(a?.id ?? '').localeCompare(String(b?.id ?? ''))
}

/**
 * Kahn topological order. Deterministic for the same document.
 * @returns {{ order: object[], cycle: string[] }}
 */
export function topologicalOrder(workflow) {
  const index = buildGraphIndex(workflow)
  const indegree = new Map()
  for (const node of index.nodes) {
    indegree.set(node.id, new Set(index.incomingNodes.get(node.id) ?? []).size)
  }

  const queue = index.nodes.filter(node => indegree.get(node.id) === 0).sort(compareNodes)
  const order = []
  while (queue.length) {
    const node = queue.shift()
    order.push(node)
    const targets = [...(index.outgoingNodes.get(node.id) ?? [])]
      .map(id => index.nodeById.get(id))
      .filter(Boolean)
      .sort(compareNodes)
    for (const target of targets) {
      const next = indegree.get(target.id) - 1
      indegree.set(target.id, next)
      if (next === 0) {
        queue.push(target)
        queue.sort(compareNodes)
      }
    }
  }

  if (order.length !== index.nodes.length) {
    const settled = new Set(order.map(node => node.id))
    const cycle = findCycle(index, [...index.nodes.filter(n => !settled.has(n.id)).map(n => n.id)])
    return { order, cycle: cycle.length ? cycle : index.nodes.filter(n => !settled.has(n.id)).map(n => n.id) }
  }
  return { order, cycle: [] }
}

/** DFS cycle finder; returns a path of node ids (first === last) or []. */
export function findCycle(index, candidates) {
  const state = new Map()
  const stack = []
  const allowed = new Set(candidates)

  function visit(id) {
    state.set(id, 1)
    stack.push(id)
    const next = [...(index.outgoingNodes.get(id) ?? [])]
      .filter(target => allowed.size === 0 || allowed.has(target))
      .sort()
    for (const target of next) {
      if (!index.nodeById.has(target)) continue
      if (state.get(target) === 1) {
        const start = stack.indexOf(target)
        return [...stack.slice(start), target]
      }
      if (!state.has(target)) {
        const found = visit(target)
        if (found.length) return found
      }
    }
    stack.pop()
    state.set(id, 2)
    return []
  }

  for (const id of [...candidates].sort()) {
    if (!state.has(id)) {
      const found = visit(id)
      if (found.length) return found
    }
  }
  return []
}

/** Detect a cycle in a workflow; returns a node-id path or null. */
export function detectCycle(workflow) {
  const index = buildGraphIndex(workflow)
  const cycle = findCycle(index, index.nodes.map(node => node.id))
  return cycle.length ? cycle : null
}

/** Would adding fromNode -> toNode create a cycle? */
export function wouldCreateCycle(workflow, fromNodeId, toNodeId) {
  if (fromNodeId === toNodeId) return true
  const index = buildGraphIndex(workflow)
  const seen = new Set()
  const stack = [toNodeId]
  while (stack.length) {
    const id = stack.pop()
    if (id === fromNodeId) return true
    if (seen.has(id)) continue
    seen.add(id)
    for (const next of index.outgoingNodes.get(id) ?? []) {
      if (!seen.has(next)) stack.push(next)
    }
  }
  return false
}

/** Static port-type compatibility matrix. */
export function typeCompatible(fromType, toType) {
  if (!PORT_TYPES.includes(fromType) || !PORT_TYPES.includes(toType)) return false
  if (fromType === toType) return true
  if (fromType === 'any' || toType === 'any') return true
  const allowed = new Set([
    'text->json',
    'json->text',
    'number->text',
    'boolean->text',
    'text->number',
    'text->boolean',
    'json->number',
    'json->boolean',
  ])
  return allowed.has(`${fromType}->${toType}`)
}

/**
 * Validate one proposed connection.
 * @returns {{ ok: boolean, code?: string, reason?: string, replaceEdge?: object }}
 */
export function canConnect(workflow, from, to, options = {}) {
  const index = buildGraphIndex(workflow)
  const fromNode = index.nodeById.get(from?.node)
  const toNode = index.nodeById.get(to?.node)
  if (!fromNode || !toNode) return { ok: false, code: 'NODE_MISSING', reason: 'Node does not exist.' }
  if (fromNode.id === toNode.id) return { ok: false, code: 'SELF_LINK', reason: 'A node cannot connect to itself.' }

  const fromPort = findPort(fromNode.type, fromNode.config, from?.port, 'out')
  const toPort = findPort(toNode.type, toNode.config, to?.port, 'in')
  if (!fromPort) return { ok: false, code: 'PORT_MISSING', reason: `Output port "${from?.port}" does not exist.` }
  if (!toPort) return { ok: false, code: 'PORT_MISSING', reason: `Input port "${to?.port}" does not exist.` }
  if (!typeCompatible(fromPort.type, toPort.type)) {
    return {
      ok: false,
      code: 'TYPE_MISMATCH',
      reason: `${fromPort.type} cannot connect to ${toPort.type}.`,
    }
  }
  if (wouldCreateCycle(workflow, fromNode.id, toNode.id)) {
    return { ok: false, code: 'CYCLE', reason: 'That connection would create a cycle.' }
  }

  const existing = index.incoming.get(toNode.id)?.get(toPort.id)
  if (existing && options.ignoreEdgeId && existing.id === options.ignoreEdgeId) {
    return { ok: true }
  }
  if (existing && !options.replace) {
    return {
      ok: false,
      code: 'INPUT_OCCUPIED',
      reason: `Input "${toPort.label}" is already connected.`,
      replaceEdge: existing,
    }
  }
  if (existing && options.replace) {
    return { ok: true, replaceEdge: existing }
  }
  return { ok: true }
}

/** All edges feeding one node. */
export function incomingEdges(workflow, nodeId) {
  return (workflow?.edges ?? []).filter(edge => edge.to?.node === nodeId)
}

/** All edges leaving one node. */
export function outgoingEdges(workflow, nodeId) {
  return (workflow?.edges ?? []).filter(edge => edge.from?.node === nodeId)
}

/**
 * Resolve a node's incoming values from upstream outputs.
 * @param {object} node
 * @param {Record<string, Record<string, unknown>>} values - values[nodeId][portId]
 * @returns {{ inputs: Record<string, unknown>, missing: string[], sources: Record<string, {node:string,port:string} | null> }}
 */
export function resolveNodeInputs(workflow, node, values) {
  const inputs = {}
  const missing = []
  const sources = {}
  const incoming = new Map(
    (workflow.edges ?? [])
      .filter(edge => edge.to?.node === node.id)
      .map(edge => [edge.to.port, edge]),
  )

  for (const port of getInputs(node.type, node.config)) {
    const edge = incoming.get(port.id)
    if (edge) {
      const value = values?.[edge.from.node]?.[edge.from.port]
      sources[port.id] = { node: edge.from.node, port: edge.from.port }
      if (value === undefined) {
        if (port.required) missing.push(port.id)
        else inputs[port.id] = undefined
      } else {
        inputs[port.id] = value
      }
      continue
    }

    sources[port.id] = null
    const fallback = port.default
    if (fallback !== undefined) {
      inputs[port.id] = fallback
    } else if (port.required) {
      missing.push(port.id)
    } else {
      inputs[port.id] = undefined
    }
  }

  return { inputs, missing, sources }
}

/** Outputs that have a value for a node result. */
export function definedOutputs(node, outputs) {
  const result = {}
  for (const port of getOutputs(node.type, node.config)) {
    if (outputs && outputs[port.id] !== undefined) result[port.id] = outputs[port.id]
  }
  return result
}

/** Rough world-space port anchor, used before DOM measurement. */
export function estimatePortPosition(node, portId, direction) {
  const ports = direction === 'in' ? getInputs(node.type, node.config) : getOutputs(node.type, node.config)
  const index = Math.max(0, ports.findIndex(port => port.id === portId))
  const height = estimateNodeHeight(node.type, node.config)
  return {
    x: normalizePosition(node.position).x + (direction === 'in' ? 0 : 264),
    y: normalizePosition(node.position).y + 36 + 12 + index * 24,
    height,
  }
}

/** Ensure an edge id exists and endpoints are structured. */
export function normalizeEdge(edge) {
  return {
    id: typeof edge?.id === 'string' && edge.id ? edge.id : '',
    from: { node: String(edge?.from?.node ?? ''), port: String(edge?.from?.port ?? '') },
    to: { node: String(edge?.to?.node ?? ''), port: String(edge?.to?.port ?? '') },
  }
}
