/**
 * DAG scheduler for CueFlow runs.
 *
 * The executor is deliberately free of DSH imports: callers inject
 * `executeNode(node, inputs, context)`. This keeps the scheduler unit-testable
 * and lets the Host swap adapters without touching scheduling semantics.
 */

import {
  APPROVAL_MODES,
  APPROVAL_NODE_TYPES,
  DEFAULT_APPROVAL_TIMEOUT_MS,
  DEFAULT_TIMEOUTS,
  LIMITS,
  TERMINAL_NODE_STATUS,
  isTerminalNode,
  makeId,
} from '../../shared/constants.js'
import {
  compareNodes,
  definedOutputs,
  buildGraphIndex,
  resolveNodeInputs,
} from '../../shared/graph.js'
import { findPort, getInputs } from '../../shared/node-types.js'
import { coerceValue, previewValue, stringifyValue, truncateText } from '../../shared/values.js'

/** Create a mutable run record. */
export function createRunRecord({
  workflow,
  inputs = {},
  sessionId = '',
  cwd = '',
  runId,
  seedValues = {},
  now = Date.now,
}) {
  const at = now()
  const nodeStates = {}
  for (const node of workflow.nodes ?? []) {
    nodeStates[node.id] = {
      status: 'idle',
      startedAt: null,
      endedAt: null,
      durationMs: null,
      attempts: 0,
      outputs: {},
      preview: '',
      error: null,
      logs: [],
    }
  }
  for (const [nodeId, outputs] of Object.entries(seedValues ?? {})) {
    const state = nodeStates[nodeId]
    if (!state || !isPlainObject(outputs)) continue
    state.status = 'success'
    state.startedAt = null
    state.endedAt = at
    state.durationMs = 0
    state.attempts = 1
    state.outputs = truncateOutputs(outputs)
    state.preview = truncateText(makePreview(outputs), LIMITS.maxPreviewChars).text
  }
  return {
    schemaVersion: 1,
    id: runId || makeId('run'),
    workflowId: workflow.id,
    workflowName: workflow.name,
    workflowSnapshot: cloneJson(workflow),
    status: 'queued',
    inputs: { ...inputs },
    seedValues: cloneJson(seedValues ?? {}),
    sessionId,
    cwd,
    createdAt: at,
    startedAt: null,
    endedAt: null,
    nodeStates,
    approvals: {},
    budget: {
      maxWallClockMs: 0,
      maxAgentCalls: 0,
      maxTokens: 0,
      agentCalls: 0,
      tokens: 0,
      startedAt: null,
    },
    events: [],
    outputs: {},
    error: null,
  }
}

/**
 * Execute a run. Mutates `run` so pollers observe progress.
 *
 * @param {object} run
 * @param {object} options
 * @param {(node:object, inputs:object, ctx:object) => Promise<object>} options.executeNode
 * @param {AbortSignal=} options.signal
 * @param {number=} options.concurrency
 * @param {() => number=} options.now
 * @param {(event:object) => void=} options.onEvent
 * @param {(run:object) => void=} options.onUpdate
 * @param {(request:object) => Promise<{id:string,result:Promise<string>}>=} options.requestApproval
 * @returns {Promise<object>} the same run record
 */
