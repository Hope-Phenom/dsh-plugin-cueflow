/**
 * DSH capability adapters for CueFlow node types.
 *
 * Every DSH service is injected through `getServices()`; this module imports
 * only Node builtins and shared pure helpers. That keeps the adapter layer
 * unit-testable with plain mocks and avoids runtime imports of @deepseek-ai/*.
 */

import { randomUUID } from 'node:crypto'

import { LIMITS } from '../../shared/constants.js'
import { interpolate } from '../../shared/template.js'
import { stringifyValue, truncateText, tryParseJson } from '../../shared/values.js'

/**
 * @param {object} options
 * @param {() => object} options.getServices - returns current services, each optional
 * @param {(level:string,message:string,error?:unknown) => void=} options.log
 */
export function createAdapters({ getServices, log }) {
  return {
    executeNode: (node, inputs, context) => executeNode(node, inputs, context, { getServices, log }),
  }
}

async function executeNode(node, inputs, context, env) {
  const services = env.getServices?.() ?? {}
  switch (node.type) {
    case 'input':
      return executeInput(node, inputs, context)
    case 'template':
      return executeTemplate(node, inputs, context)
    case 'agent':
      return executeAgent(node, inputs, context, services, env)
    case 'skill':
      return executeSkill(node, inputs, context, services, env)
    case 'command':
      return executeCommand(node, inputs, context, services)
    case 'shell':
      return executeShell(node, inputs, context, services)
    case 'file-read':
      return executeFileRead(node, inputs, context, services)
    case 'condition':
      return executeCondition(node, inputs)
    case 'merge':
      return executeMerge(node, inputs)
    case 'output':
      return executeOutput(node, inputs)
    case 'note':
      return { outputs: {} }
    default:
      throw nodeError('NODE_TYPE_UNKNOWN', `Unknown node type "${node.type}".`)
  }
}

function executeInput(node, inputs, context) {
  const raw = context.run?.inputs?.[node.id] ?? node.config.defaultValue ?? ''
  const target = node.config.valueType || 'text'
  let value
  if (raw === '' || raw === undefined || raw === null) {
    if (node.config.required !== false) {
      throw nodeError('INPUT_REQUIRED', `Input "${node.config.label || node.title}" is required.`, {
        nodeId: node.id,
      })
    }
    value = target === 'json' ? null : target === 'number' ? 0 : target === 'boolean' ? false : ''
  } else if (target === 'json' && typeof raw !== 'string') {
    value = raw
  } else if (target === 'json') {
    const parsed = tryParseJson(raw)
    if (parsed === undefined) throw nodeError('INPUT_INVALID', `Input "${node.config.label || node.title}" is not valid JSON.`)
    value = parsed
  } else if (target === 'number') {
    const n = Number(raw)
    if (!Number.isFinite(n)) throw nodeError('INPUT_INVALID', `Input "${node.config.label || node.title}" is not a number.`)
    value = n
  } else if (target === 'boolean') {
    if (raw === true || raw === 'true') value = true
    else if (raw === false || raw === 'false') value = false
    else throw nodeError('INPUT_INVALID', `Input "${node.config.label || node.title}" is not a boolean.`)
  } else {
    value = String(raw)
  }

  const options = String(node.config.options ?? '').split(',').map(option => option.trim()).filter(Boolean)
  if (options.length && !options.includes(String(value))) {
    throw nodeError('INPUT_NOT_IN_OPTIONS', `Input "${node.config.label || node.title}" must be one of: ${options.join(', ')}.`)
  }
  return { outputs: { value } }
}

function executeTemplate(node, inputs, context) {
  const template = node.config.template
  const rendered = template
    ? interpolate(template, { input: inputs.value, values: context.values, vars: context.run?.vars })
    : { text: stringifyValue(inputs.value), missing: [] }
  const text = node.config.trim === false ? rendered.text : rendered.text.trim()
  return {
    outputs: { text },
    logs: rendered.missing.length
      ? [{ message: `Unknown template tokens: ${rendered.missing.join(', ')}`, data: { missing: rendered.missing } }]
      : [],
  }
}

