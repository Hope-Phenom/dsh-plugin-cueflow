/**
 * HTTP API for CueFlow.
 *
 * Mounted at /api/dsh/dsh-plugin-cueflow by the Host plugin. The route owns the
 * full response lifecycle, reads bounded JSON bodies and maps domain errors to
 * stable HTTP codes.
 */

import { API_PREFIX, LIMITS, PLUGIN_VERSION, clampConcurrency } from '../../shared/constants.js'
import { normalizeWorkflow, summarizeIssues, validateRunInputs, validateWorkflow } from '../../shared/validation.js'
import { resolve } from 'node:path'
import { resolveParent } from './adapters.js'

export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    if (details !== undefined) this.details = details
  }
}

export function createRoute({ store, runs, catalog, services, version = PLUGIN_VERSION, log }) {
  return async function route(req, res) {
    setNoStore(res)
    try {
      const url = new URL(req.url ?? '/', 'http://cueflow.local')
      if (!url.pathname.startsWith(API_PREFIX)) {
        sendJson(res, 404, { ok: false, code: 'NOT_FOUND', error: 'Not found.' })
        return
      }
      const path = url.pathname.slice(API_PREFIX.length) || '/'
      const segments = path.split('/').filter(Boolean)
      const method = (req.method ?? 'GET').toUpperCase()

      assertSafeRequest(req, method)

      if (method === 'OPTIONS') {
        res.statusCode = 204
        res.end()
        return
      }

      if (method === 'GET' && segments.length === 0) {
        sendJson(res, 200, { ok: true, name: 'CueFlow', version, api: API_PREFIX })
        return
      }
      if (method === 'GET' && segments[0] === 'health' && segments.length === 1) {
        sendJson(res, 200, await health({ services, version }))
        return
      }
      if (method === 'GET' && segments[0] === 'catalog' && segments.length === 1) {
        const cwd = url.searchParams.get('cwd') || ''
        const sessionId = url.searchParams.get('sessionId') || ''
        const value = await catalog.get({ cwd, sessionId })
        sendJson(res, 200, { ok: true, ...value })
        return
      }
      if (segments[0] === 'workflows') {
        if (method === 'GET' && segments.length === 1) {
          const workspace = normalizeWorkspace(url.searchParams.get('workspace') || '')
          const result = store.listWorkflows(workspace)
          sendJson(res, 200, { ok: true, ...result })
          return
        }
        if (method === 'POST' && segments.length === 1) {
          const body = await readJsonBody(req)
          if (!body || typeof body !== 'object' || !body.workflow) {
            throw new HttpError(400, 'BAD_REQUEST', 'Body must be { workflow }.')
          }
          const workflow = normalizeWorkflow(body.workflow)
          const workspace = normalizeWorkspace(body.cwd || body.workspace || workflow.settings?.cwd || '')
          if (workspace) workflow.settings = { ...workflow.settings, workspace }
          const report = validateWorkflow(workflow)
          if (!report.ok) throw validationError(report)
          store.writeWorkflow(workflow)
          sendJson(res, 200, { ok: true, workflow })
          return
        }
        if (segments.length === 2 && method === 'GET') {
          const workflow = store.readWorkflow(decodeURIComponent(segments[1]))
          if (!workflow) throw new HttpError(404, 'NOT_FOUND', 'Workflow not found.')
          sendJson(res, 200, { ok: true, workflow })
          return
        }
        if (segments.length === 2 && method === 'DELETE') {
          const deleted = store.deleteWorkflow(decodeURIComponent(segments[1]))
          if (!deleted) throw new HttpError(404, 'NOT_FOUND', 'Workflow not found.')
          sendJson(res, 200, { ok: true })
          return
        }
        if (segments.length === 3 && segments[2] === 'versions' && method === 'GET') {
          const id = decodeURIComponent(segments[1])
          if (!store.readWorkflow(id)) throw new HttpError(404, 'NOT_FOUND', 'Workflow not found.')
          sendJson(res, 200, { ok: true, ...store.listWorkflowVersions(id) })
          return
        }
        if (segments.length === 4 && segments[2] === 'versions' && method === 'GET') {
          const id = decodeURIComponent(segments[1])
          const version = decodeURIComponent(segments[3])
          const workflow = store.readWorkflowVersion(id, version)
          if (!workflow) throw new HttpError(404, 'NOT_FOUND', 'Workflow version not found.')
          sendJson(res, 200, { ok: true, workflow })
          return
        }
        if (segments.length === 5 && segments[2] === 'versions' && segments[4] === 'restore' && method === 'POST') {
          const id = decodeURIComponent(segments[1])
          const version = decodeURIComponent(segments[3])
          const workflow = store.restoreWorkflowVersion(id, version)
          if (!workflow) throw new HttpError(404, 'NOT_FOUND', 'Workflow version not found.')
          sendJson(res, 200, { ok: true, workflow })
          return
        }
        throw methodNotAllowed(method)
      }
      if (method === 'POST' && segments[0] === 'validate' && segments.length === 1) {
        const body = await readJsonBody(req)
        if (!body || typeof body !== 'object' || !body.workflow) {
          throw new HttpError(400, 'BAD_REQUEST', 'Body must be { workflow }.')
        }
        const workflow = normalizeWorkflow(body.workflow)
        const report = validateWorkflow(workflow)
        sendJson(res, 200, { ok: true, valid: report.ok, summary: summarizeIssues(report.issues), issues: report.issues })
        return
      }
      if (segments[0] === 'runs') {
        if (method === 'POST' && segments.length === 1) {
          const body = await readJsonBody(req)
          if (!body || typeof body !== 'object' || !body.workflow) {
            throw new HttpError(400, 'BAD_REQUEST', 'Body must be { workflow, inputs?, sessionId?, cwd?, concurrency? }.')
          }
          const workflow = normalizeWorkflow(body.workflow)
          const report = validateWorkflow(workflow)
          if (!report.ok) throw validationError(report)
          const inputReport = validateRunInputs(workflow, isPlainObject(body.inputs) ? body.inputs : {})
          if (!inputReport.ok) throw validationError(inputReport)

          const state = services.get() ?? {}
          const parent = resolveParent(state.agents, String(body.sessionId ?? ''))
          if (hasLlmNodes(workflow) && !parent) {
            throw new HttpError(422, 'VALIDATION_FAILED', 'This workflow needs a live DSH session.', {
              issues: [{
                severity: 'error',
                code: 'LIVE_AGENT_REQUIRED',
                message: 'Agent, Skill and Command nodes need a live session as their parent. Open a session first.',
              }],
            })
          }

          const cwd = resolveCwd(body.cwd, workflow.settings?.cwd)
          const run = await runs.start({
            workflow,
            inputs: isPlainObject(body.inputs) ? body.inputs : {},
            sessionId: parent?.id ?? '',
            cwd,
            concurrency: clampConcurrency(body.concurrency ?? workflow.settings?.concurrency),
          })
          sendJson(res, 201, { ok: true, run })
          return
        }
        if (method === 'GET' && segments.length === 1) {
          const limit = Number(url.searchParams.get('limit') ?? 20)
          const result = runs.list(Number.isFinite(limit) ? limit : 20)
          sendJson(res, 200, { ok: true, ...result })
          return
        }
        if (segments.length === 2 && method === 'GET') {
          const afterParam = url.searchParams.get('after')
          const after = afterParam === null ? -1 : Number(afterParam)
          const found = runs.get(decodeURIComponent(segments[1]), Number.isFinite(after) ? after : -1)
          if (!found) throw new HttpError(404, 'NOT_FOUND', 'Run not found.')
          sendJson(res, 200, { ok: true, ...found })
          return
        }
        if (segments.length === 3 && segments[2] === 'cancel' && method === 'POST') {
          const run = runs.cancel(decodeURIComponent(segments[1]))
          if (!run) throw new HttpError(404, 'NOT_FOUND', 'Run not found.')
          sendJson(res, 200, { ok: true, run })
          return
        }
        if (segments.length === 3 && segments[2] === 'rerun' && method === 'POST') {
          const body = await readJsonBody(req)
          const sourceId = decodeURIComponent(segments[1])
          const found = runs.get(sourceId, -1)
          if (!found) throw new HttpError(404, 'NOT_FOUND', 'Run not found.')
          const source = found.run
          if (source.status === 'running' || source.status === 'queued') {
            throw new HttpError(409, 'RUN_CONFLICT', 'Only a settled run can be resumed.')
          }
          const failedNodeId = Object.entries(source.nodeStates ?? {})
            .find(([, state]) => state.status === 'error')?.[0]
          const fromNodeId = String(body?.fromNodeId || source.error?.nodeId || failedNodeId || '')
          if (!fromNodeId) throw new HttpError(400, 'RERUN_INVALID', 'No failed node to resume from.')
          if (!(source.workflowSnapshot?.nodes ?? []).some(node => node.id === fromNodeId)) {
            throw new HttpError(400, 'RERUN_INVALID', `Node "${fromNodeId}" is not in the run workflow.`)
          }
          const seedValues = {}
          for (const ancestorId of upstreamNodeIds(source.workflowSnapshot, fromNodeId)) {
            const state = source.nodeStates?.[ancestorId]
            if (state?.status === 'success' && isPlainObject(state.outputs)) {
              seedValues[ancestorId] = state.outputs
            }
          }
          const run = await runs.start({
            workflow: source.workflowSnapshot,
            inputs: source.inputs ?? {},
            sessionId: source.sessionId ?? '',
            cwd: source.cwd ?? '',
            concurrency: source.workflowSnapshot?.settings?.concurrency,
            seedValues,
          })
          sendJson(res, 201, { ok: true, run, fromNodeId, seeded: Object.keys(seedValues) })
          return
        }
        if (segments.length === 4 && segments[2] === 'approvals' && method === 'POST') {
          const body = await readJsonBody(req)
          if (!body || typeof body !== 'object' || (body.decision !== 'allow' && body.decision !== 'reject')) {
            throw new HttpError(400, 'BAD_REQUEST', 'Body must be { decision: "allow" | "reject" }.')
          }
          const run = runs.decideApproval(
            decodeURIComponent(segments[1]),
            decodeURIComponent(segments[3]),
            body.decision,
          )
          sendJson(res, 200, { ok: true, run })
          return
        }
        throw methodNotAllowed(method)
      }
      throw new HttpError(404, 'NOT_FOUND', `Unknown endpoint: ${method} ${path}`)
    } catch (error) {
      sendError(res, error, log)
    }
  }
}