export async function executeRun(run, options) {
  const {
    executeNode,
    signal,
    concurrency = 2,
    now = Date.now,
    onEvent,
    onUpdate,
    requestApproval,
    heartbeatMs = LIMITS.heartbeatMs,
  } = options
  const cancelPolicy = run.workflowSnapshot?.settings?.cancelPolicy === 'drain' ? 'drain' : 'abort-all'
  const workflow = run.workflowSnapshot
  run.budget = run.budget ?? { maxWallClockMs: 0, maxAgentCalls: 0, maxTokens: 0, agentCalls: 0, tokens: 0, startedAt: null }
  run.budget.agentCalls = Number(run.budget.agentCalls) || 0
  run.budget.tokens = Number(run.budget.tokens) || 0
  const index = buildGraphIndex(workflow)
  const values = isPlainObject(run.seedValues) ? cloneJson(run.seedValues) : {}
  const settled = new Set(Object.keys(values))
  const pending = new Set(
    (workflow.nodes ?? [])
      .filter(node => node.type !== 'note' && node.type !== 'group' && !settled.has(node.id))
      .map(node => node.id),
  )
  const running = new Map()
  let fatalError = null
  let externalAborted = signal?.aborted === true

  run.status = 'running'
  run.startedAt = now()
  pushEvent(run, 'run/start', 'Run started', { data: { runId: run.id, workflow: run.workflowName } }, now, onEvent)

  const onAbort = () => {
    externalAborted = true
  }
  signal?.addEventListener('abort', onAbort, { once: true })

  const update = () => {
    try {
      onUpdate?.(run)
    } catch {
      /* observers must not break a run */
    }
  }

  const settle = (nodeId, patch) => {
    const state = run.nodeStates[nodeId]
    if (!state) return
    Object.assign(state, patch)
    if (!state.endedAt) state.endedAt = now()
    if (state.startedAt && !state.durationMs) state.durationMs = state.endedAt - state.startedAt
    settled.add(nodeId)
    pending.delete(nodeId)
    update()
  }

  const skip = (nodeId, reason, message) => {
    if (settled.has(nodeId)) return
    pushEvent(run, 'node/skip', message || `Skipped: ${reason}`, { nodeId, data: { reason } }, now, onEvent)
    settle(nodeId, { status: 'skipped', error: null, preview: '' })
  }

  const fail = (nodeId, error) => {
    if (settled.has(nodeId)) return
    const normalized = normalizeError(error)
    if (!fatalError) fatalError = { ...normalized, nodeId }
    const state = run.nodeStates[nodeId]
    pushEvent(run, 'node/error', normalized.message, { nodeId, data: normalized }, now, onEvent)
    settle(nodeId, {
      status: 'error',
      error: normalized,
      preview: '',
    })
    if (state) state.error = normalized
  }

  const cancel = (nodeId, reason) => {
    if (settled.has(nodeId)) return
    pushEvent(run, 'node/skip', `Cancelled: ${reason}`, { nodeId, data: { reason, cancelled: true } }, now, onEvent)
    settle(nodeId, { status: 'cancelled', error: null, preview: '' })
  }

  const approveNode = async (node, inputs) => {
    const request = buildApprovalRequest(node, inputs)
    if (!request) return
    if (request.mode === 'deny') {
      throw approvalError('APPROVAL_DENIED', `Approval for "${node.title || node.id}" is set to deny.`)
    }
    if (request.mode === 'allow') return
    if (typeof requestApproval !== 'function') {
      throw approvalError(
        'APPROVAL_UNAVAILABLE',
        'This node requires approval, but no approval channel is available. Set approval to "allow" explicitly or run from the CueFlow panel.',
      )
    }

    const state = run.nodeStates[node.id]
    const controller = new AbortController()
    const unlink = linkAbort(signal, controller)
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, DEFAULT_APPROVAL_TIMEOUT_MS)

    try {
      const handle = await requestApproval({
        run,
        node,
        action: request.action,
        detail: request.detail,
        signal: controller.signal,
      })
      if (!handle || typeof handle.id !== 'string' || !handle.result) {
        throw approvalError('APPROVAL_UNAVAILABLE', 'The approval channel returned an invalid handle.')
      }
      if (state) {
        state.status = 'waiting-approval'
        state.pendingApproval = {
          id: handle.id,
          action: request.action,
          detail: request.detail,
          requestedAt: now(),
        }
      }
      update()

      const outcome = await handle.result
      if (outcome === 'allowed-once') return
      if (timedOut) {
        throw approvalError('APPROVAL_TIMEOUT', `Approval for "${node.title || node.id}" timed out after ${DEFAULT_APPROVAL_TIMEOUT_MS} ms.`)
      }
      if (outcome === 'cancelled') {
        throw Object.assign(new Error('Approval cancelled.'), { name: 'AbortError', code: 'APPROVAL_CANCELLED' })
      }
      if (outcome === 'rejected') {
        throw approvalError('APPROVAL_REJECTED', `Approval for "${node.title || node.id}" was rejected.`)
      }
      throw approvalError('APPROVAL_UNAVAILABLE', 'The approval channel was unavailable; the action was not executed.')
    } finally {
      clearTimeout(timer)
      unlink()
      if (state) {
        state.pendingApproval = null
        if (state.status === 'waiting-approval') state.status = 'idle'
      }
      update()
    }
  }

  const consumeAgentBudget = node => {
    if (node.type !== 'agent' && node.type !== 'skill') return true
    const max = Number(run.budget?.maxAgentCalls) || 0
    if (max > 0 && run.budget.agentCalls >= max) {
      fail(node.id, budgetError(`Agent-call budget (${max}) exceeded.`))
      return false
    }
    run.budget.agentCalls += 1
    return true
  }

  const isReady = nodeId => {
    const sources = index.incomingNodes.get(nodeId) ?? new Set()
    for (const sourceId of sources) {
      if (!index.nodeById.has(sourceId)) continue
      if (!settled.has(sourceId)) return false
    }
    return true
  }

  const runNode = (node, inputs) => {
    const state = run.nodeStates[node.id]
    state.status = 'running'
    state.startedAt = now()
    state.attempts = 0
    state.pendingApproval = null
    pushEvent(run, 'node/start', `Running ${node.title || node.id}`, {
      nodeId: node.id,
      data: { type: node.type, inputs: summarizeInputs(inputs) },
    }, now, onEvent)
    update()

    const timeoutMs = resolveTimeout(node)
    const maxAttempts = 1 + resolveRetry(node)
    let attemptNumber = 0
    const heartbeat = heartbeatMs > 0
      ? setInterval(() => {
          pushEvent(run, 'node/heartbeat', `${node.title || node.id} still running`, {
            nodeId: node.id,
            data: { elapsedMs: now() - (state.startedAt ?? now()), attempt: state.attempts },
          }, now, onEvent)
          update()
        }, heartbeatMs)
      : null

    const executeAttempt = () => {
      attemptNumber += 1
      state.attempts = attemptNumber
      const controller = new AbortController()
      const unlink = cancelPolicy === 'drain' ? () => {} : linkAbort(signal, controller)
      let timer = null
      const work = Promise.resolve().then(() => executeNode(node, inputs, {
        signal: controller.signal,
        timeoutMs,
        run,
        values,
        cwd: run.cwd,
        sessionId: run.sessionId,
      }))
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error(`Node "${node.title || node.id}" timed out after ${timeoutMs} ms.`)
          error.code = 'NODE_TIMEOUT'
          controller.abort(error)
          reject(error)
        }, Math.max(1, timeoutMs))
      })
      return Promise.race([work, timeoutPromise]).finally(() => {
        if (timer) clearTimeout(timer)
        unlink()
      })
    }

    const promise = (async () => {
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        if (externalAborted) {
          cancel(node.id, 'run-cancelled')
          return
        }
        if (attempt > 1) {
          const delayMs = resolveRetryDelay(node)
          pushEvent(run, 'node/retry', `Retrying ${node.title || node.id} (${attempt}/${maxAttempts})`, {
            nodeId: node.id,
            data: { attempt, maxAttempts, delayMs },
          }, now, onEvent)
          update()
          try {
            await waitRetry(delayMs, signal)
          } catch {
            cancel(node.id, 'run-cancelled')
            return
          }
        }

        try {
          const result = await executeAttempt()
          if (externalAborted && cancelPolicy !== 'drain') {
            cancel(node.id, 'run-cancelled')
            return
          }
          const normalized = isPlainObject(result) ? result : {}
          const usage = normalized.meta?.usage ?? normalized.usage
          const tokens = Number(usage?.totalTokens ?? usage?.total_tokens ?? 0)
          if (Number.isFinite(tokens) && tokens > 0) run.budget.tokens += tokens
          if (Number(run.budget.maxTokens) > 0 && run.budget.tokens > Number(run.budget.maxTokens)) {
            fail(node.id, budgetError(`Token budget (${run.budget.maxTokens}) exceeded.`))
            return
          }
          const outputs = isPlainObject(normalized.outputs) ? normalized.outputs : {}
          const defined = definedOutputs(node, outputs)
          values[node.id] = defined
          for (const log of normalizeLogs(normalized.logs)) {
            pushEvent(run, 'node/log', log.message, { nodeId: node.id, data: log.data }, now, onEvent)
          }
          if (normalized.runOutput !== undefined) {
            run.outputs[node.id] = truncateRunOutput(normalized.runOutput)
          }
          const preview = makePreview(defined)
          pushEvent(run, 'node/end', `Completed ${node.title || node.id}`, {
            nodeId: node.id,
            data: { status: 'success', preview: truncateText(preview, LIMITS.maxPreviewChars).text },
          }, now, onEvent)
          settle(node.id, {
            status: 'success',
            outputs: truncateOutputs(defined),
            preview: truncateText(preview, LIMITS.maxPreviewChars).text,
            error: null,
            ...(normalized.meta && isPlainObject(normalized.meta) ? { meta: normalized.meta } : {}),
          })
          return
        } catch (error) {
          if ((externalAborted && cancelPolicy !== 'drain') || isAbortError(error)) {
            cancel(node.id, externalAborted ? 'run-cancelled' : 'node-aborted')
            return
          }
          if (attempt < maxAttempts) continue
          const normalized = normalizeError(error)
          if (node.config?.onError === 'skip') {
            pushEvent(run, 'node/error', normalized.message, { nodeId: node.id, data: { ...normalized, skipped: true } }, now, onEvent)
            settle(node.id, { status: 'skipped', error: normalized, preview: '' })
          } else {
            fail(node.id, error)
          }
          return
        }
      }
    })().finally(() => {
      if (heartbeat) clearInterval(heartbeat)
      running.delete(node.id)
      update()
    })

    running.set(node.id, promise)
    return promise
  }

  try {
    while (pending.size || running.size) {
      if (externalAborted) {
        for (const id of [...pending]) cancel(id, 'run-cancelled')
        await Promise.allSettled([...running.values()])
        break
      }

      let progressed = false
      if (!fatalError) {
        const ready = [...pending]
          .map(id => index.nodeById.get(id))
          .filter(Boolean)
          .filter(node => isReady(node.id))
          .sort(compareNodes)

        for (const node of ready) {
          if (fatalError) break
          if (running.size >= Math.max(1, concurrency)) break
          if (settled.has(node.id) || running.has(node.id)) continue
          if (node.disabled) {
            skip(node.id, 'disabled', `Skipped disabled node ${node.title || node.id}`)
            progressed = true
            continue
          }
          let resolved
          try {
            resolved = resolveWithCoercion(workflow, node, values)
          } catch (error) {
            fail(node.id, error)
            progressed = true
            continue
          }
          if (resolved.missing.length) {
            skip(node.id, `missing-input:${resolved.missing.join(',')}`, `Missing input: ${resolved.missing.join(', ')}`)
            progressed = true
            continue
          }
          if (!consumeAgentBudget(node)) {
            progressed = true
            continue
          }
          try {
            await approveNode(node, resolved.inputs)
          } catch (error) {
            if (externalAborted || isAbortError(error)) cancel(node.id, externalAborted ? 'run-cancelled' : 'approval-cancelled')
            else fail(node.id, error)
            progressed = true
            continue
          }
          runNode(node, resolved.inputs)
          progressed = true
        }
      } else {
        for (const id of [...pending]) skip(id, 'upstream-failed', 'Skipped after an upstream failure')
      }

      if (running.size) {
        await Promise.race([...running.values()])
        continue
      }
      if (progressed && pending.size) continue
      if (pending.size) {
        for (const id of [...pending]) fail(id, Object.assign(new Error('Scheduler deadlock: no node is ready.'), { code: 'SCHEDULER_DEADLOCK' }))
        break
      }
    }
  } finally {
    signal?.removeEventListener('abort', onAbort)
  }

  run.endedAt = now()
  if (externalAborted) {
    run.status = 'cancelled'
    pushEvent(run, 'run/cancel', 'Run cancelled', { data: { runId: run.id } }, now, onEvent)
  } else if (fatalError) {
    run.status = 'error'
    run.error = fatalError
    pushEvent(run, 'run/error', fatalError.message, { data: fatalError }, now, onEvent)
  } else {
    run.status = 'completed'
    pushEvent(run, 'run/end', 'Run completed', {
      data: { runId: run.id, outputs: Object.keys(run.outputs) },
    }, now, onEvent)
  }
  update()
  return run
}

