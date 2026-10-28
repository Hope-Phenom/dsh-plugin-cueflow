/**
 * CueFlow Host plugin.
 *
 * Registers the workflow/run API on DSH's Web server and attaches optional DSH
 * capabilities (skills, commands, agents, subagents, shell, fs) through
 * `ctx.inject`. Every registration is effect-scoped so a plugin disable/HMR
 * reload disposes the route and cancels live runs.
 */

import { PLUGIN_VERSION } from '../shared/constants.js'
import { createStore } from './core/store.js'
import { createAdapters } from './core/adapters.js'
import { createCatalog } from './core/catalog.js'
import { createRunManager } from './core/runs.js'
import { createRoute } from './core/api.js'

export const name = 'dsh-plugin-cueflow'

/** Optional services are attached when available; the plugin still loads without them. */
const OPTIONAL_SERVICES = ['skills', 'commands', 'agents', 'subagents', 'shell', 'fs', 'sandboxPolicy']

export function apply(ctx) {
  const store = createStore({ env: process.env })
  const services = createServicesState()
  const log = (level, message, error) => {
    const target = ctx?.logger?.[level]
    if (typeof target === 'function') {
      if (error === undefined) target.call(ctx.logger, `[cueflow] ${message}`)
      else target.call(ctx.logger, `[cueflow] ${message}`, error)
      return
    }
    const sink = level === 'error' || level === 'warn' ? console.warn : console.log
    sink(`[cueflow] ${message}`, error ?? '')
  }

  try {
    const recovered = store.recoverInterruptedRuns()
    if (recovered.length) log('warn', `Marked ${recovered.length} interrupted run(s) as error.`)
  } catch (error) {
    log('warn', 'Could not recover interrupted runs', error)
  }

  const adapters = createAdapters({ getServices: () => services.get(), log })
  const runs = createRunManager({
    store,
    adapters,
    log,
    maxActiveRuns: envInt('CUEFLOW_MAX_ACTIVE_RUNS', 2),
    maxWallClockMs: envInt('CUEFLOW_MAX_RUN_MS', 30 * 60 * 1000),
    maxAgentCalls: envInt('CUEFLOW_MAX_AGENT_CALLS', 50),
    maxTokens: envInt('CUEFLOW_MAX_TOKENS', 0),
  })
  adapters.setRunWorkflow(request => runs.runNested(request))
  const catalog = createCatalog({ getServices: () => services.get(), version: PLUGIN_VERSION })

  ctx.effect(() => () => runs.dispose(), 'cueflow: dispose runs')

  for (const serviceName of OPTIONAL_SERVICES) {
    ctx.inject([serviceName], child => {
      services.set(serviceName, child[serviceName])
      log('info', `attached ${serviceName}`)
      return () => {
        services.set(serviceName, null)
      }
    })
  }

  ctx.inject(['webServer'], child => {
    child.effect(
      () => child.webServer.register({
        kind: 'prefix',
        path: '/api/dsh/dsh-plugin-cueflow',
        handler: createRoute({ store, runs, catalog, services, version: PLUGIN_VERSION, log }),
      }),
      'cueflow: api route',
    )
    log('info', 'API route registered at /api/dsh/dsh-plugin-cueflow')
  })
}

function envInt(name, fallback) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback
}

function createServicesState() {
  const state = {
    skills: null,
    commands: null,
    agents: null,
    subagents: null,
    shell: null,
    fs: null,
  }
  return {
    set(key, value) {
      state[key] = value ?? null
    },
    get() {
      return { ...state }
    },
  }
}
