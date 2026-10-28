import { execSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const temp = mkdtempSync(join(tmpdir(), 'cueflow-install-'))
try {
  execSync(`${npm} pack --pack-destination "${temp}" --json`, { cwd: process.cwd(), encoding: 'utf8' })
  const tarball = execSync(`dir /b "${temp}\\*.tgz"`, { encoding: 'utf8', shell: true }).trim().split(/\r?\n/)[0]
  const consumer = join(temp, 'consumer')
  execSync(`mkdir "${consumer}" && cd /d "${consumer}" && ${npm} init -y >nul && ${npm} install --ignore-scripts --no-audit --no-fund "${join(temp, tarball)}" >nul`, { encoding: 'utf8', shell: true })
  const pkgDir = join(consumer, 'node_modules', '@hope_phenom', 'dsh-plugin-cueflow')
  const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
  const required = ['lib/index.js', 'lib/client.js', 'shared/constants.js', 'cordis.patch.yml', 'README.md', 'CHANGELOG.md']
  const missing = required.filter(file => !existsSync(join(pkgDir, file)))
  execSync(`node -e "const p = require('@hope_phenom/dsh-plugin-cueflow/package.json'); if (!p.version) process.exit(2)"`, { cwd: consumer, encoding: 'utf8', shell: true })
  console.log(JSON.stringify({ name: pkg.name, version: pkg.version, installed: true, missing }, null, 2))
  if (missing.length) process.exitCode = 1
} finally {
  rmSync(temp, { recursive: true, force: true })
}