/** Resolve inputs and coerce each connected value to the target port type. */
export function resolveWithCoercion(workflow, node, values) {
  const base = resolveNodeInputs(workflow, node, values)
  const ports = getInputs(node.type, node.config)
  const byId = new Map(ports.map(port => [port.id, port]))
  const inputs = { ...base.inputs }

  for (const [portId, source] of Object.entries(base.sources)) {
    if (!source) continue
    const value = base.inputs[portId]
    if (value === undefined) continue
    const sourceNode = workflow.nodes.find(candidate => candidate.id === source.node)
    const sourcePort = sourceNode ? findPort(sourceNode.type, sourceNode.config, source.port, 'out') : null
    const targetPort = byId.get(portId)
    if (!sourcePort || !targetPort) continue
    inputs[portId] = coerceValue(value, sourcePort.type, targetPort.type, targetPort.label || portId)
  }
  return { ...base, inputs }
}

/** Resolve a node timeout from config, then type default. */
export function resolveTimeout(node) {
  const configured = Number(node.config?.timeoutMs)
  if (Number.isFinite(configured) && configured >= 1) return Math.min(configured, 24 * 60 * 60 * 1000)
  return DEFAULT_TIMEOUTS[node.type] ?? 30_000
}

/** Extra attempts, clamped to 0..5. */
export function resolveRetry(node) {
  const value = Number(node.config?.retry)
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(5, Math.floor(value)))
}

