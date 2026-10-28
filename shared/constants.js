/**
 * Shared, dependency-free constants for CueFlow.
 *
 * This module is imported by the Host, the browser bundle and Node tests.
 * It must never import React, Node builtins or any @deepseek-ai package.
 */

export const PLUGIN_ID = 'dsh-plugin-cueflow'
export const PLUGIN_VERSION = '0.1.0'
export const SCHEMA_VERSION = 1
export const API_PREFIX = '/api/dsh/dsh-plugin-cueflow'

export const LIMITS = Object.freeze({
  maxNodes: 200,
  maxEdges: 500,
  maxBodyBytes: 1024 * 1024,
  maxOutputChars: 20_000,
  maxPreviewChars: 4_000,
  maxEvents: 2_000,
  maxInMemoryRuns: 20,
  runRetention: 50,
  pollIntervalMs: 600,
  maxSkillChars: 200_000,
  maxLogsPerNode: 80,
  heartbeatMs: 10_000,
  workflowVersions: 20,
})

export const DEFAULT_APPROVAL_TIMEOUT_MS = 5 * 60 * 1000

/** Node types that can execute an arbitrary command/action and need approval. */
export const APPROVAL_NODE_TYPES = Object.freeze(['shell', 'command'])
export const APPROVAL_MODES = Object.freeze(['allow', 'ask', 'deny'])

export const DEFAULT_CONCURRENCY = 2
export const MIN_CONCURRENCY = 1
export const MAX_CONCURRENCY = 8

export const PORT_TYPES = Object.freeze(['text', 'json', 'number', 'boolean', 'any'])

export const PORT_COLORS = Object.freeze({
  text: '#6fb7c8',
  json: '#b79ce0',
  number: '#93a1b4',
  boolean: '#6fbf8f',
  any: '#e7edf5',
})

export const CATEGORY_COLORS = Object.freeze({
  io: '#e7b75f',
  transform: '#6fb7c8',
  agents: '#b79ce0',
  dsh: '#d98f5f',
  exec: '#6fbf8f',
  control: '#c9a36a',
  note: '#8a94a6',
})

export const RUN_STATUS = Object.freeze([
  'created',
  'queued',
  'running',
  'completed',
  'error',
  'cancelled',
])

export const TERMINAL_RUN_STATUS = Object.freeze(['completed', 'error', 'cancelled'])

export const NODE_STATUS = Object.freeze([
  'idle',
  'queued',
  'waiting-approval',
  'running',
  'success',
  'error',
  'skipped',
  'cancelled',
])

export const TERMINAL_NODE_STATUS = Object.freeze([
  'success',
  'error',
  'skipped',
  'cancelled',
])

export const DEFAULT_TIMEOUTS = Object.freeze({
  agent: 600_000,
  skill: 600_000,
  command: 120_000,
  shell: 120_000,
  'file-read': 30_000,
  template: 5_000,
  input: 5_000,
  condition: 5_000,
  merge: 5_000,
  output: 5_000,
})

export const DEFAULT_WORKFLOW_SETTINGS = Object.freeze({
  concurrency: DEFAULT_CONCURRENCY,
  cwd: '',
  defaultProvider: '',
  defaultModel: '',
  sessionMode: 'isolated',
  cancelPolicy: 'abort-all',
  workspace: '',
})

/** Whether a run status is terminal. */
export function isTerminalRun(status) {
  return TERMINAL_RUN_STATUS.includes(status)
}

/** Whether a node status is terminal. */
export function isTerminalNode(status) {
  return TERMINAL_NODE_STATUS.includes(status)
}

/** Clamp a concurrency value into the supported range. */
export function clampConcurrency(value, fallback = DEFAULT_CONCURRENCY) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(MIN_CONCURRENCY, Math.min(MAX_CONCURRENCY, Math.floor(n)))
}

/** Generate a short, URL/file-safe id. Not cryptographic. */
export function makeId(prefix = 'id', random = Math.random) {
  const body = Math.floor(random() * 36 ** 8).toString(36).padStart(8, '0').slice(-8)
  return `${prefix}_${body}`
}
