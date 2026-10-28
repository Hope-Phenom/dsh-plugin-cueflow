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

test('inherit session mode selects the fork provider', async () => {
  const services = baseServices()
  let captured
  services.subagents.startActivation = async spec => {
    captured = spec
    return {
      childId: 'session-child',
      result: Promise.resolve({ output: [{ type: 'text', text: 'ok' }], stopReason: 'completed' }),
      dispose: async () => {},
    }
  }
  const adapters = createAdapters({ getServices: () => services })
  await adapters.executeNode(
    node('agent', { prompt: 'x' }),
    {},
    context({ run: { inputs: {}, vars: {}, workflowSnapshot: { settings: { sessionMode: 'inherit' } } } }),
  )
  assert.equal(captured.provider, 'fork')
})

test('subflow calls the injected nested workflow runner', async () => {
  const services = baseServices()
  let request
  const adapters = createAdapters({ getServices: () => services })
  adapters.setRunWorkflow(async value => {
    request = value
    return { runId: 'run_nested', outputs: { out: { value: 'nested' } } }
  })
  const result = await adapters.executeNode(
    node('subflow', { workflowId: 'wf_child' }),
    { input: { task: 'x' } },
    context(),
  )
  assert.equal(request.workflowId, 'wf_child')
  assert.deepEqual(request.inputs, { task: 'x' })
  assert.deepEqual(result.outputs.json, { out: { value: 'nested' } })
  assert.match(result.outputs.text, /nested/)
})

test('fanout runs the child workflow once per item', async () => {
  const services = baseServices()
  const calls = []
  const adapters = createAdapters({ getServices: () => services })
  adapters.setRunWorkflow(async value => {
    calls.push(value)
    return { runId: `run_${calls.length}`, outputs: { value: value.inputs.task } }
  })
  const result = await adapters.executeNode(
    node('fanout', { workflowId: 'wf_child', itemKey: 'task' }),
    { items: ['a', 'b'] },
    context(),
  )
  assert.equal(calls.length, 2)
  assert.deepEqual(calls.map(call => call.inputs.task), ['a', 'b'])
  assert.equal(result.outputs.count, 2)
  assert.equal(result.outputs.results[1].value, 'b')
})

test('fanout honors item concurrency', async () => {
  const services = baseServices()
  let active = 0
  let maxActive = 0
  const adapters = createAdapters({ getServices: () => services })
  adapters.setRunWorkflow(async value => {
    active += 1
    maxActive = Math.max(maxActive, active)
    await new Promise(resolve => setTimeout(resolve, 10))
    active -= 1
    return { runId: 'r', outputs: { value: value.inputs.task } }
  })
  const result = await adapters.executeNode(
    node('fanout', { workflowId: 'wf_child', itemKey: 'task', concurrency: 2 }),
    { items: ['a', 'b', 'c', 'd'] },
    context(),
  )
  assert.equal(result.outputs.count, 4)
  assert.equal(maxActive, 2)
})

test('fanout can skip a failed item', async () => {
  const services = baseServices()
  const adapters = createAdapters({ getServices: () => services })
  adapters.setRunWorkflow(async value => {
    if (value.inputs.task === 'b') throw Object.assign(new Error('bad item'), { code: 'BAD_ITEM' })
    return { runId: 'r', outputs: { value: value.inputs.task } }
  })
  const result = await adapters.executeNode(
    node('fanout', { workflowId: 'wf_child', itemKey: 'task', onItemError: 'skip' }),
    { items: ['a', 'b', 'c'] },
    context(),
  )
  assert.equal(result.outputs.count, 3)
  assert.equal(result.outputs.errors.length, 1)
  assert.equal(result.outputs.errors[0].code, 'BAD_ITEM')
})

test('workflow session mode reuses one child session', async () => {
  const services = baseServices()
  let disposed = 0
  let followups = 0
  const child = {
    id: 'session-child',
    session: {
      seq: 10,
      snapshotEvents: () => [{
        type: 'assistant/message',
        data: { message: { content: [{ type: 'text', text: 'follow-up answer' }] } },
      }],
    },
    followup: () => { followups += 1 },
    whenIdle: async () => {},
  }
  services.agents = {
    get: id => (id === 'session-child' ? child : (id === 'session-parent' ? { id: 'session-parent' } : undefined)),
    list: () => [{ id: 'session-parent' }],
  }
  services.subagents.startActivation = async () => ({
    childId: 'session-child',
    result: Promise.resolve({ output: [{ type: 'text', text: 'first answer' }], stopReason: 'completed' }),
    dispose: async () => { disposed += 1 },
  })
  const adapters = createAdapters({ getServices: () => services })
  const run = { inputs: {}, vars: {}, workflowSnapshot: { settings: { sessionMode: 'workflow' } } }
  const ctx = context({ run })
  const first = await adapters.executeNode(node('agent', { prompt: 'first' }), {}, ctx)
  assert.equal(first.outputs.text, 'first answer')
  const second = await adapters.executeNode(node('agent', { prompt: 'second' }), {}, ctx)
  assert.equal(second.outputs.text, 'follow-up answer')
  assert.equal(followups, 1)
  await adapters.disposeRunSessions(run)
  assert.equal(disposed, 1)
})

