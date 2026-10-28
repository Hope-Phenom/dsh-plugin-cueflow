import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'docs/assets/manual')
mkdirSync(outDir, { recursive: true })

const server = await createServer({ configFile: resolve(root, 'vite.config.js') })
await server.listen()
const base = server.resolvedUrls.local[0]
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })

async function open(path) {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.cue-root')
  await page.waitForTimeout(250)
}

async function annotate(items) {
  await page.evaluate(items => {
    document.querySelectorAll('.manual-anno').forEach(node => node.remove())
    const style = document.createElement('style')
    style.textContent = `
      .manual-anno { position: fixed; z-index: 99999; display: grid; place-items: center;
        width: 24px; height: 24px; border-radius: 50%; background: #22d3ee; color: #06202a;
        font: 700 12px/1 system-ui, sans-serif; box-shadow: 0 2px 8px #0008; pointer-events: none; }
    `
    document.head.append(style)
    for (const { selector, label, x = 8, y = 8 } of items) {
      const target = document.querySelector(selector)
      if (!target) continue
      const rect = target.getBoundingClientRect()
      const marker = document.createElement('div')
      marker.className = 'manual-anno'
      marker.textContent = label
      marker.style.left = `${Math.max(4, rect.left + x)}px`
      marker.style.top = `${Math.max(4, rect.top + y)}px`
      document.body.append(marker)
    }
  }, items)
  await page.waitForTimeout(100)
}

async function shot(name) {
  await page.screenshot({ path: resolve(outDir, name), fullPage: false })
  console.log(`[manual] ${name}`)
}

try {
  await open('/?clean=1&lang=zh')
  await annotate([
    { selector: '.cue-top', label: '1', x: 8, y: 8 },
    { selector: '.cue-library', label: '2', x: 8, y: 8 },
    { selector: '.cue-canvas', label: '3', x: 18, y: 18 },
    { selector: '.cue-inspector', label: '4', x: 8, y: 8 },
    { selector: '.cue-dock', label: '5', x: 8, y: 8 },
  ])
  await shot('01-overview.png')

  await page.getByRole('button', { name: /新建工作流/ }).click()
  await page.waitForSelector('.cue-modal')
  await annotate([
    { selector: '.cue-modal', label: '1', x: 8, y: 8 },
    { selector: '.cue-template-grid', label: '2', x: 18, y: 18 },
  ])
  await shot('02-templates.png')

  await page.locator('.cue-template-card').last().click()
  await page.waitForTimeout(500)
  await annotate([{ selector: '.cue-canvas', label: '空白画布', x: 18, y: 18 }])
  await shot('03-blank.png')

  const canvas = page.locator('.cue-canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('canvas missing')
  await page.mouse.dblclick(box.x + box.width / 2, box.y + Math.min(260, box.height / 2))
  await page.waitForSelector('.cue-palette')
  await annotate([
    { selector: '.cue-palette', label: '1', x: 8, y: 8 },
    { selector: '.cue-palette input', label: '2', x: 8, y: 8 },
  ])
  await shot('04-add-node.png')

  await open('/?clean=1&lang=zh')
  await page.locator('[data-cue-action="run"]').click()
  await page.waitForSelector('.cue-modal')
  await annotate([
    { selector: '.cue-modal', label: '1', x: 8, y: 8 },
    { selector: '.cue-modal-body', label: '2', x: 18, y: 18 },
    { selector: '.cue-modal-foot', label: '3', x: 18, y: 8 },
  ])
  await shot('05-run-dialog.png')

  await open('/?clean=1&run=1&approval=1')
  await page.waitForSelector('.cue-approval-modal', { timeout: 12_000 })
  await annotate([
    { selector: '.cue-approval-modal', label: '1', x: 8, y: 8 },
    { selector: '.cue-approval-command', label: '2', x: 8, y: 8 },
    { selector: '[data-cue-action="approve-once"]', label: '3', x: 8, y: 8 },
  ])
  await shot('06-approval.png')

  await open('/?clean=1&run=1')
  await page.waitForFunction(() => document.querySelector('.cue-dock')?.textContent?.match(/已完成|completed/i), null, { timeout: 15_000 })
  await annotate([
    { selector: '.cue-dock', label: '1', x: 8, y: 8 },
    { selector: '.cue-dock-tabs', label: '2', x: 8, y: 8 },
    { selector: '.cue-output-pane', label: '3', x: 8, y: 8 },
  ])
  await shot('07-run-output.png')
} finally {
  await browser.close()
  await server.close()
}
