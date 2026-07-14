import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import process from 'node:process'

const args = process.argv.slice(2)
const hasExplicitProject = args.some((arg) => arg === '--project' || arg.startsWith('--project='))
const projects = hasExplicitProject ? [null] : ['desktop', 'tablet', 'mobile']
const cli = resolve('node_modules/@playwright/test/cli.js')

for (const project of projects) {
  const projectArgs = project === null ? [] : [`--project=${project}`]
  const result = spawnSync(process.execPath, [cli, 'test', ...args, ...projectArgs], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
