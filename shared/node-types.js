/**
 * CueFlow node registry — the single source of truth for ports, config fields,
 * defaults and categories. Shared by Host, browser UI and tests.
 *
 * Ports: { id, label, type, required?, default?, typeFrom? }
 * Fields: { key, label, kind, placeholder?, hint?, options?, rows?, min?, max?, step? }
 *
 * `typeFrom` means the port type is read from config[typeFrom] (Input node).
 */

import { CATEGORY_COLORS, DEFAULT_TIMEOUTS, PORT_TYPES, makeId } from './constants.js'

/** @typedef {'text'|'json'|'number'|'boolean'|'any'} PortType */

const VALUE_TYPE_OPTIONS = ['text', 'json', 'number', 'boolean']

function field(key, label, kind = 'text', extra = {}) {
  return { key, label, kind, ...extra }
}

/** @type {Record<string, object>} */
export const NODE_TYPES = Object.freeze({
  input: {
    type: 'input',
    title: 'Input',
    category: 'io',
    description: 'Expose one run input as a typed value.',
    inputs: [],
    outputs: [{ id: 'value', label: 'value', type: 'any', typeFrom: 'valueType' }],
    fields: [
      field('label', 'Label', 'text', { placeholder: 'Task', hint: 'Shown in the run dialog.' }),
      field('valueType', 'Value type', 'select', { options: VALUE_TYPE_OPTIONS, hint: 'Port type and runtime coercion.' }),
      field('defaultValue', 'Default value', 'textarea', { rows: 3, hint: 'Used when the run dialog leaves the field empty.' }),
      field('placeholder', 'Placeholder', 'text', { placeholder: 'Describe the task…' }),
      field('required', 'Required', 'boolean', { hint: 'Block the run when this input is empty.' }),
      field('options', 'Options', 'text', { placeholder: 'one, two, three', hint: 'Comma-separated values render a select box.' }),
    ],
    defaults: {
      label: 'Input',
      valueType: 'text',
      defaultValue: '',
      placeholder: '',
      required: true,
      options: '',
    },
  },

  template: {
    type: 'template',
    title: 'Template',
    category: 'transform',
    description: 'Interpolate upstream values into text.',
    inputs: [{ id: 'value', label: 'value', type: 'any', required: false }],
    outputs: [{ id: 'text', label: 'text', type: 'text' }],
    fields: [
      field('template', 'Template', 'textarea', {
        rows: 6,
        placeholder: 'Summarize this diff:\n\n{{input}}',
        hint: 'Use {{input}} or {{nodeId.portId}}; unknown tokens are preserved.',
      }),
      field('trim', 'Trim whitespace', 'boolean'),
    ],
    defaults: { template: '', trim: true },
  },

  agent: {
    type: 'agent',
    title: 'Agent',
    category: 'agents',
    description: 'Run a subagent with a prompt and optional structured output.',
    inputs: [
      { id: 'prompt', label: 'prompt', type: 'text', required: false },
      { id: 'context', label: 'context', type: 'any', required: false },
    ],
    outputs: [
      { id: 'text', label: 'text', type: 'text' },
      { id: 'json', label: 'json', type: 'json' },
    ],
    fields: [
      field('prompt', 'Prompt', 'textarea', { rows: 7, placeholder: 'Implement the requested change…', hint: 'A connected prompt input overrides this.' }),
      field('instructions', 'Workflow instructions', 'textarea', { rows: 3, placeholder: 'Read the repository before editing. Keep the diff focused.', hint: 'Prepended as <workflow_instructions>.' }),
      field('provider', 'Provider', 'text', { placeholder: 'inherit parent' }),
      field('model', 'Model', 'text', { placeholder: 'inherit parent' }),
      field('reasoningEffort', 'Reasoning effort', 'text', { placeholder: 'inherit parent' }),
      field('agentPreset', 'Agent preset', 'text', { placeholder: 'inherit parent' }),
      field('outputSchema', 'Output JSON Schema', 'json', { rows: 5, placeholder: '{\n  "type": "object",\n  "properties": {}\n}' }),
      field('parseJson', 'Parse text as JSON', 'boolean'),
      field('allowPartial', 'Accept partial output on max-tokens', 'boolean'),
      field('timeoutMs', 'Timeout (ms)', 'number', { min: 1000, step: 1000 }),
    ],
    defaults: {
      prompt: '',
      instructions: '',
      provider: '',
      model: '',
      reasoningEffort: '',
      agentPreset: '',
      outputSchema: '',
      parseJson: false,
      allowPartial: false,
      timeoutMs: DEFAULT_TIMEOUTS.agent,
    },
  },

  skill: {
    type: 'skill',
    title: 'Skill',
    category: 'agents',
    description: 'Load a DSH Skill (model- or user-invocable) and run it in a subagent.',
    inputs: [
      { id: 'input', label: 'input', type: 'text', required: false },
      { id: 'context', label: 'context', type: 'any', required: false },
    ],
    outputs: [
      { id: 'text', label: 'text', type: 'text' },
      { id: 'json', label: 'json', type: 'json' },
    ],
    fields: [
      field('skill', 'Skill', 'skill', { hint: 'User-only skills are allowed: CueFlow is a trusted caller.' }),
      field('instructions', 'Workflow instructions', 'textarea', { rows: 3 }),
      field('provider', 'Provider', 'text', { placeholder: 'inherit parent' }),
      field('model', 'Model', 'text', { placeholder: 'inherit parent' }),
      field('reasoningEffort', 'Reasoning effort', 'text', { placeholder: 'inherit parent' }),
      field('outputSchema', 'Output JSON Schema', 'json', { rows: 5 }),
      field('parseJson', 'Parse text as JSON', 'boolean'),
      field('timeoutMs', 'Timeout (ms)', 'number', { min: 1000, step: 1000 }),
    ],
    defaults: {
      skill: '',
      instructions: '',
      provider: '',
      model: '',
      reasoningEffort: '',
      outputSchema: '',
      parseJson: false,
      timeoutMs: DEFAULT_TIMEOUTS.skill,
    },
  },

  command: {
    type: 'command',
    title: 'Command',
    category: 'dsh',
    description: 'Run a DSH slash command against a live session. Does not send it to the model.',
    inputs: [{ id: 'input', label: 'input', type: 'text', required: false }],
    outputs: [
      { id: 'text', label: 'text', type: 'text' },
      { id: 'json', label: 'json', type: 'json' },
    ],
    fields: [
      field('command', 'Command', 'command', { hint: 'Without the leading slash.' }),
      field('fallbackInput', 'Fallback input', 'textarea', { rows: 3, hint: 'Used when the input port is not connected.' }),
      field('timeoutMs', 'Timeout (ms)', 'number', { min: 1000, step: 1000 }),
    ],
    defaults: {
      command: '',
      fallbackInput: '',
      timeoutMs: DEFAULT_TIMEOUTS.command,
    },
  },

  shell: {
    type: 'shell',
    title: 'Shell',
    category: 'exec',
    description: 'Run a shell command through DSH (subprocess/sandbox policy applies).',
    inputs: [
      { id: 'command', label: 'command', type: 'text', required: false },
      { id: 'stdin', label: 'stdin', type: 'text', required: false },
    ],
    outputs: [
      { id: 'stdout', label: 'stdout', type: 'text' },
      { id: 'stderr', label: 'stderr', type: 'text' },
      { id: 'exitCode', label: 'exitCode', type: 'number' },
      { id: 'text', label: 'text', type: 'text' },
    ],
    fields: [
      field('command', 'Command', 'textarea', { rows: 3, placeholder: 'git diff --stat', hint: 'A connected command input overrides this.' }),
      field('workdir', 'Working directory', 'text', { placeholder: 'run working directory' }),
      field('timeoutMs', 'Timeout (ms)', 'number', { min: 1000, step: 1000 }),
      field('failOnNonZero', 'Fail on non-zero exit', 'boolean'),
      field('maxOutputChars', 'Max output characters', 'number', { min: 1000, step: 1000 }),
    ],
    defaults: {
      command: '',
      workdir: '',
      timeoutMs: DEFAULT_TIMEOUTS.shell,
      failOnNonZero: true,
      maxOutputChars: 20_000,
    },
  },

  'file-read': {
    type: 'file-read',
    title: 'Read File',
    category: 'io',
    description: 'Read a text file through DSH fs (no writes).',
    inputs: [{ id: 'path', label: 'path', type: 'text', required: false }],
    outputs: [
      { id: 'text', label: 'text', type: 'text' },
      { id: 'info', label: 'info', type: 'json' },
    ],
    fields: [
      field('path', 'Path', 'text', { placeholder: 'src/index.ts', hint: 'Relative to the run working directory, or absolute.' }),
      field('maxChars', 'Max characters', 'number', { min: 1000, step: 1000 }),
    ],
    defaults: { path: '', maxChars: 200_000 },
  },

  condition: {
    type: 'condition',
    title: 'Condition',
    category: 'control',
    description: 'Route a value into a true or false branch.',
    inputs: [{ id: 'value', label: 'value', type: 'any', required: true }],
    outputs: [
      { id: 'true', label: 'true', type: 'any' },
      { id: 'false', label: 'false', type: 'any' },
    ],
    fields: [
      field('operator', 'Operator', 'select', {
        options: ['truthy', 'falsy', 'equals', 'notEquals', 'contains', 'regex', 'gt', 'lt', 'always'],
      }),
      field('compare', 'Compare with', 'text', { placeholder: 'value or regular expression' }),
      field('caseSensitive', 'Case sensitive', 'boolean'),
    ],
    defaults: { operator: 'truthy', compare: '', caseSensitive: true },
  },

  merge: {
    type: 'merge',
    title: 'Merge',
    category: 'control',
    description: 'Combine optional branches into one value.',
    inputs: [
      { id: 'a', label: 'a', type: 'any', required: false },
      { id: 'b', label: 'b', type: 'any', required: false },
      { id: 'c', label: 'c', type: 'any', required: false },
      { id: 'd', label: 'd', type: 'any', required: false },
    ],
    outputs: [{ id: 'value', label: 'value', type: 'any' }],
    fields: [
      field('mode', 'Mode', 'select', { options: ['first', 'array', 'concat'] }),
      field('separator', 'Separator', 'text', { placeholder: '\\n\\n' }),
    ],
    defaults: { mode: 'first', separator: '\n\n' },
  },

  output: {
    type: 'output',
    title: 'Output',
    category: 'io',
    description: 'Collect a final result for the run panel.',
    inputs: [{ id: 'value', label: 'value', type: 'any', required: true }],
    outputs: [],
    fields: [
      field('name', 'Name', 'text', { placeholder: 'Output' }),
      field('format', 'Format', 'select', { options: ['text', 'json'] }),
      field('previewLines', 'Preview lines', 'number', { min: 1, max: 40 }),
    ],
    defaults: { name: 'Output', format: 'text', previewLines: 12 },
  },

  note: {
    type: 'note',
    title: 'Note',
    category: 'note',
    description: 'Canvas annotation. Never executes.',
    inputs: [],
    outputs: [],
    fields: [
      field('text', 'Text', 'textarea', { rows: 5, placeholder: 'Why this branch exists…' }),
      field('color', 'Color', 'select', { options: ['amber', 'gray', 'blue', 'green', 'rose'] }),
    ],
    defaults: { text: '', color: 'amber' },
    executable: false,
  },
})

