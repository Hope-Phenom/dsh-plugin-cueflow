import { createCueflowClient } from './plugin.js'

window.__ModuleLoader__.load({
  id: 'dsh-plugin-cueflow',
  factory(require) {
    return createCueflowClient(require)
  },
})
