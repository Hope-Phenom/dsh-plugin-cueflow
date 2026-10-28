/**
 * Catalog shown in the browser: node types, skills, commands, live agents and
 * templates. Services are optional; every missing capability is reported
 * instead of failing the whole catalog.
 */

import { PLUGIN_VERSION, LIMITS } from '../../shared/constants.js'
import { getNodeTypeCatalog, NODE_CATEGORIES } from '../../shared/node-types.js'
import { listTemplates } from './templates.js'
import { resolveParent } from './adapters.js'

export function createCatalog({ getServices, version = PLUGIN_VERSION, webServer = true }) {
  return {
    async get({ cwd, sessionId } = {}) {
      const services = getServices() ?? {}
      const warnings = []
      const workdir = typeof cwd === 'string' && cwd ? cwd : process.cwd()
      const parent = resolveParent(services.agents, sessionId)
      if (!parent) warnings.push('No live DSH session is available. Agent, Skill and Command nodes cannot run.')

      const agents = listAgents(services.agents, warnings)
      const skills = await listSkills(services.skills, workdir, warnings)
      const commands = await listCommands(services.commands, parent, warnings)

      const capabilities = {
        skills: Boolean(services.skills),
        commands: Boolean(services.commands && parent),
        agents: Boolean(services.agents),
        subagents: Boolean(services.subagents),
        shell: Boolean(services.shell),
        fs: Boolean(services.fs),
        sandboxPolicy: Boolean(services.sandboxPolicy),
        webServer,
      }

      return {
        version,
        cwd: workdir,
        nodeTypes: getNodeTypeCatalog(),
        categories: NODE_CATEGORIES,
        skills: skills.items,
        skillsComplete: skills.complete,
        commands: commands.items,
        agents,
        defaultSessionId: parent?.id ?? '',
        templates: listTemplates(),
        capabilities,
        limits: {
          maxNodes: LIMITS.maxNodes,
          maxEdges: LIMITS.maxEdges,
          maxOutputChars: LIMITS.maxOutputChars,
          pollIntervalMs: LIMITS.pollIntervalMs,
        },
        warnings,
      }
    },
  }
}

function listAgents(agents, warnings) {
  if (!agents) return []
  try {
    const rows = typeof agents.list === 'function' ? agents.list() : []
    return rows.map(agent => ({
      id: String(agent.id),
      status: agent.status ?? 'idle',
      provider: agent.options?.provider ?? '',
      model: agent.options?.model ?? '',
      title: agentTitle(agent),
      cwd: agent.session?.header?.cwd ?? agent.session?.meta?.cwd ?? '',
    }))
  } catch (error) {
    warnings.push(`Could not list live sessions: ${message(error)}`)
    return []
  }
}

function agentTitle(agent) {
  const candidates = [
    agent.session?.header?.title,
    agent.session?.meta?.title,
    agent.session?.title,
    agent.title,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }
  return ''
}

async function listSkills(skills, cwd, warnings) {
  if (!skills) return { items: [], complete: false }
  const request = cwd ? { cwd } : {}
  try {
    let snapshot
    if (typeof skills.snapshot === 'function') {
      snapshot = await skills.snapshot(request)
    } else {
      const list = await skills.list(request)
      snapshot = { skills: list, complete: true }
    }
    const items = (snapshot?.skills ?? []).map(skill => ({
      name: skill.name,
      description: skill.description ?? '',
      whenToUse: skill.whenToUse ?? '',
      source: skill.source ?? '',
      provider: skill.provider ?? '',
      modelInvocable: skill.invocation?.modelInvocable !== false,
      userInvocable: skill.invocation?.userInvocable !== false,
    }))
    if (snapshot?.complete === false) warnings.push('Skill discovery was incomplete; the list may be partial.')
    return { items, complete: snapshot?.complete !== false }
  } catch (error) {
    warnings.push(`Could not list skills: ${message(error)}`)
    return { items: [], complete: false }
  }
}

async function listCommands(commands, parent, warnings) {
  if (!commands) return { items: [] }
  if (!parent) {
    warnings.push('Commands need a live DSH session; none is available.')
    return { items: [] }
  }
  if (typeof commands.list !== 'function') {
    warnings.push('This DSH version cannot enumerate commands; Command nodes can still run by name if execute/find is available.')
    return { items: [] }
  }
  try {
    const rows = await commands.list(parent)
    return {
      items: rows.map(command => ({
        name: command.name,
        description: command.description ?? '',
        input: command.input ?? null,
      })),
    }
  } catch (error) {
    warnings.push(`Could not list commands: ${message(error)}`)
    return { items: [] }
  }
}

function message(error) {
  return error instanceof Error ? error.message : String(error ?? 'Unknown error')
}