/** Node types in library order. */
export const NODE_TYPE_LIST = Object.freeze(Object.values(NODE_TYPES))

/** Categories in library order. */
export const NODE_CATEGORIES = Object.freeze([
  { id: 'io', title: 'Input / Output', color: CATEGORY_COLORS.io },
  { id: 'transform', title: 'Transform', color: CATEGORY_COLORS.transform },
  { id: 'agents', title: 'Agents', color: CATEGORY_COLORS.agents },
  { id: 'dsh', title: 'DSH', color: CATEGORY_COLORS.dsh },
  { id: 'exec', title: 'Execution', color: CATEGORY_COLORS.exec },
  { id: 'control', title: 'Control', color: CATEGORY_COLORS.control },
  { id: 'note', title: 'Notes', color: CATEGORY_COLORS.note },
])

/** Resolve a node type definition; throws on unknown. */
export function getNodeType(type) {
  const def = NODE_TYPES[type]
  if (!def) throw new Error(`Unknown node type: ${type}`)
  return def
}

/** Whether the type exists. */
export function hasNodeType(type) {
  return Object.prototype.hasOwnProperty.call(NODE_TYPES, type)
}

/** Merge defaults with a config, keeping unknown keys for forward compatibility. */
export function normalizeConfig(type, config) {
  const def = getNodeType(type)
  return { ...def.defaults, ...(isPlainObject(config) ? config : {}) }
}

