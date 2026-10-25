#!/usr/bin/env node
// 独立主题验收 CLI：把「选择器必须命中真实元素且真的改变样式」这条检查带到任意
// 主题仓库的 CI 里。
//
// 用法:
//   npx colamd-verify-themes themes/*.css
//   npx colamd-verify-themes themes/            # 目录下的全部 CSS
//
// 依赖应用自身的 dist/ 构建与 Electron。Electron 优先取环境变量 ELECTRON_BIN，
// 否则从当前项目的 node_modules 解析；没装时下面会给出明确提示。
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { runThemeHitCheck } from './theme-verify-core.mjs'

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url))

function usage() {
  console.log(`用法: colamd-verify-themes <主题.css | 主题目录> [...]

对每个主题文件逐条检查：
  - 规则是否命中真实 DOM 元素；
  - 规则是否真的改变了计算样式；
  - 变量规则在 html 与 body 上是否取到了声明值。

要求：应用已构建（dist/main/index.js 存在），且本机可用 Electron。`)
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  usage()
  process.exit(0)
}
if (args.length === 0) {
  usage()
  process.exit(1)
}

const files = []
for (const arg of args) {
  if (arg.startsWith('--')) continue
  const full = resolve(arg)
  if (!existsSync(full)) fail(`找不到路径：${arg}`)
  if (statSync(full).isDirectory()) {
    for (const name of readdirSync(full).filter((entry) => entry.endsWith('.css')).sort()) {
      files.push(join(full, name))
    }
  } else if (full.endsWith('.css')) {
    files.push(full)
  } else {
    fail(`不是 CSS 文件：${arg}`)
  }
}
if (files.length === 0) fail('没有找到任何 CSS 文件')

if (!existsSync(join(APP_ROOT, 'dist', 'main', 'index.js'))) {
  fail('找不到应用构建产物。请先在 ColaMD 包目录运行 npm run build。')
}

let electronBin = process.env.ELECTRON_BIN
if (!electronBin) {
  try {
    electronBin = createRequire(import.meta.url)('electron')
  } catch {
    fail('找不到 Electron。请先安装：npm i -D electron，或设置 ELECTRON_BIN 指向可执行文件。')
  }
}

const workDir = mkdtempSync(join(tmpdir(), 'colamd-verify-themes-'))
const themes = files.map((file) => ({ name: basename(file), css: readFileSync(file, 'utf8') }))

let failures = 0
try {
  failures = await runThemeHitCheck({
    appRoot: APP_ROOT,
    electronBin,
    themes,
    includeBuiltin: false,
    workDir,
    userDataDir: join(workDir, 'udd-main')
  })
} finally {
  rmSync(workDir, { recursive: true, force: true })
}

console.log(failures === 0 ? '\n主题验收通过 ✓' : `\n主题验收失败：${failures} 项`)
process.exit(failures === 0 ? 0 : 1)
