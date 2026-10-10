// Single hidden iframe that owns Mermaid rendering. Mermaid runs in the
// sandbox document (its own chunk), keeping the main bundle and main thread
// free of it. The iframe is created lazily on the first Mermaid block.

const DARK_THEME_CLASSES = new Set([
  'theme-dark',
  'theme-solarized-dark',
  'theme-nord',
  'theme-gruvbox',
  'theme-dracula',
  'theme-midnight',
])

const RENDER_TIMEOUT_MS = 15_000

type Pending = {
  resolve: (svg: string) => void
  reject: (reason: Error) => void
  timer: ReturnType<typeof setTimeout>
}

type SandboxMessage =
  | { type: 'ready' }
  | { type: 'result'; id: number; ok: true; svg: string }
  | { type: 'result'; id: number; ok: false; error: string }

let iframe: HTMLIFrameElement | null = null
let ready = false
let nextRenderId = 0
const pending = new Map<number, Pending>()
type QueuedRender = { run: () => void; reject: (reason: Error) => void }

const waitingForReady: QueuedRender[] = []

// 还没落定的渲染。导出前要等它们画完，否则 PDF/HTML 里印的是「图表渲染中…」的占位。
const activeRenders = new Set<Promise<unknown>>()

/**
 * 等当前所有 mermaid 渲染落定（成功或失败都算）。导出与富文本复制前调用。
 * 循环而不是一次 allSettled：整篇展开的过程中会不断有新 widget 开始渲染，
 * 一次收尾可能漏掉后出发的那批。每个渲染都有 15s 超时兜底，不会永远等下去。
 */
export async function awaitAllMermaidRenders(): Promise<void> {
  while (activeRenders.size > 0) {
    await Promise.allSettled(Array.from(activeRenders))
  }
}

function currentTheme(): 'default' | 'dark' {
  for (const cls of DARK_THEME_CLASSES) {
    if (document.body.classList.contains(cls)) return 'dark'
  }
  return 'default'
}

