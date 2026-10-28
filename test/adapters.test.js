import test from 'node:test'
import assert from 'node:assert/strict'

import { createAdapters } from '../lib/core/adapters.js'
import { createNode } from '../shared/node-types.js'

function node(type, config = {}) {
  return createNode(type, { id: `n_${type}`, position: { x: 0, y: 0 }, config })
}

function context(overrides = {}) {
  return {
    signal: new AbortController().signal,
    run: { inputs: {}, vars: {} },
    values: {},
    cwd: 'F:\\workspace',
    sessionId: 'session-parent',
    ...overrides,
  }
}

function baseServices(overrides = {}) {
  const parent = { id: 'session-parent' }
  const provider = {
    name: 'spawn',
    capabilities: { agentOptions: true, outputSchema: true, agentPreset: false, depthLimit: true },
    inheritsParentContext: false,
    prepareContinuable: async () => ({}),
  }
  const activation = {
    childId: 'session-child',
    messageId: 'msg_1',
    result: Promise.resolve({
      output: [{ type: 'text', text: 'agent text' }],
      structured: { ok: true },
      stopReason: 'completed',
    }),
    dispose: async () => {},
  }
  const subagents = {
    list: () => ['spawn', 'fork'],
    getProvider: name => (name === 'spawn' ? provider : { ...provider, name }),
    startActivation: async spec => ({ ...activation, spec }),
  }
  const agents = {
    get: id => (id === parent.id ? parent : undefined),
    list: () => [parent],
  }
  const skills = {
    get: async () => ({
      name: 'code-review',
      description: 'review',
      content: 'Review the diff carefully.',
      invocation: { modelInvocable: false, userInvocable: true },
      source: 'user-dsh',
    }),
    list: async () => [{ name: 'code-review' }, { name: 'simplify' }],
  }
  const commands = {
    execute: async () => ({ result: { kind: 'success', text: 'command output' } }),
    find: () => undefined,
  }
  const shell = {
    resolve: request => request,
    execute: async () => ({
      result: {
        exitCode: 0,
        timedOut: false,
        aborted: false,
        stdout: { text: 'stdout text' },
        stderr: { text: '' },
      },
    }),
  }
  const fs = {
    resolve: async path => ({ targetKey: 'k', displayPath: path }),
    stat: async () => ({ type: 'file', size: 3 }),
    readText: async () => 'abc',
  }
  return { agents, subagents, skills, commands, shell, fs, parent, ...overrides }
}

test('agent node uses caller delivery and returns text/json', async () => {
  let captured
  const services = baseServices()
  services.subagents.startActivation = async spec => {
    captured = spec
    return {
      childId: 'session-child',
      result: Promise.resolve({
        output: [{ type: 'text', text: 'agent text' }],
        structured: { ok: true },
        stopReason: 'completed',
      }),
      dispose: async () => {},
    }
  }
  const adapters = createAdapters({ getServices: () => services })
  const result = await adapters.executeNode(node('agent', { prompt: 'do it', model: 'm' }), {}, context())
  assert.equal(result.outputs.text, 'agent text')
  assert.deepEqual(result.outputs.json, { ok: true })
  assert.equal(captured.delivery, 'caller')
  assert.equal(captured.provider, 'spawn')
  assert.match(captured.childId, /^session-/)
  assert.equal(captured.request.parent.id, 'session-parent')
  assert.equal(captured.request.agentOptions.model, 'm')
  assert.equal(captured.request.prompt[0].type, 'text')
})

test('skill node loads a user-only skill and audits invocation', async () => {
  const services = baseServices()
  let captured
  services.subagents.startActivation = async spec => {
    captured = spec
    return {
      childId: 'session-child',
      result: Promise.resolve({ output: [{ type: 'text', text: 'reviewed' }], stopReason: 'completed' }),
      dispose: async () => {},
    }
  }
  const adapters = createAdapters({ getServices: () => services })
  const result = await adapters.executeNode(
    node('skill', { skill: 'code-review' }),
    { input: 'diff here', context: 'context' },
    context(),
  )
  assert.equal(result.outputs.text, 'reviewed')
  assert.match(captured.request.prompt[0].text, /<skill_content name="code-review">/)
  assert.match(captured.request.prompt[0].text, /Review the diff carefully\./)
  assert.match(captured.request.prompt[0].text, /diff here/)
  assert.ok(result.logs.some(log => /modelInvocable=false/.test(log.message)))
})

