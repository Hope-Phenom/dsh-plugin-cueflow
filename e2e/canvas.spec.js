import { test, expect } from '@playwright/test'

test('narrow canvas adds and drags a node', async ({ page }) => {
  await page.goto('/?clean=1&lang=en')
  await expect(page.locator('.cue-root')).toBeVisible()

  const agent = page.locator('.cue-library-item').filter({ hasText: 'Agent' }).first()
  await agent.click()
  const node = page.locator('.cue-node').first()
  await expect(node).toBeVisible()

  const before = await node.boundingBox()
  if (!before) throw new Error('node has no bounding box')
  await page.mouse.move(before.x + 90, before.y + 16)
  await page.mouse.down()
  await page.mouse.move(before.x + 170, before.y + 76, { steps: 8 })
  await page.mouse.up()

  const after = await node.boundingBox()
  expect(after).not.toBeNull()
  expect(after.x).not.toBe(before.x)
  expect(after.y).not.toBe(before.y)
})

test('copy and paste duplicates the selected node', async ({ page }) => {
  await page.goto('/?clean=1&lang=en')
  const nodes = page.locator('.cue-node')
  const before = await nodes.count()
  await page.locator('.cue-library-item').filter({ hasText: 'Agent' }).first().click()
  await expect(nodes).toHaveCount(before + 1)
  await page.keyboard.press('Control+C')
  await page.keyboard.press('Control+V')
  await expect(nodes).toHaveCount(before + 2)
})

test('run reaches a terminal state from the toolbar', async ({ page }) => {
  await page.goto('/?clean=1&run=1')
  await expect(page.locator('.cue-dock')).toContainText(/completed|已完成/i, { timeout: 10_000 })
})

test('a running workflow can be cancelled', async ({ page }) => {
  await page.goto('/?clean=1&run=1')
  await page.waitForTimeout(1200)
  await page.evaluate(() => window.__CUE_TEST__.cancel())
  await expect(page.locator('.cue-dock')).toContainText(/cancelled|已取消/i, { timeout: 10_000 })
})

test('shift-click selects and copies multiple nodes', async ({ page }) => {
  await page.goto('/?clean=1&lang=en')
  await page.locator('.cue-library-item').filter({ hasText: 'Agent' }).first().click()
  const before = await page.locator('.cue-node').count()
  await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.cue-node')]
    nodes[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
    nodes[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, shiftKey: true }))
  })
  await expect(page.locator('.cue-node.selected')).toHaveCount(2)
  await page.keyboard.press('Control+C')
  await page.keyboard.press('Control+V')
  await expect(page.locator('.cue-node')).toHaveCount(before + 2)
})

test('align left moves selected nodes to the same x', async ({ page }) => {
  await page.goto('/?clean=1&lang=en')
  await page.locator('.cue-library-item').filter({ hasText: 'Agent' }).first().click()
  await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.cue-node')]
    nodes[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
    nodes[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, shiftKey: true }))
  })
  await expect(page.locator('.cue-node.selected')).toHaveCount(2)
  await page.locator('[data-cue-action="align-left"]').click()
  const xs = await page.locator('.cue-node.selected').evaluateAll(nodes => nodes.map(node => node.style.left))
  expect(xs[0]).toBe(xs[1])
})

test('shift-drag box-selects visible nodes', async ({ page }) => {
  await page.goto('/?clean=1&lang=en')
  const canvas = page.locator('.cue-canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('canvas has no box')
  await page.keyboard.down('Shift')
  await page.mouse.move(box.x + 6, box.y + 6)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width - 20, box.y + box.height - 20, { steps: 8 })
  await page.mouse.up()
  await page.keyboard.up('Shift')
  await expect(page.locator('.cue-node.selected')).not.toHaveCount(0)
})

test('groups the current selection into a visual frame', async ({ page }) => {
  await page.goto('/?clean=1&lang=en')
  await page.locator('.cue-library-item').filter({ hasText: 'Agent' }).first().click()
  await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.cue-node')]
    nodes[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
    nodes[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, shiftKey: true }))
  })
  await page.locator('[data-cue-action="group-selection"]').click()
  await expect(page.locator('.cue-group-node')).toHaveCount(1)
  const before = await page.locator('.cue-node').evaluateAll(nodes => nodes.map(node => node.style.left))
  const groupHead = page.locator('.cue-group-node .cue-node-head')
  const box = await groupHead.boundingBox()
  if (!box) throw new Error('group head has no box')
  await page.mouse.move(box.x + 40, box.y + 16)
  await page.mouse.down()
  await page.mouse.move(box.x + 140, box.y + 96, { steps: 6 })
  await page.mouse.up()
  const after = await page.locator('.cue-node').evaluateAll(nodes => nodes.map(node => node.style.left))
  expect(after).not.toEqual(before)
})

test('narrow layout keeps the inspector toggle usable', async ({ page }) => {
  await page.goto('/?clean=1&lang=en')
  const toggle = page.locator('.cue-inspector-toggle')
  if (await toggle.count()) {
    await expect(toggle.first()).toBeVisible()
  }
})
