#!/usr/bin/env node
// 2.x 库渲染器验收：通过 CDP 调用 dist/lib 的公开 API，检查导出的 HTML 是不是
// 「一篇文档」，以及 :root 是否只剩契约里的活变量。
//
// 优先用本机 Chrome / Edge 的 headless 模式（库本来就是浏览器 ESM，这比 Electron
// 更贴近真实消费者）；都没有时才退回 Electron 离屏窗口。
//
// 用法: npm run verify:lib（先 npm run build:lib；本脚本不重新构建）
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { connect, evaluate, sleep, waitTarget } from './theme-verify-core.mjs'

const require = createRequire(import.meta.url)
const APP_ROOT = fileURLToPath(new URL('..', import.meta.url))
const LIB_DIR = join(APP_ROOT, 'dist', 'lib')

const JS_NAME = 'colamd-renderer.js'
const CSS_NAME = 'colamd.css'

// Chrome / Edge 的常见落点。CI 里可以用 CHROME_BIN 指定。
const BROWSER_CANDIDATES = [
  process.env.CHROME_BIN,
  process.env.EDGE_BIN,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge'
].filter(Boolean)

function findBrowser() {
  return BROWSER_CANDIDATES.find((candidate) => existsSync(candidate)) ?? null
}

const FIXTURE = [
  '# 库导出验收',
  '',
  '正文里有 **加粗**、`行内代码` 与行内公式 $a^2+b^2=c^2$。',
  '',
  '| 表头甲 | 表头乙 |',
  '| --- | --- |',
  '| 单元格甲 | 单元格乙 |',
  '',
  '```js',
  'const answer = 42',
  '```',
  '',
  '```mermaid',
  'graph TD',
  '  A[开始] --> B[结束]',
  '```',
  ''
].join('\n')

const SHELL = `<!doctype html>
<html><head><meta charset="utf-8"><link rel="stylesheet" href="/${CSS_NAME}"></head>
<body><div id="editor"></div></body></html>`

function fail(message) {
  console.error(`  ✗ ${message}`)
  process.exitCode = 1
}

function check(name, ok, detail = '') {
  if (ok) console.log(`  ✓ ${name}`)
  else fail(`${name}${detail ? `：${detail}` : ''}`)
}

function stopChild(child) {
  if (!child || child.exitCode !== null) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    return
  }
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    try { child.kill('SIGTERM') } catch { /* 已经退出 */ }
  }
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      const url = request.url ?? '/'
      if (url === '/' || url === '/index.html') {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        response.end(SHELL)
        return
      }
      const file = url === `/${JS_NAME}`
        ? join(LIB_DIR, JS_NAME)
        : url === `/${CSS_NAME}`
          ? join(LIB_DIR, CSS_NAME)
          : null
      if (!file) {
        response.writeHead(404)
        response.end()
        return
      }
      response.writeHead(200, {
        'Content-Type': file.endsWith('.js') ? 'application/javascript; charset=utf-8' : 'text/css; charset=utf-8'
      })
      response.end(readFileSync(file))
    })
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      resolve({
        port: server.address().port,
        close: () => new Promise((done) => server.close(() => done()))
      })
    })
  })
}