// Diagrams render on the code-block background, which can disagree with the
// app theme's overall brightness (elegant/bear are light themes with dark
// code blocks). Pick the Mermaid palette by background luminance instead.
function mermaidThemeForBackground(bg: string): 'default' | 'dark' {
  const match = bg.trim().match(/^#([0-9a-f]{6})$/i)
  if (!match) return currentTheme()
  const value = parseInt(match[1], 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5 ? 'dark' : 'default'
}

// 主题可以用一组 CSS 变量声明自己的 Mermaid 调色板（导入主题就是纯 CSS 文件，
// 这是它把配色带进图表的唯一通道）。变量由这里读出，经渲染请求传给沙箱，
// 沙箱把它们并进 mermaid 的 themeVariables 并切到 'base' 主题。
// 只在主题真的声明了变量时才接管：内置主题不定义这些变量，仍走 default/dark。
const MERMAID_PALETTE_VARS: Array<[cssVar: string, mermaidKey: string]> = [
  ['--mermaid-primary-color', 'primaryColor'],
  ['--mermaid-primary-text', 'primaryTextColor'],
  ['--mermaid-primary-border', 'primaryBorderColor'],
  ['--mermaid-line-color', 'lineColor'],
  ['--mermaid-text-color', 'textColor'],
  ['--mermaid-secondary-color', 'secondaryColor'],
  ['--mermaid-tertiary-color', 'tertiaryColor'],
  ['--mermaid-cluster-bg', 'clusterBkg'],
  ['--mermaid-cluster-border', 'clusterBorder'],
]

function readMermaidPalette(): Record<string, string> | null {
  const style = getComputedStyle(document.body)
  const vars: Record<string, string> = {}
  for (const [cssVar, mermaidKey] of MERMAID_PALETTE_VARS) {
    const value = style.getPropertyValue(cssVar).trim()
    if (value) vars[mermaidKey] = value
  }
  return Object.keys(vars).length > 0 ? vars : null
}

function rejectAllPending(reason: Error): void {
  for (const entry of pending.values()) {
    clearTimeout(entry.timer)
    entry.reject(reason)
  }
  pending.clear()
}

// A hung render (e.g. known Mermaid gantt OOM cases) must not poison later
// ones: destroy the sandbox wholesale and let the next request rebuild it.
function destroyIframe(): void {
  if (iframe) {
    iframe.remove()
    iframe = null
  }
  ready = false
  // Queued requests never entered `pending`; reject them too so code blocks
  // leave source view instead of waiting forever after a sandbox reset.
  const queued = waitingForReady.splice(0)
  for (const entry of queued) entry.reject(new Error('渲染超时，已重置渲染器'))
}

function ensureIframe(): void {
  if (iframe) return
  iframe = document.createElement('iframe')
  // Not display:none — hidden iframes still need layout for text measurement,
  // otherwise rendered SVGs come out with zero size.
  iframe.style.position = 'fixed'
  iframe.style.left = '-9999px'
  iframe.style.width = '1024px'
  iframe.style.height = '768px'
  iframe.style.visibility = 'hidden'
  iframe.style.border = '0'
  iframe.src = './mermaid-sandbox.html'
  document.body.appendChild(iframe)
}

function dispatchRender(code: string, resolve: (svg: string) => void, reject: (reason: Error) => void, options: { theme?: 'default' | 'dark'; bg?: string } = {}): void {
  const id = ++nextRenderId
  const timer = setTimeout(() => {
    pending.delete(id)
    rejectAllPending(new Error('渲染超时，已重置渲染器'))
    destroyIframe()
  }, RENDER_TIMEOUT_MS)
  pending.set(id, { resolve, reject, timer })
  // The palette follows the surface the diagram is drawn on. On screen that is
  // the code block's own colour; an export says which one it wants.
  //
  // 显式 theme 只来自导出（画布色是固定的白/黑），那时配色跟画布走内置调色板；
  // 屏幕路径若主题声明了 --mermaid-* 调色板，就整组接管（mermaid 'base' 主题），
  // 否则退回按代码块背景亮度选 default/dark 的老路。
  const bg = options.bg ?? getComputedStyle(document.body).getPropertyValue('--code-block-bg').trim()
  const palette = options.theme ? null : readMermaidPalette()
  const theme = options.theme ?? (palette ? 'base' : mermaidThemeForBackground(bg))
  iframe?.contentWindow?.postMessage({ type: 'render', id, code, theme, bg, themeVariables: palette ?? undefined }, '*')
}

window.addEventListener('message', (event) => {
  if (!iframe || event.source !== iframe.contentWindow) return
  const data = event.data as SandboxMessage | undefined
  if (!data) return

  if (data.type === 'ready') {
    ready = true
    const queued = waitingForReady.splice(0)
    for (const entry of queued) entry.run()
    return
  }

  if (data.type === 'result') {
    const entry = pending.get(data.id)
    if (!entry) return
    pending.delete(data.id)
    clearTimeout(entry.timer)
    if (data.ok) entry.resolve(data.svg)
    else entry.reject(new Error(data.error || '语法错误'))
  }
})

export function releaseMermaidRenderer(): void {
  rejectAllPending(new Error('文档已切换'))
  destroyIframe()
}

export function renderMermaid(code: string, options: { theme?: 'default' | 'dark'; bg?: string } = {}): Promise<string> {
  ensureIframe()
  const promise = new Promise<string>((resolve, reject) => {
    const run = () => dispatchRender(code, resolve, reject, options)
    if (ready) {
      run()
    } else {
      waitingForReady.push({ run, reject })
    }
  })
  // 落定后移出集合。catch 吞掉失败——失败也算落定（widget 自己会退回源码），不该抛未处理拒绝。
  activeRenders.add(promise)
  void promise.catch(() => {}).finally(() => activeRenders.delete(promise))
  return promise
}