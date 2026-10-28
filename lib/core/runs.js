/**
 * Live run manager: owns AbortControllers, exposes snapshots/events for the
 * polling API, and persists terminal records.
 */

import { LIMITS, clampConcurrency, isTerminalRun } from '../../shared/constants.js'
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
        // Keep the record only while it is the authoritative live object; the
        // store is the read path after termination.
        active.delete(run.id)
      })

    active.set(run.id, { run, controller, done })
    return run
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

  return { start, get, cancel, list, dispose, activeCount }
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
