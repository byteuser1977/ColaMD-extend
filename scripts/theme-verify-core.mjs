// 主题命中验收的共用核心：仓库脚本与独立 CLI 都走这一份逻辑。
//
// 判据（与应用内 `npm run verify:themes` 完全相同）：
//   1. 每条规则至少命中一个真实元素；
//   2. 每个主题至少有一条规则真的改变了计算样式；
//   3. 变量规则要看变量在 html 与 body 上是否取到了声明值。
//
// 这里自己管理 Electron 子进程与 CDP 连接，不依赖仓库专用的 verify-workdir /
// build-freshness，保证发布后的 `colamd-verify-themes` bin 也能独立运行。
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** 夹具要装下主题会碰的每一种元素，缺一种就会把主题误判成失效。 */
export const FIXTURE_MARKDOWN = [
  '# 一级标题',
  '',
  '## 二级标题',
  '',
  '### 三级标题',
  '',
  '#### 四级标题',
  '',
  '正文里有 **加粗**、`行内代码`、[一个链接](https://example.com/docs) 和 ~~删除线~~。',
  '',
  '另见裸链接 https://example.com/bare 这一段。',
  '',
  '> 引用的第一行',
  '> 引用的第二行',
  '',
  '| 表头甲 | 表头乙 |',
  '| --- | --- |',
  '| 单元格甲 | 单元格乙 |',
  '',
  '---',
  '',
  '```js',
  'const answer = 42',
  '```',
  '',
  '- 无序项甲',
  '- 无序项乙',
  '',
  '1. 有序项甲',
  '2. 有序项乙',
  '',
  '行内公式 $a^2+b^2=c^2$ 与行尾文本。',
  ''
].join('\n')

/**
 * 页内探针。
 *
 * 每个进程只装一次。它做三件事：
 *   - 把待测 CSS 拆成「一条规则一张表」，全部禁用后按需开关，量一条规则的净效果；
 *   - 变量规则（声明全是 `--x`）不看计算样式，看变量在 html 与 body 上是不是真的取到了那个值；
 *   - 别的规则查命中数 + 比计算样式快照。
 */
