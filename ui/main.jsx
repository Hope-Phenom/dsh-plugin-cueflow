import React from 'react'
import { createRoot } from 'react-dom/client'

import { createCueflowClient } from '../src/client/plugin.js'
import { h } from '../src/client/react.js'
import { en, makeTranslator, zh } from '../src/client/locale.js'
import { installMockHost } from './mock-host.js'

const params = new URLSearchParams(location.search)
const language = params.get('lang') || (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en')
const t = makeTranslator({ zh, en }, language)

installMockHost()

const captured = {}
const fakeCtx = {
  locale: {
    bind: () => t,
    register: () => () => {},
  },
  slots: {
    inject: (_key, callback) => callback(),
    register: (options, component) => {
      captured[options.name] = component
      if (options.key) captured[`${options.name}:${options.key}`] = component
      return () => {}
    },
  },
  effect: factory => factory(),
}

const client = createCueflowClient(name => {
  if (name !== 'react') throw new Error(`Unexpected module: ${name}`)
  return React
})
client.apply(fakeCtx)

const Panel = captured['main'] ?? captured['main:cueflow']
if (!Panel) throw new Error('CueFlow panel was not registered by the client factory.')

document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
const root = createRoot(document.getElementById('root'))
root.render(<Panel t={t} />)