test('parent mode sends a role-bearing user message to the live parent', async () => {
  const services = baseServices()
  let sent
  const parent = {
    id: 'session-parent',
    session: {
      seq: 1,
      snapshotEvents: () => [{
        type: 'assistant/message',
        data: { message: { content: [{ type: 'text', text: 'parent answer' }] } },
      }],
    },
    followup: message => { sent = message },
    whenIdle: async () => {},
  }
  services.agents = {
    get: id => (id === 'session-parent' ? parent : undefined),
    list: () => [parent],
  }
  const adapters = createAdapters({ getServices: () => services })
  const run = { inputs: {}, vars: {}, workflowSnapshot: { settings: { sessionMode: 'parent' } } }
  const result = await adapters.executeNode(node('agent', { prompt: 'hi' }), {}, context({ run }))
  assert.equal(result.outputs.text, 'parent answer')
  assert.equal(sent.role, 'user')
  assert.equal(result.meta.sessionMode, 'parent')
})

test('workflow mode cold-resumes an absent child with sendMessage', async () => {
  const services = baseServices()
  let resumed = false
  let sent = 0
  let disposed = 0
  const child = {
    id: 'session-cold',
    session: {
      seq: 4,
      snapshotEvents: () => [{
        type: 'assistant/message',
        data: { message: { content: [{ type: 'text', text: 'cold answer' }] } },
      }],
    },
    followup: () => { throw new Error('already sent') },
    whenIdle: async () => {},
  }
  services.agents = {
    get: id => {
      if (id === 'session-parent') return { id: 'session-parent' }
      if (id === 'session-cold' && resumed) return child
      return undefined
    },
    list: () => [{ id: 'session-parent' }],
  }
  services.subagents.startActivation = async () => ({
    childId: 'session-cold',
    result: Promise.resolve({ output: [{ type: 'text', text: 'first' }], stopReason: 'completed' }),
    dispose: async () => { disposed += 1 },
  })
  services.subagents.sendMessage = async (sender, targetId, content, options) => {
    assert.equal(targetId, 'session-cold')
    assert.ok(options.signal)
    sent += 1
    resumed = true
    return 'msg_1'
  }
  const adapters = createAdapters({ getServices: () => services })
  const run = { inputs: {}, vars: {}, workflowSnapshot: { settings: { sessionMode: 'workflow' } } }
  const ctx = context({ run })
  await adapters.executeNode(node('agent', { prompt: 'first' }), {}, ctx)
  const second = await adapters.executeNode(node('agent', { prompt: 'second' }), {}, ctx)
  assert.equal(second.outputs.text, 'cold answer')
  assert.equal(sent, 1)
  await adapters.disposeRunSessions(run)
  assert.equal(disposed, 1)
})

test('aborting an agent disposes its activation immediately', async () => {
  const services = baseServices()
  let disposed = 0
  services.subagents.startActivation = async () => ({
    childId: 'session-child',
    result: new Promise(() => {}),
    dispose: async () => { disposed += 1 },
  })
  const adapters = createAdapters({ getServices: () => services })
  const controller = new AbortController()
  const promise = adapters.executeNode(
    node('agent', { prompt: 'never returns' }),
    {},
    context({ signal: controller.signal }),
  )
  await new Promise(resolve => setTimeout(resolve, 10))
  controller.abort()
  await assert.rejects(promise, error => error?.name === 'AbortError')
  assert.equal(disposed, 1)
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

test('shell node resolves the sandbox policy from the live session', async () => {
  const services = baseServices()
  const parent = { id: 'session-parent', session: { id: 'session-parent' } }
  services.agents = { get: () => parent, list: () => [parent] }
  let policyRequest
  services.sandboxPolicy = {
    resolve(request) {
      policyRequest = request
      return { mode: 'workspace-write', workspaceRoot: 'F:\\workspace', sessionId: 'session-parent' }
    },
  }
  let shellRequest
  services.shell.resolve = request => {
    shellRequest = request
    return request
  }
  const adapters = createAdapters({ getServices: () => services })
  await adapters.executeNode(node('shell', { command: 'echo hi' }), {}, context())
  assert.equal(policyRequest.session.id, 'session-parent')
  assert.equal(shellRequest.sandboxPolicy.workspaceRoot, 'F:\\workspace')
})

test('shell node falls back to the workflow cwd for agentless execution', async () => {
  const services = baseServices()
  services.agents = { get: () => undefined, list: () => [] }
  services.sandboxPolicy = {
    resolve: () => ({ mode: 'workspace-write', workspaceRoot: 'F:\\fallback' }),
  }
  let shellRequest
  services.shell.resolve = request => {
    shellRequest = request
    return request
  }
  const adapters = createAdapters({ getServices: () => services })
  await adapters.executeNode(node('shell', { command: 'echo hi' }), {}, context({ cwd: 'F:\\project' }))
  assert.equal(shellRequest.sandboxPolicy.workspaceRoot, 'F:\\project')
  assert.equal(shellRequest.sandboxPolicy.mode, 'workspace-write')
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

test('reroute passes the value through', async () => {
  const adapters = createAdapters({ getServices: () => baseServices() })
  const result = await adapters.executeNode(node('reroute'), { value: { ok: true } }, context())
  assert.deepEqual(result.outputs, { value: { ok: true } })
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
