import {copyFile, mkdir} from 'node:fs/promises'
import {dirname, resolve} from 'node:path'

const assets = [
  ['src/styles.css', 'dist/styles.css']
]

for (const [from, to] of assets) {
  const source = resolve(from)
  const target = resolve(to)
  await mkdir(dirname(target), {recursive: true})
  await copyFile(source, target)
}