/** Delay before the next attempt, clamped to 0..60s. */
export function resolveRetryDelay(node) {
  const value = Number(node.config?.retryDelayMs)
  if (!Number.isFinite(value)) return 500
  return Math.max(0, Math.min(60_000, Math.floor(value)))
}

function waitRetry(ms, signal) {
  if (!ms) return Promise.resolve()
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    }, { once: true })
  })
}

/** Push an event, maintaining seq and the cap. */
export function pushEvent(run, type, message, extra = {}, now = Date.now, onEvent) {
  const last = run.events[run.events.length - 1]
  const event = {
    seq: last ? last.seq + 1 : 0,
    time: now(),
    type,
    message: String(message ?? ''),
    ...(extra.nodeId ? { nodeId: extra.nodeId } : {}),
    ...(extra.data !== undefined ? { data: extra.data } : {}),
  }
  run.events.push(event)
  enforceEventCap(run.events)
  try {
    onEvent?.(event)
  } catch {
    /* observers must not break a run */
  }
  return event
}

function enforceEventCap(events) {
  while (events.length > LIMITS.maxEvents) {
    const logIndex = events.findIndex(event => event.type === 'node/log')
    if (logIndex >= 0) events.splice(logIndex, 1)
    else events.shift()
  }
}

function normalizeLogs(logs) {
  if (!Array.isArray(logs)) return []
  return logs
    .filter(log => log !== undefined && log !== null)
    .slice(0, LIMITS.maxLogsPerNode)
    .map(log => (typeof log === 'string'
      ? { message: log }
      : { message: String(log.message ?? log.text ?? ''), data: log.data }))
}

