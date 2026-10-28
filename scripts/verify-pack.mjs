import { execSync } from 'node:child_process'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const output = execSync(`${npm} pack --dry-run --json`, { encoding: 'utf8' })
const [manifest] = JSON.parse(output)
const files = new Set(manifest.files.map(file => file.path.replaceAll('\\', '/')))
const required = ['package.json', 'cordis.patch.yml', 'lib/index.js', 'lib/client.js', 'shared/constants.js', 'README.md', 'CHANGELOG.md']
const missing = required.filter(path => !files.has(path))
const forbidden = [...files].filter(path => path.startsWith('test/') || path.startsWith('src/') || path.startsWith('docs/'))
console.log(JSON.stringify({
  name: manifest.name,
  version: manifest.version,
  files: files.size,
  unpackedSize: manifest.unpackedSize,
  missing,
  forbidden: forbidden.slice(0, 10),
}, null, 2))
if (missing.length || forbidden.length) process.exitCode = 1
