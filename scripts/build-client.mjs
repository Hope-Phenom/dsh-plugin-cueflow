import { build } from 'esbuild'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outfile = resolve(root, 'lib/client.js')

await mkdir(dirname(outfile), { recursive: true })

const result = await build({
  entryPoints: [resolve(root, 'src/client/entry.js')],
  outfile,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome110', 'edge110'],
  sourcemap: true,
  minify: false,
  legalComments: 'none',
  jsx: 'transform',
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  logLevel: 'info',
  metafile: true,
})

const bytes = Object.values(result.metafile.outputs).reduce((sum, output) => sum + output.bytes, 0)
console.log(`[cueflow] built ${outfile} (${(bytes / 1024).toFixed(1)} KiB)`)