/**
 * Mutating requests must prove they came from the CueFlow UI, not a cross-site
 * form. A custom header cannot be attached by a form and triggers a preflight
 * that this route never approves; Origin/Sec-Fetch-Site add defense in depth.
 * This is CSRF protection, not authentication: public deployments must still
 * sit behind DSH's authenticated web surface.
 */
function assertSafeRequest(req, method) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return
  const site = String(req.headers['sec-fetch-site'] ?? '').toLowerCase()
  if (site && site !== 'same-origin' && site !== 'none') {
    throw new HttpError(403, 'ORIGIN_REJECTED', 'Cross-site requests are not allowed.')
  }
  const origin = String(req.headers.origin ?? '')
  if (origin && origin !== 'null') {
    try {
      const parsed = new URL(origin)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        const host = String(req.headers.host ?? '')
        const sameLoopback = isLoopback(parsed.hostname) && isLoopback(host.split(':')[0])
        if (parsed.host !== host && !sameLoopback) {
          throw new HttpError(403, 'ORIGIN_REJECTED', 'Request origin does not match the CueFlow host.')
        }
      }
    } catch (error) {
      if (error instanceof HttpError) throw error
      throw new HttpError(403, 'ORIGIN_REJECTED', 'Request origin is invalid.')
    }
  }
  if (String(req.headers['x-cueflow-request'] ?? '') !== '1') {
    throw new HttpError(403, 'CSRF_REQUIRED', 'Missing CueFlow request header.')
  }
  if (Number(req.headers['content-length'] ?? 0) > 0) {
    const contentType = String(req.headers['content-type'] ?? '').toLowerCase()
    if (!contentType.includes('application/json')) {
      throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'CueFlow requests with a body must use application/json.')
    }
  }
}

