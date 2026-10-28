/**
 * Live run manager: owns AbortControllers, a bounded global queue, approvals,
 * budget enforcement and persisted terminal records.
 */

import { LIMITS, clampConcurrency, isTerminalRun, makeId } from '../../shared/constants.js'
import { createRunRecord, executeRun, pushEvent } from './executor.js'

export class RunError extends Error {
  constructor(code, message, status = 409) {
    super(message)
    this.name = 'RunError'
    this.code = code
    this.status = status
  }
}

export function createRunManager({
  store,
  adapters,
  log,
  now = Date.now,
  maxActiveRuns = 2,
  maxWallClockMs = 30 * 60 * 1000,
  maxAgentCalls = 50,
  maxTokens = 0,
} = {}) {
  const active = new Map()
  const queued = new Map()
  const queue = []
  const activeLimit = Math.max(1, Number(maxActiveRuns) || 2)
  const wallClockLimit = Math.max(0, Number(maxWallClockMs) || 0)
  const agentCallLimit = Math.max(0, Number(maxAgentCalls) || 0)
  const tokenLimit = Math.max(0, Number(maxTokens) || 0)
  let draining = false

  /** @type {Map<string, { run: object, runId: string, record: object, settled: boolean, finish: (outcome:string) => void }>} */
  const pendingApprovals = new Map()

  async function start({ workflow, inputs = {}, sessionId = '', cwd = '', concurrency, runId, seedValues } = {}) {
    const run = createRunRecord({ workflow, inputs, sessionId, cwd, runId, seedValues, now })
    run.status = 'queued'
    run.queuePosition = null
    run.budget = {
      maxWallClockMs: wallClockLimit,
      maxAgentCalls: agentCallLimit,
      maxTokens: tokenLimit,
      agentCalls: 0,
      tokens: 0,
      startedAt: null,
    }
    const controller = new AbortController()
    let resolveDone
    const done = new Promise(resolve => {
      resolveDone = resolve
    })
    const record = {
      run,
      controller,
      done,
      resolveDone,
      limit: clampConcurrency(concurrency ?? workflow.settings?.concurrency),
      budgetTimer: null,
      budgetExceeded: false,
      queued: true,
    }

    try {
      store.writeRun(run)
    } catch (error) {
      log?.('warn', `Could not write initial run ${run.id}: ${message(error)}`)
    }

    queued.set(run.id, record)
    queue.push(record)
    updateQueuePositions()
    drain()
    return run
  }

  function updateQueuePositions() {
    for (let index = 0; index < queue.length; index += 1) {
      const record = queue[index]
      record.run.queuePosition = index + 1
      try {
        store.writeRun(record.run)
      } catch (error) {
        log?.('warn', `Could not persist queue position for ${record.run.id}: ${message(error)}`)
      }
    }
  }

  function drain() {
    if (draining) return
    draining = true
    try {
      while (active.size < activeLimit && queue.length) {
        const record = queue.shift()
        queued.delete(record.run.id)
        if (record.run.status !== 'queued' || record.controller.signal.aborted) {
          record.run.status = 'cancelled'
          record.run.endedAt = now()
          record.resolveDone(record.run)
          continue
        }
        launch(record)
      }
    } finally {
      draining = false
      updateQueuePositions()
    }
  }

  function launch(record) {
    const { run, controller, limit } = record
    run.status = 'running'
    run.startedAt = now()
    run.queuePosition = null
    run.budget.startedAt = run.startedAt
    active.set(run.id, record)
    if (wallClockLimit > 0) {
      record.budgetTimer = setTimeout(() => {
        record.budgetExceeded = true
        if (!controller.signal.aborted) controller.abort()
      }, wallClockLimit)
    }

    executeRun(run, {
      executeNode: adapters.executeNode,
      signal: controller.signal,
      concurrency: limit,
      now,
      requestApproval,
    })
      .then(async () => {
        if (record.budgetExceeded) applyBudgetError(run, 'wall-clock')
        try {
          store.writeRun(run)
        } catch (error) {
          log?.('warn', `Could not persist run ${run.id}: ${message(error)}`)
        }
        return run
      })
      .catch(async error => {
        run.status = 'error'
        run.endedAt = run.endedAt ?? now()
        run.error = { code: error?.code ?? 'RUN_INTERNAL', message: message(error) }
        try {
          pushEvent(run, 'run/error', run.error.message, { data: run.error }, now)
          store.writeRun(run)
        } catch (writeError) {
          log?.('warn', `Could not persist failed run ${run.id}: ${message(writeError)}`)
        }
        return run
      })
      .finally(() => {
        if (record.budgetTimer) clearTimeout(record.budgetTimer)
        cleanupApprovals(run.id, 'cancelled')
        active.delete(run.id)
        record.resolveDone(run)
        drain()
      })
  }

  function applyBudgetError(run, reason) {
    run.status = 'error'
    run.error = {
      code: 'RUN_BUDGET_EXCEEDED',
      message: `Run exceeded its ${reason} budget.`,
      details: { budget: run.budget },
    }
    pushEvent(run, 'run/budget', run.error.message, { data: run.error }, now)
  }

  function requestApproval({ run, node, action, detail, signal }) {
    const id = makeId('apr')
    const record = {
      id,
      nodeId: node.id,
      nodeTitle: node.title || node.id,
      action,
      detail: detail ?? {},
      status: 'pending',
      requestedAt: now(),
      decidedAt: null,
    }
    run.approvals = run.approvals ?? {}
    run.approvals[id] = record

    pushEvent(run, 'approval/asked', `Approval required for ${record.nodeTitle}`, {
      nodeId: node.id,
      data: { id, action, detail: record.detail },
    }, now)

    let settle
    const result = new Promise(resolve => {
      settle = resolve
    })
    const entry = {
      run,
      runId: run.id,
      record,
      settled: false,
      finish: null,
    }
    const finish = outcome => {
      if (entry.settled) return
      entry.settled = true
      signal?.removeEventListener('abort', onAbort)
      record.status = outcome
      record.decidedAt = now()
      pendingApprovals.delete(id)
      pushEvent(run, 'approval/decided', `Approval ${outcome} for ${record.nodeTitle}`, {
        nodeId: node.id,
        data: { id, action, outcome },
      }, now)
      settle(outcome)
    }
    const onAbort = () => finish('cancelled')
    entry.finish = finish
    pendingApprovals.set(id, entry)
    if (signal?.aborted) finish('cancelled')
    else signal?.addEventListener('abort', onAbort, { once: true })
    return { id, result }
  }

  function decideApproval(runId, approvalId, decision) {
    const entry = pendingApprovals.get(approvalId)
    if (!entry || entry.runId !== runId) {
      const persisted = store.readRun(runId)
      const record = persisted?.approvals?.[approvalId]
      if (!record) throw new RunError('APPROVAL_NOT_FOUND', `Approval "${approvalId}" was not found.`, 404)
      if (record.status !== 'pending') {
        throw new RunError('APPROVAL_CONFLICT', `Approval "${approvalId}" is already ${record.status}.`, 409)
      }
      throw new RunError('APPROVAL_NOT_LIVE', `Approval "${approvalId}" is not live in this process.`, 409)
    }
    if (entry.record.status !== 'pending') {
      throw new RunError('APPROVAL_CONFLICT', `Approval "${approvalId}" is already ${entry.record.status}.`, 409)
    }
    if (decision !== 'allow' && decision !== 'reject') {
      throw new RunError('APPROVAL_INVALID', 'Approval decision must be "allow" or "reject".', 400)
    }
    entry.finish(decision === 'allow' ? 'allowed-once' : 'rejected')
    return publicRun(entry.run)
  }

  function cleanupApprovals(runId, outcome = 'cancelled') {
    for (const entry of [...pendingApprovals.values()]) {
      if (entry.runId === runId) entry.finish(outcome)
    }
  }

  function get(id, after = -1) {
    const record = active.get(id) ?? queued.get(id)
    const run = record?.run ?? store.readRun(id)
    if (!run) return null
    const seq = Number.isFinite(Number(after)) ? Math.max(-1, Math.floor(Number(after))) : -1
    const events = Array.isArray(run.events) ? run.events.filter(event => event.seq > seq) : []
    return { run: publicRun(run), events }
  }

  function cancel(id) {
    const record = active.get(id) ?? queued.get(id)
    if (record) {
      if (!record.controller.signal.aborted) record.controller.abort()
      if (queued.delete(id)) {
        const index = queue.findIndex(item => item.run.id === id)
        if (index >= 0) queue.splice(index, 1)
        if (record.budgetTimer) clearTimeout(record.budgetTimer)
        record.run.status = 'cancelled'
        record.run.endedAt = now()
        record.run.queuePosition = null
        pushEvent(record.run, 'run/cancel', 'Run cancelled while queued', { data: { runId: id } }, now)
        try {
          store.writeRun(record.run)
        } catch (error) {
          log?.('warn', `Could not persist cancelled run ${id}: ${message(error)}`)
        }
        record.resolveDone(record.run)
        updateQueuePositions()
        drain()
      }
      return publicRun(record.run)
    }
    const persisted = store.readRun(id)
    if (!persisted) return null
    if (isTerminalRun(persisted.status)) {
      throw new RunError('RUN_CONFLICT', `Run "${id}" is already ${persisted.status}.`, 409)
    }
    throw new RunError('RUN_NOT_LIVE', `Run "${id}" is not live in this process.`, 409)
  }

  function list(limit = 20) {
    const stored = store.listRuns(limit)
    const byId = new Map(stored.runs.map(row => [row.id, row]))
    for (const record of [...active.values(), ...queued.values()]) {
      byId.set(record.run.id, summaryRun(record.run))
    }
    const rows = [...byId.values()]
      .sort((a, b) => (b.endedAt || b.startedAt || b.createdAt) - (a.endedAt || a.startedAt || a.createdAt))
      .slice(0, Math.max(1, Number(limit) || 20))
    return { runs: rows, errors: stored.errors }
  }

  async function dispose() {
    for (const record of [...queue]) {
      record.controller.abort()
      record.run.status = 'cancelled'
      record.run.endedAt = now()
      record.resolveDone(record.run)
    }
    queue.length = 0
    queued.clear()
    const records = [...active.values()]
    for (const record of records) {
      cleanupApprovals(record.run.id, 'cancelled')
      if (!record.controller.signal.aborted) record.controller.abort()
    }
    let timer = null
    const timeout = new Promise(resolve => {
      timer = setTimeout(resolve, 5000)
    })
    try {
      await Promise.race([
        Promise.allSettled(records.map(record => record.done)),
        timeout,
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }
    active.clear()
  }

  function activeCount() {
    return active.size
  }

  function queueCount() {
    return queued.size
  }

  return { start, get, cancel, list, decideApproval, dispose, activeCount, queueCount }
}

function summaryRun(run) {
  return {
    id: run.id,
    workflowId: run.workflowId,
    workflowName: run.workflowName,
    status: run.status,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    nodeCount: Object.keys(run.nodeStates ?? {}).length,
    queuePosition: run.queuePosition ?? null,
    error: run.error ?? null,
  }
}

function publicRun(run) {
  // Events are returned separately (filtered by `after`) to keep polling light.
  const { events, ...rest } = run
  return { ...rest, events: [] }
}

function message(error) {
  return error instanceof Error ? error.message : String(error ?? 'Unknown error')
}

export { LIMITS }
