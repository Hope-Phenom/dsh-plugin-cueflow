/**
 * File-backed store for workflows and runs.
 *
 * Layout:
 *   $DSH_HOME/storages/dsh-plugin-cueflow/workflows/<id>.json
 *   $DSH_HOME/storages/dsh-plugin-cueflow/runs/<id>.json
 *
 * The store owns media only: it does not validate graph semantics. Writes are
 * atomic (temp file + rename) and ids are whitelisted before touching a path.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

import { LIMITS, isTerminalRun } from '../../shared/constants.js'

const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/

/** Resolve $DSH_HOME the same way the shipped host packages do. */
export function resolveDshHome(env = process.env) {
  const configured = typeof env.DSH_HOME === 'string' ? env.DSH_HOME.trim() : ''
  return configured === '' ? join(homedir(), '.dsh') : resolve(configured)
}

/** Create a store rooted at $DSH_HOME/storages/dsh-plugin-cueflow (or an explicit root). */
export function createStore(options = {}) {
  const env = options.env ?? process.env
  const root = options.rootDir
    ? resolve(options.rootDir)
    : join(resolveDshHome(env), 'storages', 'dsh-plugin-cueflow')
  const workflowsDir = join(root, 'workflows')
  const historyDir = join(workflowsDir, '.history')
  const runsDir = join(root, 'runs')

  function ensureDirs() {
    mkdirSync(workflowsDir, { recursive: true })
    mkdirSync(runsDir, { recursive: true })
  }

  function safeId(id) {
    if (typeof id !== 'string' || !SAFE_ID.test(id)) {
      const error = new Error(`Invalid id "${String(id)}".`)
      error.code = 'INVALID_ID'
      throw error
    }
    return id
  }

  function workflowPath(id) {
    return join(workflowsDir, `${safeId(id)}.json`)
  }

  function versionDir(id) {
    return join(historyDir, safeId(id))
  }

  function safeVersion(version) {
    if (typeof version !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(version)) {
      const error = new Error(`Invalid version "${String(version)}".`)
      error.code = 'INVALID_ID'
      throw error
    }
    return version
  }

  function runPath(id) {
    return join(runsDir, `${safeId(id)}.json`)
  }

  function writeJson(file, value) {
    ensureDirs()
    const temporary = `${file}.${process.pid}.${Date.now()}.tmp`
    try {
      writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
      try {
        renameSync(temporary, file)
      } catch {
        // Windows cannot always replace an existing file with rename.
        rmSync(file, { force: true })
        renameSync(temporary, file)
      }
    } catch (error) {
      try {
        rmSync(temporary, { force: true })
      } catch {
        /* best effort */
      }
      throw error
    }
  }

  function readJson(file) {
    try {
      return { value: JSON.parse(readFileSync(file, 'utf8')), error: null }
    } catch (error) {
      return { value: null, error }
    }
  }

  function listWorkflows() {
    ensureDirs()
    const rows = []
    const errors = []
    for (const name of readdirSync(workflowsDir)) {
      if (!name.endsWith('.json')) continue
      const file = join(workflowsDir, name)
      const { value, error } = readJson(file)
      if (!value || typeof value !== 'object') {
        errors.push({ file: name, error: error?.message ?? 'invalid JSON' })
        continue
      }
      rows.push({
        id: value.id ?? name.slice(0, -5),
        name: value.name ?? 'Untitled workflow',
        description: value.description ?? '',
        updatedAt: Number(value.updatedAt) || 0,
        createdAt: Number(value.createdAt) || 0,
        nodeCount: Array.isArray(value.nodes) ? value.nodes.length : 0,
        edgeCount: Array.isArray(value.edges) ? value.edges.length : 0,
      })
    }
    rows.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name))
    return { workflows: rows, errors }
  }

  function readWorkflow(id) {
    const file = workflowPath(id)
    if (!existsSync(file)) return null
    const { value, error } = readJson(file)
    if (error) {
      const wrapped = new Error(`Workflow "${id}" is not valid JSON: ${error.message}`)
      wrapped.code = 'STORE_CORRUPT'
      throw wrapped
    }
    return value
  }

  function archiveWorkflow(id) {
    const current = workflowPath(id)
    if (!existsSync(current)) return
    const { value, error } = readJson(current)
    if (!value || error) return
    const dir = versionDir(id)
    mkdirSync(dir, { recursive: true })
    let stamp = Date.now()
    while (existsSync(join(dir, `${stamp}.json`))) stamp += 1
    writeJson(join(dir, `${stamp}.json`), value)
    const files = readdirSync(dir)
      .filter(name => name.endsWith('.json'))
      .map(name => ({ name, mtime: statSync(join(dir, name)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)
    for (const entry of files.slice(LIMITS.workflowVersions)) {
      try {
        rmSync(join(dir, entry.name), { force: true })
      } catch {
        /* pruning is best effort */
      }
    }
  }

  function writeWorkflow(workflow) {
    if (!workflow || typeof workflow !== 'object') throw new TypeError('workflow must be an object')
    archiveWorkflow(workflow.id)
    writeJson(workflowPath(workflow.id), workflow)
    return workflow
  }

  function listWorkflowVersions(id) {
    const dir = versionDir(id)
    if (!existsSync(dir)) return { versions: [] }
    const versions = []
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.json')) continue
      const file = join(dir, name)
      const { value } = readJson(file)
      if (!value || typeof value !== 'object') continue
      versions.push({
        version: name.slice(0, -5),
        savedAt: Number(value.updatedAt) || statSync(file).mtimeMs,
        name: value.name ?? '',
        nodeCount: Array.isArray(value.nodes) ? value.nodes.length : 0,
        edgeCount: Array.isArray(value.edges) ? value.edges.length : 0,
      })
    }
    versions.sort((a, b) => b.savedAt - a.savedAt)
    return { versions }
  }

  function readWorkflowVersion(id, version) {
    const file = join(versionDir(id), `${safeVersion(version)}.json`)
    if (!existsSync(file)) return null
    return readJson(file).value
  }

  function restoreWorkflowVersion(id, version) {
    const snapshot = readWorkflowVersion(id, version)
    if (!snapshot) return null
    const next = { ...snapshot, id, updatedAt: Date.now() }
    writeWorkflow(next)
    return next
  }

  function deleteWorkflow(id) {
    const file = workflowPath(id)
    if (!existsSync(file)) return false
    rmSync(file, { force: true })
    rmSync(versionDir(id), { recursive: true, force: true })
    return true
  }

  function listRuns(limit = 20) {
    ensureDirs()
    const rows = []
    const errors = []
    for (const name of readdirSync(runsDir)) {
      if (!name.endsWith('.json')) continue
      const file = join(runsDir, name)
      const { value, error } = readJson(file)
      if (!value || typeof value !== 'object') {
        errors.push({ file: name, error: error?.message ?? 'invalid JSON' })
        continue
      }
      rows.push({
        id: value.id ?? name.slice(0, -5),
        workflowId: value.workflowId ?? '',
        workflowName: value.workflowName ?? '',
        status: value.status ?? 'unknown',
        createdAt: Number(value.createdAt) || 0,
        startedAt: Number(value.startedAt) || 0,
        endedAt: Number(value.endedAt) || 0,
        nodeCount: value.nodeStates ? Object.keys(value.nodeStates).length : 0,
        error: value.error ?? null,
      })
    }
    rows.sort((a, b) => (b.endedAt || b.createdAt) - (a.endedAt || a.createdAt))
    return { runs: rows.slice(0, Math.max(1, limit)), errors }
  }

  function readRun(id) {
    const file = runPath(id)
    if (!existsSync(file)) return null
    const { value, error } = readJson(file)
    if (error) {
      const wrapped = new Error(`Run "${id}" is not valid JSON: ${error.message}`)
      wrapped.code = 'STORE_CORRUPT'
      throw wrapped
    }
    return value
  }

  function writeRun(run) {
    if (!run || typeof run !== 'object') throw new TypeError('run must be an object')
    writeJson(runPath(run.id), run)
    pruneRuns()
    return run
  }

  function pruneRuns() {
    ensureDirs()
    const files = []
    for (const name of readdirSync(runsDir)) {
      if (!name.endsWith('.json')) continue
      const file = join(runsDir, name)
      try {
        files.push({ file, mtime: statSync(file).mtimeMs })
      } catch {
        /* file vanished */
      }
    }
    files.sort((a, b) => b.mtime - a.mtime)
    for (const entry of files.slice(LIMITS.runRetention)) {
      try {
        rmSync(entry.file, { force: true })
      } catch {
        /* pruning is best effort */
      }
    }
  }

  /** Mark runs left in a non-terminal state by a crash/quit as interrupted. */
  function recoverInterruptedRuns(now = Date.now()) {
    ensureDirs()
    const recovered = []
    for (const name of readdirSync(runsDir)) {
      if (!name.endsWith('.json')) continue
      const file = join(runsDir, name)
      const { value } = readJson(file)
      if (!value || typeof value !== 'object') continue
      if (isTerminalRun(value.status)) continue
      value.status = 'error'
      value.endedAt = value.endedAt || now()
      value.error = value.error ?? {
        code: 'RUN_INTERRUPTED',
        message: 'This run was interrupted before it finished (DSH or the plugin stopped).',
      }
      writeJson(file, value)
      recovered.push(value.id ?? name.slice(0, -5))
    }
    return recovered
  }

  function paths() {
    return { root, workflowsDir, historyDir, runsDir }
  }

  return {
    root,
    workflowsDir,
    runsDir,
    ensureDirs,
    paths,
    listWorkflows,
    readWorkflow,
    writeWorkflow,
    listWorkflowVersions,
    readWorkflowVersion,
    restoreWorkflowVersion,
    deleteWorkflow,
    listRuns,
    readRun,
    writeRun,
    pruneRuns,
    recoverInterruptedRuns,
    writeJson,
    readJson,
  }
}

/** Directory containing the plugin's data. Kept for diagnostics. */
export function storageRoot(env = process.env) {
  return join(resolveDshHome(env), 'storages', 'dsh-plugin-cueflow')
}

export { SAFE_ID }
