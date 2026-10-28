/**
 * Value coercion, formatting and truncation shared by the executor and UI.
 */

import { LIMITS } from './constants.js'

/** True for plain JSON objects (not arrays/null). */
export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Stringify a value for prompts, templates and previews. */
export function stringifyValue(value) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value)
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/** Compact one-line string for logs. */
export function previewValue(value, max = 160) {
  const text = stringifyValue(value).replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/** Truncate text and mark how much was removed. */
export function truncateText(text, max = LIMITS.maxOutputChars) {
  const value = typeof text === 'string' ? text : stringifyValue(text)
  if (value.length <= max) return { text: value, truncated: false, omitted: 0 }
  const omitted = value.length - max
  return { text: `${value.slice(0, max)}\n…[truncated ${omitted} chars]`, truncated: true, omitted }
}

/** True for values that should be treated as "empty" by required inputs. */
export function isEmptyValue(value) {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

/** Parse JSON, returning undefined instead of throwing. */
export function tryParseJson(text) {
  if (typeof text !== 'string') return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/**
 * Coerce a value between CueFlow port types.
 * Throws a TypeError with a `.code` so the executor can report a typed error.
 */
export function coerceValue(value, fromType, toType, label = 'value') {
  if (value === undefined) return undefined
  if (toType === 'any' || fromType === 'any' || fromType === toType) return value

  const key = `${fromType}->${toType}`
  switch (key) {
    case 'number->text':
      return String(value)
    case 'boolean->text':
      return value ? 'true' : 'false'
    case 'json->text':
      return typeof value === 'string' ? value : stringifyValue(value)
    case 'text->number': {
      const n = Number(value)
      if (!Number.isFinite(n)) throw coercionError(label, fromType, toType, value)
      return n
    }
    case 'text->boolean': {
      if (value === true || value === 'true') return true
      if (value === false || value === 'false') return false
      throw coercionError(label, fromType, toType, value)
    }
    case 'json->number': {
      if (typeof value === 'number' && Number.isFinite(value)) return value
      throw coercionError(label, fromType, toType, value)
    }
    case 'json->boolean': {
      if (typeof value === 'boolean') return value
      throw coercionError(label, fromType, toType, value)
    }
    case 'text->json':
      // Loose: a text that is not JSON is still a valid JSON string value.
      return tryParseJson(value) ?? value
    default:
      throw coercionError(label, fromType, toType, value)
  }
}

function coercionError(label, fromType, toType, value) {
  const err = new TypeError(`Cannot convert ${label} from ${fromType} to ${toType}: ${previewValue(value, 80)}`)
  err.code = 'TYPE_COERCION_FAILED'
  err.details = { label, fromType, toType, preview: previewValue(value, 80) }
  return err
}

/** Canonical JSON with stable key order, used for run snapshots/diffs. */
export function stableJson(value) {
  return JSON.stringify(sortKeys(value), null, 2)
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key])
    return out
  }
  return value
}