/** Resolve a port's effective type for one node config. */
export function resolvePortType(port, config) {
  if (port.typeFrom && config && VALUE_TYPE_OPTIONS.includes(config[port.typeFrom])) {
    return config[port.typeFrom]
  }
  return PORT_TYPES.includes(port.type) ? port.type : 'any'
}

/** Resolve inputs for a node type/config. */
export function getInputs(type, config) {
  const def = getNodeType(type)
  return def.inputs.map(port => ({ ...port, type: resolvePortType(port, config) }))
}

/** Resolve outputs for a node type/config. */
export function getOutputs(type, config) {
  const def = getNodeType(type)
  return def.outputs.map(port => ({ ...port, type: resolvePortType(port, config) }))
}

/** Find a port by id and direction. */
export function findPort(type, config, portId, direction) {
  const ports = direction === 'in' ? getInputs(type, config) : getOutputs(type, config)
  return ports.find(port => port.id === portId)
}

/** Create a node instance with defaults and a stable id. */
export function createNode(type, options = {}) {
  const def = getNodeType(type)
  return {
    id: options.id || makeId('n'),
    type,
    title: typeof options.title === 'string' && options.title.trim() ? options.title : def.title,
    position: normalizePosition(options.position),
    config: normalizeConfig(type, options.config),
    disabled: options.disabled === true,
  }
}

