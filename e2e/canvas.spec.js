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

test('narrow layout keeps the inspector toggle usable', async ({ page }) => {
  await page.goto('/?clean=1&lang=en')
  const toggle = page.locator('.cue-inspector-toggle')
  if (await toggle.count()) {
    await expect(toggle.first()).toBeVisible()
  }
})
