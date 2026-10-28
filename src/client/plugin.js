/**
 * CueFlow browser plugin factory.
 *
 * DSH calls `factory(require)`; we take React from the loader, then register a
 * sidebar entry and the main panel. The panel receives the localized `t`
 * function from the slot, with a closure fallback for older slot versions.
 */

import { setReact, h } from './react.js'
import { CueFlowPanel } from './App.jsx'
import { CueFlowIcon } from './Icons.jsx'
import { en, zh } from './locale.js'

const NS = 'dsh-plugin-cueflow'

export function createCueflowClient(require) {
  setReact(require('react'))

  const inject = ['slots', 'locale']

  function apply(ctx) {
    const t = ctx.locale.bind(NS)
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'cueflow: dictionaries')

    ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
      name: 'sidebar.panellist',
      id: 'cueflow',
      order: 60,
      label: () => t('nav'),
    }, CueFlowIcon))

    ctx.slots.inject('main', () => ctx.slots.register({
      name: 'main',
      key: 'cueflow',
      locale: NS,
    }, props => h(CueFlowPanel, { ...props, t: typeof props.t === 'function' ? props.t : t })))
  }

  return { inject, apply }
}