/** Normalize a position to finite numbers. */
export function normalizePosition(position) {
  const x = Number(position?.x)
  const y = Number(position?.y)
  return {
    x: Number.isFinite(x) ? Math.round(x) : 0,
    y: Number.isFinite(y) ? Math.round(y) : 0,
  }
}

/** Public metadata safe to send to the browser (no functions). */
export function getNodeTypeCatalog() {
  return NODE_TYPE_LIST.map(def => ({
    type: def.type,
    title: def.title,
    category: def.category,
    description: def.description,
    inputs: def.inputs.map(port => ({ ...port })),
    outputs: def.outputs.map(port => ({ ...port })),
    fields: def.fields.map(f => ({ ...f })),
    defaults: { ...def.defaults },
    executable: def.executable !== false,
    timeoutMs: DEFAULT_TIMEOUTS[def.type] ?? 30_000,
  }))
}

/** Rough height used before the DOM measures a node. */
export function estimateNodeHeight(type, config) {
  const def = NODE_TYPES[type]
  if (!def) return 120
  if (type === 'note') return 140
  const rows = Math.max(def.inputs.length, def.outputs.length)
  const hasPreview = type === 'output' || type === 'agent' || type === 'skill' || type === 'command' || type === 'shell' || type === 'template'
  return 36 + 12 + rows * 24 + (hasPreview ? 58 : 10)
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
