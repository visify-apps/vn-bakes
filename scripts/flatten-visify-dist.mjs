import { cpSync, existsSync, mkdirSync, rmSync, renameSync } from 'node:fs'
import { join } from 'node:path'

const root = join(process.cwd(), 'dist-visify')
const nested = join(root, 'visify', 'index.html')
const target = join(root, 'index.html')

if (!existsSync(nested)) {
  if (existsSync(target)) {
    console.log('Visify dist already flat.')
    process.exit(0)
  }
  console.error('Expected dist-visify/visify/index.html')
  process.exit(1)
}

renameSync(nested, target)
rmSync(join(root, 'visify'), { recursive: true, force: true })
console.log('Flattened Visify dist → dist-visify/index.html')
