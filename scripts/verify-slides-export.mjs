#!/usr/bin/env node
// 幻灯片 PDF 导出的真机验证：走真实的菜单导出通道，检查纸上是不是「一页一张纸」。
//
// 为什么需要它：导出曾经把字号写死成 24px（和放映不一致），内容因此撑破纸面——
// 16 页的稿子导出成 20 页；底色又取自 body 的计算值（透明），纸上根本没有底色。
// 这两样肉眼一看就知道，但没法靠人肉每次都核一遍，所以钉成两条断言：
//
//   1. PDF 页数 == 文档页数（一页一张纸，不多不少）；
//   2. 纸上真的有底色和强调色（颜色写进了内容流，不是屏幕上的假象）。
//
// 用法: npm run verify:slides-export（先 npm run build）
// 窗口放在屏幕外，测试不占用屏幕。
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { inflateSync } from 'node:zlib'

import { assertBuildFresh } from './build-freshness.mjs'
import { APP_ROOT, ELECTRON_BIN, stopVerifyApp, verifyWorkdir } from './verify-workdir.mjs'

const APP = APP_ROOT
assertBuildFresh()
const { dir: WORK, udd } = verifyWorkdir('slides-export')

/** 浅色主题的强调色（themes/base.css 的 --link-color / --pele-accent）。 */
const ACCENT = { r: 9, g: 105, b: 217 }
/** 导出的底色：主题底色上拌 5% 强调色（slides-export.ts 的 layoutRules）。 */
const PAPER = { r: 255, g: 255, b: 255 }

function mix(paper, accent, ratio) {
  return {
    r: paper.r * (1 - ratio) + accent.r * ratio,
    g: paper.g * (1 - ratio) + accent.g * ratio,
    b: paper.b * (1 - ratio) + accent.b * ratio
  }
}

/**
 * 导出用的稿子：封面、数据页、普通页、双栏页和一张高密度页。
 * 高密度页故意超出一张纸——导出必须把它整页缩回来，而不是多吐一页纸。
 */
function fixture() {
  const dense = Array.from({ length: 40 }, (_, i) => `第 ${i + 1} 行：这一行用来把这一页撑到超过一张纸的高度。`).join('\n')
  return [
    '# 幻灯片导出验证',
    '',
    '用来确认纸上那一版和眼前这一版是同一版：页数对得上，底色和强调色也在纸上。',
    '',
    '---',
    '',
    '<!-- slide: cover',
    'kicker: Verify · 验证',
    'label: 幻灯片导出',
    'chapter: 第一幕',
    '-->',
    '',
    '# 导出与原页面一致',
    '',
    '## 纸面 1920×1080',
    '',
    '导语：字号、边距、行高与放映同源，导出不再自带一套。',
    '',
    '---',
    '',
    '<!-- slide: kpi',
    'kicker: Numbers · 关键数字',
    'label: 关键数字',
    'chapter: 第二幕',
    '-->',
    '',
    '## 关键数字',
    '',
    '- **3.2 亿** 用户规模',
    '- **47%** 年增长率',
    '- **12 项** 行业奖项',
    '',
    '---',
    '',
    '<!-- slide: section',
    'kicker: Act II · 版式',
    'label: 幻灯片导出',
    'chapter: 第二幕',
    '-->',
    '',
    '## 第二幕 · 版式',
    '',
    '数字自己会说话，版式只负责给它一个台子。',
    '',
    '---',
    '',
    '## 普通页',
    '',
    '- 第一条',
    '- **加粗**强调走强调色',
    '- 第三条',
    '',
    '---',
    '',
    '## 高密度页',
    '',
    dense,
    ''
  ].join('\n')
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    let id = 0
    const pending = new Map()
    ws.addEventListener('open', () => resolve({
      send(method, params = {}) {
        return new Promise((res, rej) => {
          const msgId = ++id
          pending.set(msgId, { res, rej })
          ws.send(JSON.stringify({ id: msgId, method, params }))
        })
      },
      close: () => ws.close()
    }))
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id)
        pending.delete(msg.id)
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result)
      }
    })
    ws.addEventListener('error', () => reject(new Error(`连接不上 ${url}`)))
  })
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitTarget(port, predicate, ms = 30000) {
  const started = Date.now()
  while (Date.now() - started < ms) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      const hit = list.find(predicate)
      if (hit) return hit
    } catch { /* 还没起来 */ }
    await sleep(250)
  }
  throw new Error('等不到调试目标')
}