test('missing skill reports closest names', async () => {
  const services = baseServices()
  services.skills.get = async () => undefined
  const adapters = createAdapters({ getServices: () => services })
  await assert.rejects(
    () => adapters.executeNode(node('skill', { skill: 'code-revew' }), {}, context()),
    error => error.code === 'SKILL_NOT_FOUND' && /code-review/.test(error.message),
  )
})

test('command node uses execute with the slash line', async () => {
  let line
  const services = baseServices()
  services.commands.execute = async (_agent, commandLine) => {
    line = commandLine
    return { result: { kind: 'success', text: 'done' } }
  }
  const adapters = createAdapters({ getServices: () => services })
  const result = await adapters.executeNode(node('command', { command: 'simplify' }), { input: 'src' }, context())
  assert.equal(line, '/simplify src')
  assert.equal(result.outputs.text, 'done')
})

test('command node falls back to find + handler when execute is absent', async () => {
  const services = baseServices()
  delete services.commands.execute
  services.commands.find = () => ({
    handler: async invocation => {
      assert.equal(invocation.agent.id, 'session-parent')
      assert.equal(invocation.rawInput, 'src')
      return { kind: 'success', text: 'fallback' }
    },
  })
  const adapters = createAdapters({ getServices: () => services })
  const result = await adapters.executeNode(node('command', { command: 'simplify' }), { input: 'src' }, context())
  assert.equal(result.outputs.text, 'fallback')
  assert.ok(result.logs.some(log => /adapter:fallback/.test(log.message)))
})

test('shell node returns stdout/stderr/exitCode', async () => {
  const services = baseServices()
  const adapters = createAdapters({ getServices: () => services })
  const result = await adapters.executeNode(node('shell', { command: 'echo hi' }), {}, context())
  assert.equal(result.outputs.stdout, 'stdout text')
  assert.equal(result.outputs.exitCode, 0)
  assert.match(result.outputs.text, /stdout text/)
})

test('shell node fails on non-zero exit by default', async () => {
  const services = baseServices()
  services.shell.execute = async () => ({
    result: {
      exitCode: 2,
      timedOut: false,
      aborted: false,
      stdout: { text: '' },
      stderr: { text: 'boom' },
    },
  })
  const adapters = createAdapters({ getServices: () => services })
  await assert.rejects(
    () => adapters.executeNode(node('shell', { command: 'false' }), {}, context()),
    error => error.code === 'SHELL_EXIT_NONZERO' && /boom/.test(error.message),
  )
})

test('file read returns text and info', async () => {
  const services = baseServices()
  const adapters = createAdapters({ getServices: () => services })
  const result = await adapters.executeNode(node('file-read', { path: 'a.txt' }), {}, context())
  assert.equal(result.outputs.text, 'abc')
  assert.equal(result.outputs.info.size, 3)
})

test('missing services produce CAPABILITY_MISSING', async () => {
  const adapters = createAdapters({ getServices: () => ({}) })
  await assert.rejects(
    () => adapters.executeNode(node('agent', { prompt: 'x' }), {}, context()),
    error => error.code === 'CAPABILITY_MISSING',
  )
  await assert.rejects(
    () => adapters.executeNode(node('shell', { command: 'x' }), {}, context()),
    error => error.code === 'CAPABILITY_MISSING',
  )
})

test('condition and merge are pure', async () => {
  const adapters = createAdapters({ getServices: () => ({}) })
  const truthy = await adapters.executeNode(node('condition'), { value: 'yes' }, context())
  assert.deepEqual(truthy.outputs, { true: 'yes' })
  const falsy = await adapters.executeNode(node('condition'), { value: '' }, context())
  assert.deepEqual(falsy.outputs, { false: '' })
  const merged = await adapters.executeNode(node('merge', { mode: 'concat' }), { a: 'a', c: 'c' }, context())
  assert.equal(merged.outputs.value, 'a\n\nc')
})
