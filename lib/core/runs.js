/**
 * Live run manager: owns AbortControllers, exposes snapshots/events for the
 * polling API, and persists terminal records.
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

export function createRunManager({ store, adapters, log, now = Date.now }) {
  /** @type {Map<string, { run: object, controller: AbortController, done: Promise<object> }>} */
  const active = new Map()
  /** @type {Map<string, { run: object, runId: string, record: object, settled: boolean, finish: (outcome:string) => void }>} */
  const pendingApprovals = new Map()

  async function start({ workflow, inputs = {}, sessionId = '', cwd = '', concurrency, runId } = {}) {
    const run = createRunRecord({ workflow, inputs, sessionId, cwd, runId, now })
    run.status = 'queued'
    const controller = new AbortController()
    const limit = clampConcurrency(concurrency ?? workflow.settings?.concurrency)

    try {
      store.writeRun(run)
    } catch (error) {
      log?.('warn', `Could not write initial run ${run.id}: ${message(error)}`)
    }

    const done = executeRun(run, {
      executeNode: adapters.executeNode,
      signal: controller.signal,
      concurrency: limit,
      now,
      requestApproval,
    })
      .then(async () => {
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
        cleanupApprovals(run.id, 'cancelled')
        // Keep the record only while it is the authoritative live object; the
        // store is the read path after termination.
        active.delete(run.id)
      })

    active.set(run.id, { run, controller, done })
    return run
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
    const record = active.get(id)
    const run = record?.run ?? store.readRun(id)
    if (!run) return null
    const seq = Number.isFinite(Number(after)) ? Math.max(-1, Math.floor(Number(after))) : -1
    const events = Array.isArray(run.events) ? run.events.filter(event => event.seq > seq) : []
    return { run: publicRun(run), events }
  }

  function cancel(id) {
    const record = active.get(id)
    if (record) {
      if (!record.controller.signal.aborted) record.controller.abort()
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
    return store.listRuns(limit)
  }

  async function dispose() {
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

  return { start, get, cancel, list, decideApproval, dispose, activeCount }
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