async function evaluate(client, expression, timeoutMs = 60000, label = '') {
  const call = client.send('Runtime.evaluate', {
    expression, includeCommandLineAPI: true, returnByValue: true, awaitPromise: true
  }).then((result) => {
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails).slice(0, 600))
    return result.result?.value
  })
  let timer
  const guard = new Promise((_res, rej) => { timer = setTimeout(() => rej(new Error(`evaluate 超时 ${label}`)), timeoutMs) })
  try { return await Promise.race([call, guard]) } finally { clearTimeout(timer) }
}

/** PDF 里的页数。Chromium 把页对象写成明文的 /Type /Page，不压缩。 */
function pageCount(buffer) {
  const raw = buffer.toString('latin1')
  const pages = (raw.match(/\/Type\s*\/Page(?![s])/g) ?? []).length
  const declared = Math.max(0, ...(raw.match(/\/Count\s+(\d+)/g) ?? []).map((m) => Number(m.replace(/\D/g, ''))))
  return { pages, declared }
}

/**
 * PDF 里的内容流。Chromium 把内容流压成 FlateDecode，页数和颜色都藏在解压之后。
 * 把所有能解开的内容流拼起来，字形和颜色算子就都在里面了。
 */
function contentStreams(buffer) {
  const text = buffer.toString('latin1')
  const chunks = []
  const pattern = /stream\r?\n/g
  let match
  while ((match = pattern.exec(text)) !== null) {
    // 'endstream' 里也含 'stream'，前面是 'end' 的那一个跳过
    const before = text.slice(Math.max(0, match.index - 3), match.index)
    if (before.endsWith('end')) continue
    const start = match.index + match[0].length
    const end = text.indexOf('endstream', start)
    if (end < 0) continue
    const chunk = buffer.subarray(start, end)
    try {
      chunks.push(inflateSync(chunk).toString('latin1'))
    } catch {
      try { chunks.push(chunk.toString('latin1')) } catch { /* 这段不是流 */ }
    }
    pattern.lastIndex = end
  }
  return chunks.join('\n')
}

