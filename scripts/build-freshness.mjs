// 验收脚本的前置检查：dist 必须比 src 新。
//
// 忘了 npm run build 就会拿旧产物去验，红的全是假的，能白白耗掉一轮排查。
// （2026-10-03 就这么被骗过一次：刚合并的改动没进 dist，链接套件红了，查了半天壳。）
import { readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function newestMtime(dir, newest = 0) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) newest = newestMtime(path, newest)
    else newest = Math.max(newest, statSync(path).mtimeMs)
  }
  return newest
}

/** 拿不到 dist 或者 dist 比 src 旧就直接停下，别让脚本去验一个旧产物。 */
export function assertBuildFresh() {
  const bundle = join(ROOT, 'dist', 'main', 'index.js')
  let builtAt = 0
  try {
    builtAt = statSync(bundle).mtimeMs
  } catch {
    throw new Error('没有 dist/main/index.js，先跑 npm run build')
  }
  if (newestMtime(join(ROOT, 'src')) > builtAt) {
    throw new Error('dist 比 src 旧，先跑 npm run build（否则验的是旧产物）')
  }
}
