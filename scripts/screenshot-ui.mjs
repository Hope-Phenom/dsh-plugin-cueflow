/**
 * Capture the standalone UI at a few viewports/themes with Edge or Chrome.
 *
 * No Playwright dependency: the built-in headless browser is enough to catch
 * layout regressions. If no browser is found, print a warning and exit 0 so
 * `pnpm test` / CI do not depend on a local browser install.
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, '.screenshots')
mkdirSync(outDir, { recursive: true })

const candidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]
const browser = candidates.find(path => existsSync(path))
if (!browser) {
  console.warn('[cueflow] no Edge/Chrome found; skipping screenshots')
  process.exit(0)
}

const server = await createServer({ configFile: resolve(root, 'vite.config.js') })
await server.listen()
const port = server.config.server.port
const base = `http://127.0.0.1:${port}`

const shots = [
  { name: 'dark-1440.png', url: '/?clean=1', size: '1440,900', budget: 5000 },
  { name: 'light-1440.png', url: '/?clean=1&theme=light&lang=en', size: '1440,900', budget: 5000 },
  { name: 'narrow-900.png', url: '/?clean=1&lang=zh', size: '900,900', budget: 5000 },
  { name: 'run-1440.png', url: '/?clean=1&run=1', size: '1440,900', budget: 7000 },
]

try {
  for (const shot of shots) {
    const file = resolve(outDir, shot.name)
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--disable-sync',
      '--disable-extensions',
      `--user-data-dir=${resolve(outDir, '.edge-profile')}`,
      `--window-size=${shot.size}`,
      `--virtual-time-budget=${shot.budget}`,
      `--screenshot=${file}`,
      `${base}${shot.url}`,
    ]
    await run(browser, args)
    console.log(`[cueflow] ${shot.name} ${existsSync(file) ? 'written' : 'MISSING'}`)
  }
} finally {
  await server.close()
}

function run(command, args) {
  return new Promise(resolvePromise => {
    const child = spawn(command, args, { stdio: 'ignore', windowsHide: true })
    const timer = setTimeout(() => {
      child.kill()
      resolvePromise()
    }, 60_000)
    child.on('exit', () => {
      clearTimeout(timer)
      resolvePromise()
    })
    child.on('error', () => {
      clearTimeout(timer)
      resolvePromise()
    })
  })
}
