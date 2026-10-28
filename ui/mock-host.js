/**
 * Mock Host for the standalone UI harness. It mirrors the real HTTP contract
 * closely enough to exercise loading, editing, saving, running, cancellation,
 * errors and polling — without DSH.
 */

import { getNodeTypeCatalog, NODE_CATEGORIES } from '../shared/node-types.js'
import { normalizeWorkflow, validateWorkflow } from '../shared/validation.js'
import { listTemplates } from '../lib/core/templates.js'
import { isTerminalRun } from '../shared/constants.js'

const BASE = '/api/dsh/dsh-plugin-cueflow'
let sequence = 0
let shouldFail = false
const workflows = new Map()
const runs = new Map()

const templates = listTemplates()
const demo = templates.find(template => template.id === 'review-diff')?.workflow ?? templates[0].workflow
workflows.set(demo.id, clone(demo))

const agents = [
  { id: 'session-demo', status: 'idle', provider: 'deepseek-official', model: 'deepseek-flash', title: 'CueFlow demo session', cwd: 'F:\\WorkSpace\\dsh-plugin-cueflow' },
]
const skills = [
  { name: 'code-review', description: 'Find real correctness bugs in the current diff.', whenToUse: 'Before merging.', source: 'user-dsh', provider: 'runtime', modelInvocable: false, userInvocable: true },
  { name: 'simplify', description: 'Behavior-preserving cleanups over the current diff.', whenToUse: '', source: 'user-dsh', provider: 'runtime', modelInvocable: true, userInvocable: true },
  { name: 'avalonia-design', description: 'Design guidance for desktop client UI.', whenToUse: '', source: 'user-dsh', provider: 'runtime', modelInvocable: true, userInvocable: true },
]
const commands = [
  { name: 'simplify', description: 'Clean up the current diff.', input: { hint: 'Optional focus' } },
  { name: 'review', description: 'Alias for code review.', input: null },
]

export function installMockHost() {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, 'http://cueflow.local')
    if (!url.pathname.startsWith(BASE)) return originalFetch(input, options)
    const path = url.pathname.slice(BASE.length) || '/'
    const method = (options.method ?? 'GET').toUpperCase()
    const body = options.body ? JSON.parse(String(options.body)) : null
    try {
      const result = await route(path, url, method, body)
      return jsonResponse(result.status, result.body)
    } catch (error) {
      return jsonResponse(500, { ok: false, code: 'MOCK_ERROR', error: error instanceof Error ? error.message : String(error) })
    }
  }

  const params = new URLSearchParams(location.search)
  if (params.get('clean') === '1') document.getElementById('harness-bar').style.display = 'none'
  if (params.get('theme') === 'light') document.body.removeAttribute('data-ds-dark-theme')
  else document.body.setAttribute('data-ds-dark-theme', '')
  if (params.get('fail') === '1') shouldFail = true

  document.getElementById('harness-bar')?.addEventListener('click', event => {
    const action = event.target.closest('button')?.dataset.action
    if (action === 'run') triggerRun(false)
    if (action === 'fail') triggerRun(true)
    if (action === 'cancel') document.querySelector('[data-cue-action="cancel-run"]')?.click()
    if (action === 'theme') {
      if (document.body.hasAttribute('data-ds-dark-theme')) document.body.removeAttribute('data-ds-dark-theme')
      else document.body.setAttribute('data-ds-dark-theme', '')
    }
    if (action === 'width') {
      const root = document.getElementById('root')
      root.style.width = root.style.width === '800px' ? '100%' : '800px'
    }
  })

  window.__CUE_TEST__ = {
    run: () => triggerRun(false),
    fail: () => triggerRun(true),
    cancel: () => document.querySelector('[data-cue-action="cancel-run"]')?.click(),
    theme: value => {
      if (value === 'light') document.body.removeAttribute('data-ds-dark-theme')
      else document.body.setAttribute('data-ds-dark-theme', '')
    },
    workflows,
    runs,
  }

  if (params.get('run') === '1') setTimeout(() => triggerRun(params.get('fail') === '1'), 900)
}