async function executeAgent(node, inputs, context, services, env) {
  const prompt = inputs.prompt !== undefined ? stringifyValue(inputs.prompt) : node.config.prompt
  if (!prompt || !String(prompt).trim()) {
    throw nodeError('PROMPT_REQUIRED', 'Agent node has no prompt. Fill config.prompt or connect a prompt input.')
  }
  const text = composeAgentPrompt({
    instructions: node.config.instructions,
    context: inputs.context,
    task: prompt,
  })
  return runAgentNode(node, text, context, services, env)
}

async function executeSkill(node, inputs, context, services, env) {
  const skills = services.skills
  if (!skills) throw capabilityError('skills', 'Skill registry is not available in this DSH composition.')
  const name = String(node.config.skill ?? '').trim()
  if (!name) throw nodeError('SKILL_REQUIRED', 'Skill node has no skill selected.')

  let definition
  try {
    definition = await skills.get(name, {
      ...(context.cwd ? { cwd: context.cwd } : {}),
      signal: context.signal,
    })
  } catch (error) {
    if (isAbort(error)) throw abortError()
    throw nodeError('SKILL_LOAD_FAILED', `Could not load skill "${name}": ${errorMessage(error)}`)
  }
  if (!definition) {
    const names = await safeSkillNames(skills, context)
    const close = closestNames(name, names)
    throw nodeError(
      'SKILL_NOT_FOUND',
      `Skill "${name}" was not found.${close.length ? ` Closest: ${close.join(', ')}.` : ''}`,
      { available: close },
    )
  }
  definition = { ...definition, content: String(definition.content ?? '') }
  if (definition.content.length > LIMITS.maxSkillChars) {
    throw nodeError(
      'SKILL_TOO_LARGE',
      `Skill "${name}" is ${definition.content.length} characters; the limit is ${LIMITS.maxSkillChars}.`,
    )
  }

  const invocation = definition.invocation ?? { modelInvocable: true, userInvocable: true }
  const task = inputs.input !== undefined ? stringifyValue(inputs.input) : ''
  const composed = [
    `<skill_content name="${escapeAttribute(name)}">`,
    definition.content,
    '</skill_content>',
    node.config.instructions ? `<workflow_instructions>${node.config.instructions}</workflow_instructions>` : '',
    `<workflow_task>${task}</workflow_task>`,
    inputs.context !== undefined ? `<context>${stringifyValue(inputs.context)}</context>` : '',
  ].filter(Boolean).join('\n\n')

  const result = await runAgentNode(node, composed, context, services, env)
  result.logs = [
    {
      message: `Loaded skill "${name}" (modelInvocable=${invocation.modelInvocable}, userInvocable=${invocation.userInvocable}, source=${definition.source ?? 'unknown'}).`,
      data: { skill: name, invocation, source: definition.source ?? '' },
    },
    ...(result.logs ?? []),
  ]
  return result
}