function isLoopback(host) {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1'
}

async function health({ services, version }) {
  const state = services?.get?.() ?? {}
  return {
    ok: true,
    name: 'CueFlow',
    version,
    dsh: process.env.DSH_VERSION ?? '',
    capabilities: {
      skills: Boolean(state.skills),
      commands: Boolean(state.commands),
      agents: Boolean(state.agents),
      subagents: Boolean(state.subagents),
      shell: Boolean(state.shell),
      fs: Boolean(state.fs),
      sandboxPolicy: Boolean(state.sandboxPolicy),
      webServer: true,
    },
    storage: 'local-json',
  }
}

function upstreamNodeIds(workflow, nodeId) {
  const incoming = new Map()
  for (const edge of workflow?.edges ?? []) {
    if (!incoming.has(edge.to.node)) incoming.set(edge.to.node, [])
    incoming.get(edge.to.node).push(edge.from.node)
  }
  const seen = new Set()
  const stack = [...(incoming.get(nodeId) ?? [])]
  while (stack.length) {
    const id = stack.pop()
    if (seen.has(id)) continue
    seen.add(id)
    stack.push(...(incoming.get(id) ?? []))
  }
  return seen
}

function hasLlmNodes(workflow) {
  return (workflow.nodes ?? []).some(node => node.type === 'agent' || node.type === 'skill' || node.type === 'command')
}