async function route(path, url, method, body) {
  const segments = path.split('/').filter(Boolean)
  if (method === 'GET' && segments.length === 0) return { status: 200, body: { ok: true, name: 'CueFlow', version: 'mock' } }
  if (method === 'GET' && segments[0] === 'health') {
    return {
      status: 200,
      body: { ok: true, version: 'mock', capabilities: { skills: true, commands: true, agents: true, subagents: true, shell: true, fs: true, webServer: true } },
    }
  }
  if (method === 'GET' && segments[0] === 'catalog') {
    return { status: 200, body: { ok: true, ...catalog() } }
  }
  if (segments[0] === 'workflows') {
    if (method === 'GET' && segments.length === 1) {
      return { status: 200, body: { ok: true, workflows: [...workflows.values()].map(summary) } }
    }
    if (method === 'POST' && segments.length === 1) {
      if (!body?.workflow) return { status: 400, body: { ok: false, code: 'BAD_REQUEST', error: 'workflow required' } }
      const workflow = normalizeWorkflow(body.workflow)
      const report = validateWorkflow(workflow)
      if (!report.ok) return { status: 422, body: { ok: false, code: 'VALIDATION_FAILED', error: 'invalid workflow', details: { issues: report.issues } } }
      workflow.updatedAt = Date.now()
      workflows.set(workflow.id, workflow)
      return { status: 200, body: { ok: true, workflow } }
    }
    if (segments.length === 2 && method === 'GET') {
      const workflow = workflows.get(decodeURIComponent(segments[1]))
      if (!workflow) return { status: 404, body: { ok: false, code: 'NOT_FOUND', error: 'not found' } }
      return { status: 200, body: { ok: true, workflow } }
    }
    if (segments.length === 2 && method === 'DELETE') {
      workflows.delete(decodeURIComponent(segments[1]))
      return { status: 200, body: { ok: true } }
    }
  }
  if (method === 'POST' && segments[0] === 'validate') {
    const workflow = normalizeWorkflow(body?.workflow ?? {})
    const report = validateWorkflow(workflow)
    return { status: 200, body: { ok: true, valid: report.ok, issues: report.issues } }
  }
  if (segments[0] === 'runs') {
    if (method === 'POST' && segments.length === 1) {
      if (!body?.workflow) return { status: 400, body: { ok: false, code: 'BAD_REQUEST', error: 'workflow required' } }
      const workflow = normalizeWorkflow(body.workflow)
      const run = createMockRun(workflow, body.inputs ?? {}, Boolean(shouldFail || body.fail))
      runs.set(run.id, run)
      return { status: 201, body: { ok: true, run: publicRun(run) } }
    }
    if (method === 'GET' && segments.length === 1) {
      return { status: 200, body: { ok: true, runs: [...runs.values()].map(summaryRun) } }
    }
    if (segments.length === 2 && method === 'GET') {
      const run = runs.get(decodeURIComponent(segments[1]))
      if (!run) return { status: 404, body: { ok: false, code: 'NOT_FOUND', error: 'run not found' } }
      const after = url.searchParams.get('after')
      const threshold = after === null ? -1 : Number(after)
      return {
        status: 200,
        body: {
          ok: true,
          run: publicRun(run),
          events: run.events.filter(event => event.seq > threshold),
        },
      }
    }
    if (segments.length === 3 && segments[2] === 'cancel' && method === 'POST') {
      const run = runs.get(decodeURIComponent(segments[1]))
      if (!run) return { status: 404, body: { ok: false, code: 'NOT_FOUND', error: 'run not found' } }
      if (isTerminalRun(run.status)) return { status: 409, body: { ok: false, code: 'RUN_CONFLICT', error: 'run already ended' } }
      cancelMockRun(run)
      return { status: 200, body: { ok: true, run: publicRun(run) } }
    }
  }
  return { status: 404, body: { ok: false, code: 'NOT_FOUND', error: `${method} ${path}` } }
}

function catalog() {
  return {
    version: 'mock',
    cwd: 'F:\\WorkSpace\\dsh-plugin-cueflow',
    nodeTypes: getNodeTypeCatalog(),
    categories: NODE_CATEGORIES,
    skills,
    skillsComplete: true,
    commands,
    agents,
    defaultSessionId: agents[0].id,
    templates,
    capabilities: { skills: true, commands: true, agents: true, subagents: true, shell: true, fs: true, webServer: true },
    warnings: [],
  }
}