function checkBundle() {
  const files = readdirSync(LIB_DIR).sort()
  const expected = [JS_NAME, CSS_NAME].sort().join(',')
  check('dist/lib 只产出 JS 与 CSS', files.join(',') === expected, files.join(','))

  const js = readFileSync(join(LIB_DIR, JS_NAME), 'utf8')
  const css = readFileSync(join(LIB_DIR, CSS_NAME), 'utf8')
  check('bundle 导出 createColaMDEditor', js.includes('createColaMDEditor'))
  check(
    'bundle 没有外部 chunk 引用',
    !js.includes('import("./') && !js.includes("import('./") && !js.includes('from"./'),
    '仍存在相对 import'
  )
  const relativeUrls = [...css.matchAll(/url\(([^)]+)\)/g)]
    .map((match) => match[1].trim().replace(/^['"]|['"]$/g, ''))
    .filter((url) => !url.startsWith('data:'))
  check('CSS 资源全部内联', relativeUrls.length === 0, relativeUrls.slice(0, 3).join(', '))
}

async function run() {
  if (!existsSync(join(LIB_DIR, JS_NAME)) || !existsSync(join(LIB_DIR, CSS_NAME))) {
    console.error('找不到 dist/lib 产物，请先运行 npm run build:lib。')
    process.exit(1)
  }
  checkBundle()

  const server = await startServer()
  const shellUrl = `http://127.0.0.1:${server.port}/`
  const workDir = mkdtempSync(join(tmpdir(), 'colamd-verify-lib-'))
  const port = 10020 + Math.floor(Math.random() * 30)
  const browser = findBrowser()
  let child = null

  if (browser) {
    child = spawn(
      browser,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        `--user-data-dir=${join(workDir, 'udd-main')}`,
        `--remote-debugging-port=${port}`,
        'about:blank'
      ],
      { cwd: APP_ROOT, stdio: 'ignore', detached: process.platform !== 'win32', windowsHide: true }
    )
  } else {
    let electronBin = null
    try {
      electronBin = require('electron')
    } catch {
      await server.close()
      rmSync(workDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
      console.error('找不到 Chrome/Edge，也找不到 Electron。请设置 CHROME_BIN，或 npm i -D electron。')
      process.exit(1)
    }
    child = spawn(
      electronBin,
      [
        join(APP_ROOT, 'scripts', 'lib-window.cjs'),
        shellUrl,
        `--user-data-dir=${join(workDir, 'udd-main')}`,
        `--remote-debugging-port=${port}`
      ],
      { cwd: APP_ROOT, stdio: 'ignore', detached: process.platform !== 'win32', windowsHide: true }
    )
  }

  let renderer = null
  try {
    let page = null
    try {
      page = await waitTarget(port, (target) => target.type === 'page')
    } catch {
      throw new Error(`浏览器没有启动（${browser ?? 'Electron'}，exit=${child.exitCode ?? 'running'}）`)
    }
    renderer = await connect(page.webSocketDebuggerUrl)
    if (browser) {
      await renderer.send('Page.navigate', { url: shellUrl })
      for (let i = 0; i < 100; i++) {
        const ready = await evaluate(renderer, 'document.readyState')
        if (ready === 'complete' && await evaluate(renderer, 'Boolean(document.getElementById("editor"))')) break
        await sleep(100)
      }
    }
    await sleep(500)

    const result = await evaluate(renderer, `(async () => {
      try {
        const mod = await import('/${JS_NAME}')
        const handle = await mod.createColaMDEditor({ rootId: 'editor', editable: false })
        handle.applyTheme('elegant')
        handle.setMarkdown(${JSON.stringify(FIXTURE)})
        await handle.ensureAllPluginsRendered()
        return { html: await handle.buildExportHTML({ title: 'Lib check' }) }
      } catch (error) {
        return { error: String(error && error.stack || error) }
      }
    })()`)

    if (!result || result.error) {
      fail(`库调用失败：${result?.error ?? '无返回'}`)
      return
    }
    const html = result.html ?? ''
    const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? ''
    if (process.env.DEBUG_VERIFY_LIB) console.log(body.slice(0, 4000))
    check('导出的是完整 HTML 文档', html.startsWith('<!doctype html>') && html.includes('<article class="colamd-document">'))
    check('标题/加粗/行内代码/表格/代码块都在', ['<h1>', '<strong>', '<code>', '<table', '<pre><code>'].every((tag) => body.includes(tag)))
    check('KaTeX 公式已渲染', body.includes('class="katex"'))
    check('Mermaid SVG 已渲染', body.includes('<svg') && html.includes('var(--pele-'))
    check('没有编辑器行结构', !body.includes('cm-line') && !body.includes('cm-md-'))

    const root = html.match(/:root\s*\{([^}]*)\}/)
    const declarations = root?.[1] ?? ''
    check(':root 含活变量', declarations.includes('--bg-color') && declarations.includes('--pele-bg'))
    check(':root 不含外壳/死变量', !declarations.includes('--chrome-row-height') && !declarations.includes('--table-border'))
  } finally {
    renderer?.close()
    stopChild(child)
    // 浏览器退出后还会短暂占着 profile，等一下再删。
    await sleep(500)
    await server.close()
    try {
      rmSync(workDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
    } catch {
      console.log(`  · 临时目录未能删除（可手动清理）：${workDir}`)
    }
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