/** 内容流里出现的所有 RGB 颜色（rg = 填充色，RG = 描边色）。 */
function colorsIn(stream) {
  const found = []
  const pattern = /([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(rg|RG)\b/g
  let match
  while ((match = pattern.exec(stream)) !== null) {
    found.push({ r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) })
  }
  return found
}

function hasColor(colors, expected, tolerance = 0.012) {
  return colors.some((c) =>
    Math.abs(c.r * 255 - expected.r) <= tolerance * 255 &&
    Math.abs(c.g * 255 - expected.g) <= tolerance * 255 &&
    Math.abs(c.b * 255 - expected.b) <= tolerance * 255)
}

async function main() {
  mkdirSync(WORK, { recursive: true })
  const source = join(WORK, 'deck.md')
  const out = join(WORK, 'deck.pdf')
  writeFileSync(source, fixture(), 'utf8')

  const port = 9900 + Math.floor(Math.random() * 60)
  const inspect = port + 1000
  const child = spawn(ELECTRON_BIN, ['scripts/offscreen-window.cjs', source, `--user-data-dir=${udd}`,
    '--force-color-profile=srgb',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    `--remote-debugging-port=${port}`, `--inspect=${inspect}`
  ], { cwd: APP, stdio: 'ignore', detached: true })

  try {
    const page = await waitTarget(port, (t) => t.type === 'page' && /index\.html/.test(t.url))
    const mainTarget = await waitTarget(inspect, (t) => t.type === 'node')
    const renderer = await connect(page.webSocketDebuggerUrl)
    const main = await connect(mainTarget.webSocketDebuggerUrl)
    await renderer.send('Emulation.setFocusEmulationEnabled', { enabled: true })

    // 测试不许占用屏幕：连上就藏好，并且别让导出流程把窗口叫回来
    await evaluate(main, `(() => {
      const { BrowserWindow, dialog } = require('electron')
      BrowserWindow.prototype.show = function () {}
      BrowserWindow.prototype.focus = function () {}
      BrowserWindow.getAllWindows().forEach((win) => { win.setPosition(-4000, -4000) })
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: ${JSON.stringify(out)} })
      globalThis.__exportError = null
      dialog.showMessageBox = async (win, options) => { globalThis.__exportError = options; return { response: 0 } }
      return true
    })()`, 30000, 'stub')

    // 等正文渲染出来
    for (let i = 0; i < 120; i++) {
      const lines = await evaluate(renderer, `document.querySelectorAll('#editor .cm-line').length`, 30000, 'lines')
      if (Number(lines) > 10) break
      await sleep(250)
    }

    // 浅色主题：默认白色样式
    await evaluate(main, `(() => {
      const { BrowserWindow } = require('electron')
      BrowserWindow.getAllWindows()[0].webContents.send('set-theme', 'light')
      return true
    })()`, 30000, 'set-theme')
    await sleep(600)

    // 文档有几页：`---` 分一页（见 live-preview 的 collectPages），页数 = 分隔线 + 1。
    // 不能在 DOM 里数页码类：编辑器只为视口内的行建元素，没渲染出来的那些页不在 DOM 里
    // （2026-11-23 踩过：数出 4 页，PDF 实际 7 页）。
    const docPages = fixture().split('\n').filter((line) => line.trim() === '---').length + 1

    // 走真实的菜单导出（File → 导出幻灯片 PDF），不自己拼 printToPDF：
    // 导出路径里的页面尺寸、渲染进程的进入/退出都在这条路上。
    const clicked = await evaluate(main, `(() => {
      const { Menu } = require('electron')
      const menu = Menu.getApplicationMenu()
      if (!menu) return 'no-menu'
      let hit = null
      const walk = (items) => {
        for (const item of items) {
          if (item.submenu) walk(item.submenu.items)
          else if (/幻灯片\\s*PDF|Slides\\s*PDF/i.test(item.label || '')) hit = item
        }
      }
      walk(menu.items)
      if (!hit) return 'no-item'
      if (typeof hit.click !== 'function') return 'no-click'
      hit.click()
      return 'clicked'
    })()`, 30000, 'menu-click')
    if (clicked !== 'clicked') throw new Error(`触发导出菜单失败：${clicked}`)

    for (let i = 0; i < 480; i++) {
      if (existsSync(out)) break
      const failure = await evaluate(main, 'globalThis.__exportError && JSON.stringify(globalThis.__exportError)')
      if (failure) throw new Error(`导出报错 ${failure}`)
      await sleep(250)
    }
    if (!existsSync(out)) throw new Error('120s 内没有产出文件')

    renderer.close()
    main.close()

    const buffer = readFileSync(out)
    const { pages, declared } = pageCount(buffer)
    const count = Math.max(pages, declared)
    console.log(`文档 ${docPages} 页，PDF ${count} 页（/Type /Page ${pages}，/Count ${declared}），${buffer.length} 字节`)

    const colors = colorsIn(contentStreams(buffer))
    const paper = mix(PAPER, ACCENT, 0.05)
    const hasAccent = hasColor(colors, ACCENT)
    const hasPaper = hasColor(colors, paper)
    console.log(`纸上颜色：底色 ${hasPaper ? '有' : '无'}，强调色 ${hasAccent ? '有' : '无'}（共 ${colors.length} 处着色）`)

    if (count !== docPages) {
      console.log(`✗ 纸上 ${count} 页，文档 ${docPages} 页：内容超出一页，或一页被拆成两页`)
      process.exitCode = 1
    }
    if (!hasPaper) {
      console.log('✗ 纸上没有底色：页面背景没写进内容流')
      process.exitCode = 1
    }
    if (!hasAccent) {
      console.log('✗ 纸上没有强调色：--pele-* 作用域仍然取不到值')
      process.exitCode = 1
    }
    if (process.exitCode) return
    console.log(`✓ ${docPages} 页的稿子导出成 ${count} 页纸，底色与强调色都在纸上`)
  } finally {
    stopVerifyApp(udd)
    await sleep(300)
  }
}

main().catch((error) => {
  console.error(`✗ ${error.message}`)
  process.exitCode = 1
})