export const PROBE_SOURCE = `(() => {
  const PROBE_ATTR = 'data-theme-probe'
  for (const el of document.querySelectorAll('style[' + PROBE_ATTR + ']')) el.remove()
  const sheets = []

  window.__themeProbe = {
    load(css) {
      for (const s of sheets) s.el.remove()
      sheets.length = 0
      const parsed = document.createElement('style')
      parsed.setAttribute(PROBE_ATTR, 'parse')
      parsed.textContent = css
      document.head.appendChild(parsed)
      const list = [...parsed.sheet.cssRules]
      parsed.remove()
      list.forEach((rule, index) => {
        const el = document.createElement('style')
        el.setAttribute(PROBE_ATTR, String(index))
        el.textContent = rule.cssText
        const isVars = rule.style && rule.style.length > 0 && [...rule.style].every((p) => p.startsWith('--'))
        document.head.appendChild(el)
        if (!isVars) el.disabled = true
        sheets.push({ el, rule, index, isVars })
      })
      return list.length
    },

    describe(index) {
      const entry = sheets.find((s) => s.index === index)
      const rule = entry.rule
      if (rule.selectorText === undefined) return { selector: rule.cssText.slice(0, 40), kind: 'at', matches: -1 }
      const selector = rule.selectorText
      const vars = [...rule.style].every((p) => p.startsWith('--')) && rule.style.length > 0
      if (vars) {
        const html = getComputedStyle(document.documentElement)
        const body = getComputedStyle(document.body)
        const declared = [...rule.style].map((p) => [p, rule.style.getPropertyValue(p).trim()])
        const wrong = declared.filter(([p, v]) =>
          html.getPropertyValue(p).trim() !== v || body.getPropertyValue(p).trim() !== v)
        return { selector, kind: 'vars', matches: 1, declared: declared.length, wrong: wrong.map(([p, v]) => p + '=' + v) }
      }
      if (/:hover|:focus|::|:has\\(/.test(selector)) return { selector, kind: 'interactive', matches: -2 }
      const nodes = [...document.querySelectorAll(selector)]
      return { selector, kind: 'rule', matches: nodes.length }
    },

    measure(index, limit = 3) {
      const entry = sheets.find((s) => s.index === index)
      const nodes = [...document.querySelectorAll(entry.rule.selectorText)].slice(0, limit)
      if (nodes.length === 0) return { changed: 0, sample: [] }
      const before = nodes.map(snapshot)
      entry.el.disabled = false
      const after = nodes.map(snapshot)
      entry.el.disabled = true
      let changed = 0
      const sample = []
      for (let i = 0; i < nodes.length; i++) {
        for (const prop of Object.keys(after[i])) {
          if (before[i][prop] !== after[i][prop]) {
            changed++
            if (sample.length < 3) sample.push(prop + ': ' + before[i][prop] + ' → ' + after[i][prop])
          }
        }
      }
      return { changed, sample }
    },

    builtin() {
      const found = []
      for (const sheet of document.styleSheets) {
        let rules = null
        try { rules = sheet.cssRules } catch { continue }
        for (const rule of rules) {
          const selector = rule.selectorText
          if (!selector || !/body\\.theme-[a-z-]+/.test(selector)) continue
          if (/:hover|:focus|::/.test(selector)) continue
          found.push({ theme: selector.match(/body\\.theme-([a-z-]+)/)[1], selector })
        }
      }
      const out = {}
      const keep = document.body.className
      for (const entry of found) {
        const stat = out[entry.theme] ?? (out[entry.theme] = { rules: 0, empty: [] })
        stat.rules++
        document.body.className = keep.replace(/theme-[a-z-]+/g, '').trim() + ' theme-' + entry.theme
        if (document.querySelectorAll(entry.selector).length === 0) {
          stat.empty.push(entry.selector.replace(/body\\.theme-[a-z-]+ ?/g, ''))
        }
      }
      document.body.className = keep
      return out
    }
  }

  function snapshot(el) {
    const cs = getComputedStyle(el)
    const out = {}
    for (const prop of cs) out[prop] = cs.getPropertyValue(prop)
    return out
  }

  document.body.className = document.body.className.replace(/theme-[a-z-]+/g, '').trim()
  document.body.classList.add('theme-custom')
  return true
})()`

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function connect(url) {
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

export async function waitTarget(port, predicate, ms = 30000) {
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

export function evaluate(client, expression) {
  return client.send('Runtime.evaluate', {
    expression, includeCommandLineAPI: true, returnByValue: true, awaitPromise: true
  }).then((result) => {
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails).slice(0, 400))
    return result.result?.value
  })
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

/**
 * 跑一遍主题命中验收。
 *
 * @param {object} options
 * @param {string} options.appRoot      含 dist/ 与 scripts/ 的应用根目录
 * @param {string} options.electronBin  Electron 可执行文件路径
 * @param {Array<{name: string, css: string}>} options.themes
 * @param {boolean} [options.includeBuiltin] 是否顺带检查内置主题规则
 * @param {string} options.workDir      夹具与 profile 的临时目录
 * @param {string} [options.userDataDir] Electron profile 目录，默认 workDir/udd-main
 * @param {(message: string) => void} [options.log]
 * @param {() => void} [options.onCleanup]
 * @returns {Promise<number>} 失败项数
 */
export async function runThemeHitCheck(options) {
  const {
    appRoot,
    electronBin,
    themes,
    includeBuiltin = false,
    workDir,
    log = console.log,
    onCleanup = () => {}
  } = options

  mkdirSync(workDir, { recursive: true })
  const userDataDir = options.userDataDir ?? join(workDir, 'udd-main')
  const source = join(workDir, 'themes.md')
  writeFileSync(source, FIXTURE_MARKDOWN, 'utf8')

  const port = 9990 + Math.floor(Math.random() * 30)
  const child = spawn(
    electronBin,
    [
      join(appRoot, 'scripts', 'offscreen-window.cjs'),
      source,
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${port}`
    ],
    { cwd: appRoot, stdio: 'ignore', detached: process.platform !== 'win32', windowsHide: true }
  )

  let failures = 0
  const fail = (message) => { failures++; log(`  ✗ ${message}`) }

  try {
    const page = await waitTarget(port, (t) => t.type === 'page' && /index\.html/.test(t.url))
    const renderer = await connect(page.webSocketDebuggerUrl)
    // CodeMirror 只为视口内的行建 DOM。夹具比一屏长，视口不够高的话下半段根本不渲染。
    await renderer.send('Emulation.setDeviceMetricsOverride', {
      width: 1200, height: 2600, deviceScaleFactor: 1, mobile: false
    })
    let loaded = false
    for (let i = 0; i < 80; i++) {
      const ok = await evaluate(renderer, `(() => {
        const el = document.querySelector('#editor .cm-content')
        return el ? el.textContent.includes('一级标题') && el.querySelector('.cm-md-table-widget th') !== null
          && el.querySelector('.cm-md-url') !== null : false
      })()`)
      if (ok === true) { loaded = true; break }
      await sleep(250)
    }
    if (!loaded) throw new Error('夹具没进编辑器（或表格 widget 没渲染出来）')

    await evaluate(renderer, PROBE_SOURCE)

    log(`独立主题文件（${themes.length} 个）`)
    for (const { name, css } of themes) {
      const total = await evaluate(renderer, `window.__themeProbe.load(${JSON.stringify(css)})`)
      let effective = 0
      const skipped = []
      for (let index = 0; index < total; index++) {
        const info = await evaluate(renderer, `JSON.stringify(window.__themeProbe.describe(${index}))`)
        const rule = JSON.parse(info)
        if (rule.kind === 'at') continue
        if (rule.kind === 'interactive') { skipped.push(rule.selector); continue }
        if (rule.kind === 'vars') {
          if (rule.wrong.length > 0) fail(`${name}: 变量没生效 ${rule.wrong.join(' ')}`)
          else effective++
          continue
        }
        if (rule.matches === 0) {
          fail(`${name}: 命中不到任何元素 ${rule.selector}`)
          continue
        }
        const result = JSON.parse(await evaluate(renderer, `JSON.stringify(window.__themeProbe.measure(${index}))`))
        if (result.changed > 0) effective++
        else skipped.push(rule.selector)
      }
      const note = skipped.length > 0 ? `，另有 ${skipped.length} 条当前量不出差别（${skipped.join('、')}）` : ''
      log(`  ${effective > 0 ? '✓' : '✗'} ${name}：${total} 条规则，${effective} 条确有作用${note}`)
      if (effective === 0) fail(`${name}: 没有任何一条规则在起作用，这个主题是个空壳`)
    }

    if (includeBuiltin) {
      log('内置主题（应用样式表里的 body.theme-* 规则）')
      const builtin = JSON.parse(await evaluate(renderer, `JSON.stringify(window.__themeProbe.builtin())`))
      for (const [theme, info] of Object.entries(builtin).sort()) {
        if (info.empty.length > 0) fail(`theme-${theme}: 命中不到任何元素 ${info.empty.join(' | ')}`)
        else log(`  ✓ theme-${theme}：${info.rules} 条规则全部命中`)
      }
    }
  } finally {
    stopChild(child)
    onCleanup()
  }

  return failures
}

/** 读一个目录下的全部 CSS，返回 CLI / 仓库脚本都能用的主题数组。 */
export function readThemeDirectory(dir) {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.css'))
    .sort()
    .map((file) => ({ name: file, css: readFileSync(join(dir, file), 'utf8') }))
}