function resolveCwd(requested, fromWorkflow) {
  const value = String(requested || fromWorkflow || process.cwd())
  return resolve(value)
}

function normalizeWorkspace(value) {
  const text = String(value || '').trim()
  return text ? resolve(text) : ''
}

function validationError(report) {
  return new HttpError(422, 'VALIDATION_FAILED', `Workflow validation failed: ${summarizeIssues(report.issues)}`, {
    issues: report.issues,
  })
}

function methodNotAllowed(method) {
  return new HttpError(405, 'METHOD_NOT_ALLOWED', `Method ${method} is not allowed here.`)
}

async function readJsonBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > LIMITS.maxBodyBytes) {
      throw new HttpError(413, 'BODY_TOO_LARGE', `Request body exceeds ${LIMITS.maxBodyBytes} bytes.`)
    }
    chunks.push(chunk)
  }
  if (size === 0) return null
  // PowerShell 5.1 writes a UTF-8 BOM by default; tolerate it like any JSON client.
  const text = Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, '')
  try {
    return JSON.parse(text)
  } catch {
    throw new HttpError(400, 'BAD_JSON', 'Request body is not valid JSON.')
  }
}

function setNoStore(res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
}

function sendJson(res, status, value) {
  const body = `${JSON.stringify(value)}\n`
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Length', Buffer.byteLength(body))
  res.end(body)
}

function sendError(res, error, log) {
  if (res.headersSent) {
    try {
      res.destroy()
    } catch {
      /* ignore */
    }
    return
  }
  if (error instanceof HttpError) {
    sendJson(res, error.status, {
      ok: false,
      code: error.code,
      error: error.message,
      ...(error.details !== undefined ? { details: error.details } : {}),
    })
    return
  }
  if (error?.code === 'INVALID_ID') {
    sendJson(res, 400, { ok: false, code: 'BAD_REQUEST', error: error.message })
    return
  }
  if (error?.code === 'STORE_CORRUPT') {
    sendJson(res, 500, { ok: false, code: 'STORE_CORRUPT', error: error.message })
    return
  }
  if (error?.code === 'RUN_CONFLICT' || error?.code === 'RUN_NOT_LIVE' || error?.code === 'APPROVAL_CONFLICT' || error?.code === 'APPROVAL_NOT_LIVE') {
    sendJson(res, 409, { ok: false, code: error.code, error: error.message })
    return
  }
  if (error?.code === 'APPROVAL_NOT_FOUND') {
    sendJson(res, 404, { ok: false, code: error.code, error: error.message })
    return
  }
  if (error?.code === 'APPROVAL_INVALID' || error?.code === 'RERUN_INVALID') {
    sendJson(res, 400, { ok: false, code: error.code, error: error.message })
    return
  }
  if (error?.code === 'CSRF_REQUIRED' || error?.code === 'ORIGIN_REJECTED') {
    sendJson(res, 403, { ok: false, code: error.code, error: error.message })
    return
  }
  if (error?.code === 'UNSUPPORTED_MEDIA_TYPE') {
    sendJson(res, 415, { ok: false, code: error.code, error: error.message })
    return
  }
  log?.('error', `API error: ${error instanceof Error ? error.message : String(error)}`)
  sendJson(res, 500, {
    ok: false,
    code: 'INTERNAL',
    error: error instanceof Error ? error.message : String(error ?? 'Internal error'),
  })
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
