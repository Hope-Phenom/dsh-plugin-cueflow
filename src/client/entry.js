import { createCueflowClient } from './plugin.js'

window.__ModuleLoader__.load({
  id: '@hope_phenom/dsh-plugin-cueflow',
  factory(require) {
    return createCueflowClient(require)
  },
})
