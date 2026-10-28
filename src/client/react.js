/**
 * React access shim.
 *
 * The DSH browser bundle is a single CJS factory: `factory(require)` provides
 * React. Static `import React from 'react'` would make esbuild emit a
 * top-level require, which the loader does not provide. Instead the plugin
 * factory calls `setReact(require('react'))` before rendering; components use
 * the proxy/h() from this module.
 */

let runtime = null

export let Fragment = null

export function setReact(react) {
  if (!react) throw new Error('CueFlow: React was not provided by the DSH module loader.')
  runtime = react
  Fragment = react.Fragment
}

export const React = new Proxy(
  {},
  {
    get(_target, property) {
      if (!runtime) throw new Error('CueFlow: React accessed before setReact().')
      return runtime[property]
    },
    has(_target, property) {
      return runtime ? property in runtime : false
    },
  },
)

export function h(type, props, ...children) {
  if (!runtime) throw new Error('CueFlow: h() called before setReact().')
  return runtime.createElement(type, props, ...children)
}
