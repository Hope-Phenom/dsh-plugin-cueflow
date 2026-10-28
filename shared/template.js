/**
 * Minimal {{...}} interpolation for the Template node.
 *
 * Tokens:
 *   {{input}}            upstream `value` port (or the run input for an Input node)
 *   {{vars.key}}         run-level variables
 *   {{nodeId.portId}}    any succeeded node output
 *
 * Unknown tokens are preserved verbatim and reported in `missing`, so a typo
 * in a prompt is visible instead of silently disappearing.
 */

import { stringifyValue } from './values.js'

const TOKEN_RE = /\{\{\s*([^{}]+?)\s*\}\}/g

/**
 * @param {string} template
 * @param {{ input?: unknown, vars?: Record<string, unknown>, values?: Record<string, Record<string, unknown>> }} context
 * @returns {{ text: string, missing: string[] }}
 */
export function interpolate(template, context = {}) {
  const source = typeof template === 'string' ? template : ''
  const missing = []
  const text = source.replace(TOKEN_RE, (whole, rawToken) => {
    const token = String(rawToken).trim()
    const resolved = resolveToken(token, context, missing)
    return resolved === undefined ? whole : resolved
  })
  return { text, missing }
}

/** Convenience wrapper returning only the rendered text. */
export function renderTemplate(template, context = {}) {
  return interpolate(template, context).text
}

function resolveToken(token, context, missing) {
  if (token === 'input') return stringifyValue(context.input)

  if (token.startsWith('vars.')) {
    const key = token.slice(5)
    if (context.vars && Object.prototype.hasOwnProperty.call(context.vars, key)) {
      return stringifyValue(context.vars[key])
    }
    missing.push(token)
    return undefined
  }

  const dot = token.indexOf('.')
  if (dot > 0 && dot < token.length - 1) {
    const nodeId = token.slice(0, dot)
    const portId = token.slice(dot + 1)
    const outputs = context.values?.[nodeId]
    if (outputs && Object.prototype.hasOwnProperty.call(outputs, portId)) {
      return stringifyValue(outputs[portId])
    }
  }

  missing.push(token)
  return undefined
}

/** Extract the tokens used by a template (for validation/UI hints). */
export function templateTokens(template) {
  const tokens = []
  const source = typeof template === 'string' ? template : ''
  for (const match of source.matchAll(TOKEN_RE)) {
    const token = String(match[1]).trim()
    if (!tokens.includes(token)) tokens.push(token)
  }
  return tokens
}
