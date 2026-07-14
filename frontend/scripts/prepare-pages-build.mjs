import { access, copyFile, readFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const basePath = process.env.VITE_BASE_PATH

if (!basePath || !basePath.startsWith('/') || !basePath.endsWith('/')) {
  throw new Error('VITE_BASE_PATH must start and end with "/".')
}

const indexPath = resolve('dist/index.html')
const fallbackPath = resolve('dist/404.html')
const shippedImageNames = [
  'hero-sour-tea.webp',
  'artisan-story.webp',
  'craft-fire.webp',
  'craft-fermentation.webp',
  'product-tasting.webp',
  'product-gift.webp',
]
const indexHtml = await readFile(indexPath, 'utf8')

if (!indexHtml.includes(`${basePath}assets/`)) {
  throw new Error(`dist/index.html does not contain the expected asset base: ${basePath}assets/`)
}

await Promise.all(shippedImageNames.map((name) => access(resolve('dist/images', name), constants.F_OK)))
await copyFile(indexPath, fallbackPath)

const fallbackHtml = await readFile(fallbackPath, 'utf8')

if (indexHtml !== fallbackHtml) {
  throw new Error('dist/404.html must be identical to dist/index.html.')
}

process.stdout.write(`Verified GitHub Pages build for base path ${basePath}\n`)
