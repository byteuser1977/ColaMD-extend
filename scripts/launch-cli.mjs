#!/usr/bin/env node
// npm 包启动器：npx @bytechain.cn/colamd [文件]
//
// Electron 应用必须由 Electron 运行时启动，不能直接用 node 跑主进程。
// 这里先找本机已安装的 Electron；找不到时用 npx 临时安装与 devDependencies
// 对齐的 Electron 版本，再把包内的 dist/main/index.js 交给它启动。
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url))
const APP_ENTRY = join(APP_ROOT, 'dist', 'main', 'index.js')
const args = process.argv.slice(2)

function usage() {
  console.log(`用法: colamd [Markdown 文件]

从 npm 包启动 ColaMD。找不到 Electron 时会通过 npx 临时安装。
可用环境变量 ELECTRON_BIN 指定 Electron 可执行文件。`)
}

if (args.includes('-h') || args.includes('--help')) {
  usage()
  process.exit(0)
}

if (!existsSync(APP_ENTRY)) {
  console.error('找不到应用构建产物 dist/main/index.js。请先在包目录运行 npm run build。')
  process.exit(1)
}

// 返回本机可用的 Electron 可执行文件路径，找不到时返回 null。
function resolveElectron() {
  if (process.env.ELECTRON_BIN) {
    return existsSync(process.env.ELECTRON_BIN) ? process.env.ELECTRON_BIN : null
  }
  // 包自己的 node_modules 与上层工程的 node_modules 都会被解析到。
  try {
    return createRequire(import.meta.url)('electron')
  } catch {
    return null
  }
}

// npx 临时安装时使用的 Electron 大版本，取自本包 devDependencies。
function electronMajor() {
  try {
    const pkg = JSON.parse(readFileSync(join(APP_ROOT, 'package.json'), 'utf8'))
    const range = pkg.devDependencies?.electron ?? ''
    const match = range.match(/\d+/)
    if (match) return match[0]
  } catch {
    /* 包信息读不到时用兜底版本 */
  }
  return '44'
}

// 优先用与当前 Node 同装的 npm 的 npx-cli.js；Windows 下 .cmd 不能直接 spawn。
function npxCliPath() {
  const npmExec = process.env.npm_execpath
  if (npmExec && /npx-cli\.c?js$/.test(npmExec) && existsSync(npmExec)) {
    return { command: process.execPath, prefix: [npmExec] }
  }
  const candidate = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js')
  if (existsSync(candidate)) {
    return { command: process.execPath, prefix: [candidate] }
  }
  return { command: 'npx', prefix: [] }
}

// 应用刚起来就退出，多半不是用户关窗，而是 Electron 被安全软件拦截或运行时异常。
const QUICK_EXIT_MS = 10_000

function quickExitHint(code, signal, elapsedMs) {
  console.error(`
应用启动后 ${(elapsedMs / 1000).toFixed(1)} 秒即退出（退出码：${code ?? signal}）。如果不是你主动关闭的，常见原因是安全软件按进程名拦截 Electron：
  - 把 Electron 可执行文件复制改名后，用环境变量 ELECTRON_BIN 指向副本；
  - 或在安全软件里放行 Electron 进程。
以 360 为例，拦截时日志通常伴随 WSALookupServiceBegin failed with: 10108。`)
}

function run(command, commandArgs, env) {
  const startedAt = Date.now()
  const child = spawn(command, commandArgs, { stdio: 'inherit', env })
  child.on('error', (error) => {
    console.error(`启动失败：${error.message}`)
    console.error('请改为在当前工程安装 Electron 后再试：npm i -D electron')
    process.exit(1)
  })
  child.on('exit', (code, signal) => {
    const elapsedMs = Date.now() - startedAt
    if (elapsedMs < QUICK_EXIT_MS) quickExitHint(code, signal, elapsedMs)
    process.exit(code ?? (signal ? 1 : 0))
  })
}

const electronBin = resolveElectron()
const env = { ...process.env }

if (electronBin) {
  run(electronBin, [APP_ENTRY, ...args], env)
} else {
  const version = electronMajor()
  const npx = npxCliPath()
  if (!env.ELECTRON_MIRROR) {
    env.ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
  }
  console.error(`未找到 Electron，正在通过 npx 安装 electron@${version}（首次约 100MB，镜像：${env.ELECTRON_MIRROR}）…`)
  run(npx.command, [...npx.prefix, '--yes', `electron@${version}`, APP_ENTRY, ...args], env)
}