async function runAgentNode(node, promptText, context, services, env) {
  const agents = services.agents
  const subagents = services.subagents
  if (!agents) throw capabilityError('agents', 'Agent registry is not available in this DSH composition.')
  if (!subagents) throw capabilityError('subagents', 'Subagent runtime is not available in this DSH composition.')

  const parent = resolveParent(agents, context.sessionId)
  if (!parent) {
    throw capabilityError(
      'agents',
      'No live DSH session is available as the parent. Open a session first, then run the workflow.',
    )
  }

  const chosen = chooseProvider(subagents)
  if (!chosen) {
    throw capabilityError('subagents', 'No subagent provider is available (expected spawn or fork).')
  }
  const { name: providerName, provider } = chosen
  const schema = parseOutputSchema(node.config.outputSchema)
  const agentOptions = {}
  if (node.config.provider) agentOptions.provider = String(node.config.provider)
  if (node.config.model) agentOptions.model = String(node.config.model)
  if (node.config.reasoningEffort) agentOptions.reasoningEffort = String(node.config.reasoningEffort)

  const childId = `session-${randomUUID()}`
  const isLocal = typeof provider.prepareContinuable === 'function'
  if (node.config.agentPreset && !provider.capabilities?.agentPreset) {
    throw nodeError(
      'AGENT_PRESET_UNSUPPORTED',
      `Subagent provider "${providerName}" does not support an independent agent preset.`,
    )
  }
  const request = {
    parent,
    prompt: [{ type: 'text', text: promptText }],
    ...(context.cwd ? { cwd: context.cwd } : {}),
    ...(node.config.agentPreset ? { agentPreset: String(node.config.agentPreset) } : {}),
    ...(Object.keys(agentOptions).length && provider.capabilities?.agentOptions ? { agentOptions } : {}),
    ...(schema && provider.capabilities?.outputSchema ? { outputSchema: schema } : {}),
  }

  let activation
  try {
    activation = await subagents.startActivation({
      provider: providerName,
      label: String(node.title || node.type).slice(0, 80),
      ...(isLocal ? { childId } : {}),
      delivery: 'caller',
      signal: context.signal,
      request,
    })
  } catch (error) {
    if (isAbort(error)) throw abortError()
    throw nodeError('AGENT_START_FAILED', `Could not start subagent: ${errorMessage(error)}`)
  }

  let result
  let disposed = false
  const dispose = async () => {
    if (disposed) return
    disposed = true
    try {
      await activation.dispose()
    } catch (error) {
      env.log?.('warn', `subagent dispose failed: ${errorMessage(error)}`)
    }
  }
  let onAbort = null
  const aborted = new Promise((_, reject) => {
    onAbort = () => {
      void dispose()
      reject(abortError())
    }
    if (context.signal?.aborted) onAbort()
    else context.signal?.addEventListener('abort', onAbort, { once: true })
  })
  try {
    result = await Promise.race([Promise.resolve(activation.result), aborted])
  } finally {
    if (onAbort) context.signal?.removeEventListener('abort', onAbort)
    await dispose()
  }

  const stopReason = result?.stopReason ?? 'error'
  const text = contentBlocksToText(result?.output)
  if (stopReason === 'aborted') throw abortError()
  if (stopReason === 'max-tokens' && node.config.allowPartial !== true) {
    throw nodeError('AGENT_MAX_TOKENS', 'Subagent hit its token limit before finishing. Enable "Accept partial output" or raise the limit.', {
      diagnostic: result?.diagnostic,
    })
  }
  if (stopReason !== 'completed' && stopReason !== 'max-tokens') {
    throw nodeError(
      'AGENT_FAILED',
      `Subagent ended with ${stopReason}${result?.diagnostic ? `: ${result.diagnostic}` : '.'}`,
      { stopReason, diagnostic: result?.diagnostic },
    )
  }

  let json = result?.structured
  if (json === undefined && node.config.parseJson === true) json = tryParseJson(text)
  return {
    outputs: { text, json: json === undefined ? null : json },
    meta: { childId: activation.childId ?? childId, stopReason },
    logs: [{ message: `Subagent ${activation.childId ?? childId} finished (${stopReason}).`, data: { childId: activation.childId ?? childId, stopReason } }],
  }
}

