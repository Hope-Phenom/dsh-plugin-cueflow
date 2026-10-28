/**
 * Browser API client. Uses same-origin fetch against the Host route; the
 * standalone UI harness replaces `globalThis.fetch` with a mock.
 */

export const API_BASE = '/api/dsh/dsh-plugin-cueflow'

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'API_ERROR', details } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    if (details !== undefined) this.details = details
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  })
  let body = null
  const text = await response.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      throw new ApiError(`Host returned non-JSON (${response.status}).`, {
        status: response.status,
        code: 'BAD_RESPONSE',
      })
    }
  }
  if (!response.ok || (body && body.ok === false)) {
    throw new ApiError(body?.error ?? `Request failed (${response.status}).`, {
      status: response.status,
      code: body?.code ?? 'HTTP_ERROR',
      details: body?.details,
    })
  }
  return body ?? {}
}

export function getHealth() {
  return request('/health')
}

export function getCatalog({ cwd, sessionId } = {}) {
  const query = new URLSearchParams()
  if (cwd) query.set('cwd', cwd)
  if (sessionId) query.set('sessionId', sessionId)
  const suffix = query.toString() ? `?${query}` : ''
  return request(`/catalog${suffix}`)
}

export function listWorkflows() {
  return request('/workflows')
}

export function getWorkflow(id) {
  return request(`/workflows/${encodeURIComponent(id)}`)
}

export function saveWorkflow(workflow) {
  return request('/workflows', {
    method: 'POST',
    body: JSON.stringify({ workflow }),
  })
}

export function deleteWorkflow(id) {
  return request(`/workflows/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function validate(workflow) {
  return request('/validate', {
    method: 'POST',
    body: JSON.stringify({ workflow }),
  })
}

export function startRun({ workflow, inputs, sessionId, cwd, concurrency }) {
  return request('/runs', {
    method: 'POST',
    body: JSON.stringify({ workflow, inputs, sessionId, cwd, concurrency }),
  })
}

export function getRun(id, after) {
  const query = after === undefined || after === null ? '' : `?after=${encodeURIComponent(after)}`
  return request(`/runs/${encodeURIComponent(id)}${query}`)
}

export function cancelRun(id) {
  return request(`/runs/${encodeURIComponent(id)}/cancel`, { method: 'POST' })
}

export function listRuns(limit = 20) {
  return request(`/runs?limit=${encodeURIComponent(limit)}`)
}