function truncateOutputs(outputs) {
  const result = {}
  for (const [key, value] of Object.entries(outputs)) {
    if (typeof value === 'string') result[key] = truncateText(value, LIMITS.maxOutputChars).text
    else result[key] = value
  }
  return result
}

function truncateRunOutput(output) {
  if (typeof output === 'string') return truncateText(output, LIMITS.maxOutputChars).text
  if (isPlainObject(output) && typeof output.value === 'string') {
    return { ...output, value: truncateText(output.value, LIMITS.maxOutputChars).text }
  }
  return output
}

function makePreview(outputs) {
  if (!outputs || Object.keys(outputs).length === 0) return ''
  const preferred = outputs.text ?? outputs.stdout ?? outputs.value
  if (preferred !== undefined) return truncateText(stringifyValue(preferred), LIMITS.maxPreviewChars).text
  return truncateText(stringifyValue(outputs), LIMITS.maxPreviewChars).text
}

function summarizeInputs(inputs) {
  const out = {}
  for (const [key, value] of Object.entries(inputs ?? {})) out[key] = previewValue(value, 120)
  return out
}

function normalizeError(error) {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error')
  const code = typeof error?.code === 'string' ? error.code : 'NODE_ERROR'
  const details = error?.details !== undefined ? { details: error.details } : {}
  return { message, code, ...details }
}

function isAbortError(error) {
  return error?.name === 'AbortError' || error?.code === 'ABORT_ERR' || error?.code === 'ABORTED'
}

function linkAbort(parent, child) {
  if (!parent) return () => {}
  if (parent.aborted) {
    child.abort(parent.reason)
    return () => {}
  }
  const onAbort = () => child.abort(parent.reason)
  parent.addEventListener('abort', onAbort, { once: true })
  return () => parent.removeEventListener('abort', onAbort)
}

function buildApprovalRequest(node, inputs) {
  if (!APPROVAL_NODE_TYPES.includes(node.type)) return null
  const configured = node.config?.approval
  const mode = APPROVAL_MODES.includes(configured) ? configured : 'ask'
  if (mode === 'allow') return null
  if (node.type === 'shell') {
    const command = inputs?.command !== undefined ? stringifyValue(inputs.command) : String(node.config?.command ?? '')
    return {
      mode,
      action: 'shell',
      detail: {
        command: truncateText(command, 4000).text,
        workdir: String(node.config?.workdir || ''),
      },
    }
  }
  const name = String(node.config?.command ?? '').trim()
  const rawInput = inputs?.input !== undefined ? stringifyValue(inputs.input) : String(node.config?.fallbackInput ?? '')
  return {
    mode,
    action: 'command',
    detail: {
      command: `/${name}${rawInput ? ` ${rawInput}` : ''}`.trim(),
      input: truncateText(rawInput, 2000).text,
    },
  }
}

function approvalError(code, message) {
  return Object.assign(new Error(message), { code })
}

function budgetError(message) {
  return Object.assign(new Error(message), { code: 'RUN_BUDGET_EXCEEDED' })
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

export { TERMINAL_NODE_STATUS, isTerminalNode }