async function executeCommand(node, inputs, context, services) {
  const commands = services.commands
  if (!commands) throw capabilityError('commands', 'Command registry is not available in this DSH composition.')
  const name = String(node.config.command ?? '').trim().replace(/^\//, '')
  if (!name) throw nodeError('COMMAND_REQUIRED', 'Command node has no command selected.')
  const parent = resolveParent(services.agents, context.sessionId)
  if (!parent) throw capabilityError('agents', 'A live DSH session is required to run a command.')

  const rawInput = inputs.input !== undefined ? stringifyValue(inputs.input) : String(node.config.fallbackInput ?? '')
  const line = `/${name}${rawInput ? ` ${rawInput}` : ''}`

  let result
  let fallback = false
  if (typeof commands.execute === 'function') {
    let execution
    try {
      execution = await commands.execute(parent, line, [], context.signal)
    } catch (error) {
      if (isAbort(error)) throw abortError()
      throw nodeError('COMMAND_FAILED', `Command /${name} failed: ${errorMessage(error)}`)
    }
    if (execution === undefined) {
      throw nodeError('COMMAND_NOT_FOUND', `Command /${name} is not registered for this session.`)
    }
    result = execution.result ?? execution
  } else {
    fallback = true
    const definition = commands.find(parent, name)
    if (!definition) throw nodeError('COMMAND_NOT_FOUND', `Command /${name} is not registered for this session.`)
    try {
      result = await definition.handler({
        commandId: randomUUID(),
        agent: parent,
        rawInput,
        attachments: [],
        signal: context.signal,
      })
    } catch (error) {
      if (isAbort(error)) throw abortError()
      throw nodeError('COMMAND_FAILED', `Command /${name} failed: ${errorMessage(error)}`)
    }
  }

  if (result && result.kind === 'error') {
    throw nodeError('COMMAND_FAILED', result.text || `Command /${name} failed.`)
  }
  const text = typeof result === 'string' ? result : String(result?.text ?? '')
  return {
    outputs: { text, json: tryParseJson(text) ?? null },
    logs: [
      ...(fallback ? [{ message: `Command /${name} used adapter:fallback (find + handler).` }] : []),
      { message: `Command /${name} finished.`, data: { command: name, length: text.length } },
    ],
  }
}

async function executeShell(node, inputs, context, services) {
  const shell = services.shell
  if (!shell) throw capabilityError('shell', 'Shell executor is not available in this DSH composition.')
  const command = inputs.command !== undefined ? stringifyValue(inputs.command) : String(node.config.command ?? '')
  if (!command.trim()) throw nodeError('COMMAND_REQUIRED', 'Shell node has no command. Fill config.command or connect a command input.')
  const workdir = String(node.config.workdir || context.cwd || '')
  const timeoutMs = Number(node.config.timeoutMs) > 0 ? Number(node.config.timeoutMs) : 120_000
  const sandboxPolicy = resolveShellSandboxPolicy(services, context)
  const spec = shell.resolve({
    command,
    ...(workdir ? { workdir } : {}),
    timeoutMs,
    signal: context.signal,
    ...(inputs.stdin !== undefined ? { stdin: stringifyValue(inputs.stdin) } : {}),
    ...(sandboxPolicy ? { sandboxPolicy } : {}),
    stdoutMaxBytes: 256 * 1024,
  })
  let execution
  try {
    execution = await shell.execute(spec)
  } catch (error) {
    if (isAbort(error)) throw abortError()
    throw nodeError('SHELL_SPAWN_FAILED', `Could not start shell command: ${errorMessage(error)}`)
  }
  const result = await resolveShellResult(execution)
  if (result?.timedOut) throw nodeError('SHELL_TIMEOUT', `Shell command timed out after ${timeoutMs} ms.`)
  if (result?.aborted) throw abortError()
  const stdout = outputText(result?.stdout)
  const stderr = outputText(result?.stderr)
  const exitCode = typeof result?.exitCode === 'number' ? result.exitCode : null
  if (node.config.failOnNonZero !== false && exitCode !== 0) {
    throw nodeError(
      'SHELL_EXIT_NONZERO',
      `Shell command exited with ${exitCode === null ? 'a signal' : exitCode}.${stderr ? `\n${truncateText(stderr, 2000).text}` : ''}`,
      { exitCode, stderr: truncateText(stderr, 2000).text },
    )
  }
  const combined = stderr ? `${stdout}\n[stderr]\n${stderr}` : stdout
  const limited = truncateText(combined, Number(node.config.maxOutputChars) || 20_000)
  return {
    outputs: {
      stdout: truncateText(stdout, Number(node.config.maxOutputChars) || 20_000).text,
      stderr: truncateText(stderr, Number(node.config.maxOutputChars) || 20_000).text,
      exitCode: exitCode ?? 0,
      text: limited.text,
    },
    logs: limited.truncated ? [{ message: `Shell output truncated (${limited.omitted} chars omitted).` }] : [],
  }
}

/**
 * Resolve the per-call sandbox policy for a Shell node.
 *
 * DSH's own bash tool resolves this from the calling session. CueFlow has a
 * workflow-level cwd and an optional live parent Agent, so:
 *  - live session: use its immutable cwd and sandbox/mode (the authoritative path);
 *  - no session: keep the deployment mode but use the workflow cwd as the
 *    workspace-write boundary, so a project directory workflow does not fall
 *    back to the DSH process home.
 */
function resolveShellSandboxPolicy(services, context) {
  const policy = services.sandboxPolicy
  if (!policy || typeof policy.resolve !== 'function') return undefined
  try {
    const parent = resolveParent(services.agents, context.sessionId)
    if (parent?.session) return policy.resolve({ session: parent.session })
    const fallback = policy.resolve({})
    return context.cwd ? { ...fallback, workspaceRoot: context.cwd } : fallback
  } catch {
    return undefined
  }
}

async function executeFileRead(node, inputs, context, services) {
  const fs = services.fs
  if (!fs) throw capabilityError('fs', 'Filesystem service is not available in this DSH composition.')
  const path = inputs.path !== undefined ? stringifyValue(inputs.path) : String(node.config.path ?? '')
  if (!path.trim()) throw nodeError('PATH_REQUIRED', 'Read File node has no path.')
  let target
  try {
    target = await fs.resolve(path, { ...(context.cwd ? { cwd: context.cwd } : {}), signal: context.signal })
  } catch (error) {
    if (isAbort(error)) throw abortError()
    throw nodeError('FILE_RESOLVE_FAILED', `Could not resolve "${path}": ${errorMessage(error)}`)
  }
  const info = await fs.stat(target, context.signal)
  if (!info) throw nodeError('FILE_NOT_FOUND', `File "${path}" does not exist.`)
  if (info.type !== 'file') throw nodeError('NOT_A_FILE', `"${path}" is a ${info.type}, not a file.`)
  let text
  try {
    text = await fs.readText(target, context.signal)
  } catch (error) {
    if (isAbort(error)) throw abortError()
    throw nodeError('FILE_READ_FAILED', `Could not read "${path}": ${errorMessage(error)}`)
  }
  const max = Number(node.config.maxChars) || 200_000
  const limited = truncateText(text, max)
  return {
    outputs: {
      text: limited.text,
      info: { path, size: info.size ?? text.length, truncated: limited.truncated },
    },
    logs: limited.truncated ? [{ message: `File output truncated (${limited.omitted} chars omitted).` }] : [],
  }
}

function executeCondition(node, inputs) {
  const value = inputs.value
  const operator = node.config.operator || 'truthy'
  const compare = String(node.config.compare ?? '')
  const caseSensitive = node.config.caseSensitive !== false
  const text = stringifyValue(value)
  const haystack = caseSensitive ? text : text.toLowerCase()
  const needle = caseSensitive ? compare : compare.toLowerCase()
  let matched
  switch (operator) {
    case 'truthy':
      matched = Boolean(value)
      break
    case 'falsy':
      matched = !value
      break
    case 'equals':
      matched = numericPair(value, compare) ?? (caseSensitive ? text === compare : haystack === needle)
      break
    case 'notEquals':
      matched = !(numericPair(value, compare) ?? (caseSensitive ? text === compare : haystack === needle))
      break
    case 'contains':
      matched = haystack.includes(needle)
      break
    case 'regex': {
      let regex
      try {
        regex = new RegExp(compare, caseSensitive ? '' : 'i')
      } catch (error) {
        throw nodeError('INVALID_REGEX', `Invalid regex "${compare}": ${errorMessage(error)}`)
      }
      matched = regex.test(text)
      break
    }
    case 'gt':
    case 'lt': {
      const a = Number(value)
      const b = Number(compare)
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        throw nodeError('COMPARE_NOT_NUMBER', `Condition "${operator}" needs numbers, got "${text}" and "${compare}".`)
      }
      matched = operator === 'gt' ? a > b : a < b
      break
    }
    case 'always':
      matched = true
      break
    default:
      throw nodeError('OPERATOR_UNKNOWN', `Unknown condition operator "${operator}".`)
  }
  return { outputs: matched ? { true: value } : { false: value } }
}

