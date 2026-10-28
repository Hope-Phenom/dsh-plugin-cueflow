import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { apply } from '../lib/index.js'

test('Host plugin registers the API route and attaches optional services', async () => {
  const home = mkdtempSync(join(tmpdir(), 'cueflow-host-'))
  const previousHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  const disposers = []
  const routes = []
  const logs = []
  const parent = { id: 'session-host' }
  const services = {
    skills: { list: async () => [], snapshot: async () => ({ skills: [], complete: true }), get: async () => undefined },
    commands: { list: async () => [], execute: async () => undefined },
    agents: { get: () => parent, list: () => [parent] },
    subagents: { list: () => ['spawn'], getProvider: () => ({ name: 'spawn', capabilities: {}, prepareContinuable: async () => ({}) }) },
    shell: { resolve: value => value, execute: async () => ({ result: { exitCode: 0 } }) },
    fs: { resolve: async value => value, stat: async () => ({ type: 'file' }), readText: async () => '' },
  }
  const ctx = {
    logger: {
      info: (...args) => logs.push(['info', ...args]),
      warn: (...args) => logs.push(['warn', ...args]),
      error: (...args) => logs.push(['error', ...args]),
    },
    effect(factory) {
      const disposer = factory()
      if (typeof disposer === 'function') disposers.push(disposer)
      return disposer
    },
    inject(deps, callback) {
      const child = {
        effect(factory) {
          const disposer = factory()
          if (typeof disposer === 'function') disposers.push(disposer)
          return disposer
        },
      }
      if (deps.includes('webServer')) {
        child.webServer = {
          register(route) {
            routes.push(route)
            return () => {}
          },
        }
      }
      for (const dep of deps) {
        if (dep !== 'webServer' && services[dep]) child[dep] = services[dep]
      }
      const disposer = callback(child)
      if (typeof disposer === 'function') disposers.push(disposer)
    },
  }

  try {
    apply(ctx)
    assert.equal(routes.length, 1)
    assert.equal(routes[0].kind, 'prefix')
    assert.equal(routes[0].path, '/api/dsh/dsh-plugin-cueflow')
    assert.equal(typeof routes[0].handler, 'function')
    assert.ok(logs.some(([level, message]) => level === 'info' && String(message).includes('API route')))
  } finally {
    for (const dispose of disposers.reverse()) {
      try {
        await dispose()
      } catch {
        /* teardown is best effort in this fake */
      }
    }
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    rmSync(home, { recursive: true, force: true })
  }
})