function createMockRun(workflow, inputs, fail) {
  const run = {
    schemaVersion: 1,
    id: `run_mock_${++sequence}`,
    workflowId: workflow.id,
    workflowName: workflow.name,
    workflowSnapshot: clone(workflow),
    status: 'running',
    inputs,
    sessionId: agents[0].id,
    cwd: 'F:\\WorkSpace\\dsh-plugin-cueflow',
    createdAt: Date.now(),
    startedAt: Date.now(),
    endedAt: null,
    nodeStates: {},
    events: [],
    outputs: {},
    error: null,
  }
  for (const node of workflow.nodes ?? []) {
    run.nodeStates[node.id] = {
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
  const push = (type, message, nodeId, data) => {
    run.events.push({ seq: run.events.length, time: Date.now(), type, message, ...(nodeId ? { nodeId } : {}), ...(data ? { data } : {}) })
  }
  push('run/start', 'Run started', null, { runId: run.id })
  const nodes = (workflow.nodes ?? []).filter(node => node.type !== 'note')
  let delay = 300
  const timers = []
  nodes.forEach((node, index) => {
    timers.push(setTimeout(() => {
      if (run.status !== 'running') return
      const state = run.nodeStates[node.id]
      state.status = 'running'
      state.startedAt = Date.now()
      state.attempts = 1
      push('node/start', `Running ${node.title}`, node.id)
    }, delay))
    timers.push(setTimeout(() => {
      if (run.status !== 'running') return
      const state = run.nodeStates[node.id]
      state.status = 'success'
      state.endedAt = Date.now()
      state.durationMs = 360
      state.preview = previewFor(node, run)
      state.outputs = outputsFor(node, run)
      if (node.type === 'output') {
        run.outputs[node.id] = { name: node.config.name || 'Output', format: 'text', value: `Mock output from ${workflow.name}.` }
      }
      push('node/end', `Completed ${node.title}`, node.id)
    }, delay + 330))
    if (fail && node.type === 'agent') {
      timers.push(setTimeout(() => {
        if (run.status !== 'running') return
        const state = run.nodeStates[node.id]
        state.status = 'error'
        state.endedAt = Date.now()
        state.error = { code: 'MOCK_AGENT_FAILED', message: 'The mock agent failed on purpose. Toggle Fail off and run again.' }
        run.status = 'error'
        run.error = { code: 'MOCK_AGENT_FAILED', message: state.error.message, nodeId: node.id }
        run.endedAt = Date.now()
        push('node/error', state.error.message, node.id, state.error)
        push('run/error', state.error.message, node.id, run.error)
      }, delay + 340))
    }
    delay += 420
  })
  timers.push(setTimeout(() => {
    if (run.status !== 'running') return
    run.status = 'completed'
    run.endedAt = Date.now()
    push('run/end', 'Run completed')
  }, delay + 500))
  run.__timers = timers
  return run
}

function cancelMockRun(run) {
  for (const timer of run.__timers ?? []) clearTimeout(timer)
  run.status = 'cancelled'
  run.endedAt = Date.now()
  for (const state of Object.values(run.nodeStates)) {
    if (state.status === 'running' || state.status === 'idle' || state.status === 'queued') {
      state.status = 'cancelled'
      state.endedAt = Date.now()
    }
  }
  run.events.push({ seq: run.events.length, time: Date.now(), type: 'run/cancel', message: 'Run cancelled by user' })
}

function previewFor(node, run) {
  if (node.type === 'input') return `input: ${run.inputs[node.id] ?? node.config.defaultValue ?? ''}`
  if (node.type === 'shell') return 'mock shell output: 12 files changed'
  if (node.type === 'agent') return 'Review complete. Found two real issues and one follow-up.'
  if (node.type === 'skill') return 'Skill loaded (user-only) and completed the review.'
  if (node.type === 'output') return 'Mock output from the workflow.'
  return 'ok'
}

function outputsFor(node, run) {
  if (node.type === 'template') return { text: String(run.inputs[Object.keys(run.inputs)[0]] ?? 'mock text') }
  if (node.type === 'input') return { value: inputsOf(node, run) }
  if (node.type === 'agent') return { text: 'Review complete. Found two real issues.', json: { issues: 2 } }
  if (node.type === 'shell') return { stdout: 'mock shell output', stderr: '', exitCode: 0, text: 'mock shell output' }
  if (node.type === 'output') return { value: 'Mock output' }
  return {}
}

function inputsOf(node, run) {
  return run.inputs[node.id] ?? node.config.defaultValue ?? ''
}

function summary(workflow) {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description ?? '',
    updatedAt: workflow.updatedAt ?? 0,
    createdAt: workflow.createdAt ?? 0,
    nodeCount: workflow.nodes?.length ?? 0,
    edgeCount: workflow.edges?.length ?? 0,
  }
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
    error: run.error,
  }
}

function publicRun(run) {
  const { __timers, events, ...rest } = run
  return { ...rest, events: [] }
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

function triggerRun(fail) {
  shouldFail = fail
  document.querySelector('[data-cue-action="run"]')?.click()
  setTimeout(() => {
    document.querySelector('[data-cue-action="start-run"]')?.click()
  }, 260)
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}