function executeMerge(node, inputs) {
  const values = ['a', 'b', 'c', 'd'].map(key => inputs[key]).filter(value => value !== undefined && value !== null)
  const mode = node.config.mode || 'first'
  if (mode === 'array') return { outputs: { value: values } }
  if (mode === 'concat') {
    return { outputs: { value: values.map(stringifyValue).join(node.config.separator ?? '\n\n') } }
  }
  return { outputs: { value: values[0] } }
}

function executeOutput(node, inputs) {
  if (inputs.value === undefined) return { outputs: {} }
  const format = node.config.format === 'json' ? 'json' : 'text'
  const value = format === 'json' && typeof inputs.value !== 'string'
    ? JSON.stringify(inputs.value, null, 2)
    : stringifyValue(inputs.value)
  return {
    outputs: { value },
    runOutput: {
      name: node.config.name || node.title || 'Output',
      format,
      value,
    },
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function composeAgentPrompt({ instructions, context, task }) {
  return [
    instructions ? `<workflow_instructions>${instructions}</workflow_instructions>` : '',
    context !== undefined ? `<context>${stringifyValue(context)}</context>` : '',
    `<workflow_task>${task}</workflow_task>`,
  ].filter(Boolean).join('\n\n')
}

function resolveParent(agents, sessionId) {
  if (!agents) return null
  if (sessionId && typeof agents.get === 'function') {
    const exact = agents.get(sessionId)
    if (exact) return exact
  }
  const list = typeof agents.list === 'function' ? agents.list() : []
  return list.length ? list[list.length - 1] : null
}

function chooseProvider(subagents) {
  const names = typeof subagents.list === 'function' ? subagents.list() : []
  const order = ['spawn', 'fork']
  const name = order.find(candidate => names.includes(candidate)) ?? names[0]
  if (!name) return null
  const provider = typeof subagents.getProvider === 'function' ? subagents.getProvider(name) : null
  if (!provider) return null
  return { name, provider }
}

function parseOutputSchema(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return undefined
  const parsed = tryParseJson(text)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw nodeError('INVALID_OUTPUT_SCHEMA', 'Output schema must be a JSON object.')
  }
  return parsed
}

function contentBlocksToText(blocks) {
  if (!Array.isArray(blocks)) return ''
  return blocks
    .filter(block => block && block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('')
}

function outputText(output) {
  if (output === undefined || output === null) return ''
  if (typeof output === 'string') return output
  if (typeof output.text === 'string') return output.text
  return stringifyValue(output)
}

async function resolveShellResult(execution) {
  if (!execution) return {}
  const candidate = execution.result ?? execution.done ?? execution
  if (typeof candidate === 'function') return await candidate()
  return await candidate
}

async function safeSkillNames(skills, context) {
  try {
    const list = await skills.list({ ...(context.cwd ? { cwd: context.cwd } : {}), signal: context.signal })
    return Array.isArray(list) ? list.map(skill => skill.name).filter(Boolean) : []
  } catch {
    return []
  }
}

function closestNames(target, names) {
  return names
    .map(name => ({ name, distance: editDistance(target.toLowerCase(), name.toLowerCase()) }))
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name))
    .slice(0, 3)
    .map(entry => entry.name)
}

function editDistance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => i)
  for (let j = 1; j <= b.length; j += 1) {
    let previous = rows[0]
    rows[0] = j
    for (let i = 1; i <= a.length; i += 1) {
      const current = rows[i]
      rows[i] = Math.min(rows[i] + 1, rows[i - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1))
      previous = current
    }
  }
  return rows[a.length]
}

function numericPair(value, compare) {
  if (typeof value === 'number' && compare !== '' && Number.isFinite(Number(compare))) {
    return value === Number(compare)
  }
  return undefined
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function nodeError(code, message, details) {
  const error = new Error(message)
  error.code = code
  if (details !== undefined) error.details = details
  return error
}

function capabilityError(capability, message) {
  return nodeError('CAPABILITY_MISSING', message, { capability })
}

function abortError() {
  const error = new Error('Aborted')
  error.name = 'AbortError'
  error.code = 'ABORTED'
  return error
}

function isAbort(error) {
  return error?.name === 'AbortError' || error?.code === 'ABORTED' || error?.code === 'ABORT_ERR'
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error ?? 'Unknown error')
}

export {
  closestNames,
  composeAgentPrompt,
  contentBlocksToText,
  parseOutputSchema,
  resolveParent,
  chooseProvider,
  resolveShellResult,
}
