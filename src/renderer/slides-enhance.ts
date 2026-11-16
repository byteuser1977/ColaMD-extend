// 幻灯片放映/导出的页面增强宿主：页内 CSS 注入 + 受限 JS 沙箱。
//
// 这是一个刻意的「孤岛」模块：slideshow.ts、slides-export.ts、live-preview.ts
// 一行都不改。进出场靠观察 body 的 presenting / slides-printing 类；翻页靠观察
// #slideshow-rules 的样式文本——放映层每翻一页就把隐藏规则重写成
// `:not(.cm-md-page-N)`，从这里提取 N 就是当前页码。若上游某天改掉这个 id 或
// 写法，本模块的表现是版式安静失效（编辑一切正常），补一行即可。
//
// JS 的安全模型：页面脚本跑在一个 `sandbox="allow-scripts"` 的隐藏 iframe 里，
// 没有 allow-same-origin，于是它是 opaque origin，拿不到 window.top、父文档、
// localStorage——「不碰编辑器」是结构保证，不是约定。翻页就重载 iframe，定时器、
// 监听器、闭包一次清零，不用逐个回收。脚本想影响页面，只能走 postMessage 桥：
// setClass/setVar 落在放映面上、记录在案、离场回滚。
//
// 为什么用 blob URL 而不是 srcdoc：渲染进程的 CSP 是 default-src 'self'，srcdoc
// 文档继承父 CSP，内联脚本直接被拦；blob URL 文档不继承，但 iframe 加载它需要
// CSP 里放行 blob:（index.html 已补 frame-src）。这条路只给沙箱开了门，
// 应用自身的 script-src 依然不许内联。

import './themes/slides.css'
import { getSlideDirectives, scopeSlideCSS } from './editor/slide-directives'
import { PAGE_CLASS_PREFIX } from './editor/live-preview'

const PRESENTING_CLASS = 'presenting'
const PRINT_CLASS = 'slides-printing'
const RULE_STYLE_ID = 'slideshow-rules'
const PAGE_CSS_ID = 'slideshow-page-css'
const PRINT_CSS_ID = 'slides-page-css'
/** 放映层的翻页痕迹：applyPage 重写的隐藏规则里带着当前页码。 */
const PAGE_IN_RULES = /cm-md-page-(\d+)/

/** 应用 setClass/setVar 的落点：放映时 #editor 就是整张纸面。 */
function surface(): HTMLElement | null {
  return document.getElementById('editor')
}

/** 名字进类名/变量名前先过这一关：白名单之外的字一概不认。 */
const SAFE_NAME = /^[a-zA-Z][a-zA-Z0-9-]*$/

let active = false
let printing = false
let currentPage = 0
let pageStyle: HTMLStyleElement | null = null
let printStyle: HTMLStyleElement | null = null
let host: HTMLIFrameElement | null = null
let hostUrl: string | null = null
/** 本次页面脚本动过的类与变量，离场时逐个还原。 */
const appliedClasses = new Set<string>()
const appliedVars = new Set<string>()
let initialized = false

export function initSlidesEnhance(): void {
  if (initialized) return
  initialized = true

  const onBodyClass = (): void => {
    const presenting = document.body.classList.contains(PRESENTING_CLASS)
    if (presenting && !active) enterPresentation()
    if (!presenting && active) exitPresentation()
    const printingNow = document.body.classList.contains(PRINT_CLASS)
    if (printingNow && !printing) mountPrintCss()
    if (!printingNow && printing) unmountPrintCss()
  }
  // body 类是放映/导出的总开关；childList 一起看是因为 #slideshow-rules 在
  // 开始放映时才插进 head，等它出现才挂得上翻页观察。
  new MutationObserver(onBodyClass).observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
    childList: true,
    subtree: true,
  })
  onBodyClass()
}

// ─── 放映 ────────────────────────────────────────────────────────────────────

/** 盯着放映层的翻页痕迹：rules 文本一变就是翻了一页。 */
let pageWatcher: MutationObserver | null = null

function watchRuleStyle(): void {
  pageWatcher?.disconnect()
  pageWatcher = null
  const rules = document.getElementById(RULE_STYLE_ID)
  if (!rules) return
  // 进场时 rules 已带着第一页的页码，先读一次，之后每次重写都跟着换页。
  syncPageFrom(rules.textContent)
  pageWatcher = new MutationObserver(() => syncPageFrom(rules.textContent))
  pageWatcher.observe(rules, { characterData: true, childList: true, subtree: true })
}

function syncPageFrom(text: string | null): void {
  const found = text?.match(PAGE_IN_RULES)
  if (!found) return
  const page = Number(found[1])
  if (page === currentPage) return
  currentPage = page
  if (active) applyCurrentPage()
}

function enterPresentation(): void {
  active = true
  pageStyle = document.createElement('style')
  pageStyle.id = PAGE_CSS_ID
  document.head.appendChild(pageStyle)
  watchRuleStyle()
  applyCurrentPage()
}

function exitPresentation(): void {
  active = false
  pageWatcher?.disconnect()
  pageWatcher = null
  pageStyle?.remove()
  pageStyle = null
  teardownHost()
  resetApplied()
  surface()?.removeAttribute('data-slide-layout')
}

/** 每次翻页都调：页内 CSS 整体替换，JS 宿主重载（即清理），上一页的类/变量还原。 */
function applyCurrentPage(): void {
  const dirs = getSlideDirectives().get(currentPage)
  if (pageStyle) {
    const css = (dirs?.css ?? []).map((block) => scopeSlideCSS(block, `${PAGE_CLASS_PREFIX}${currentPage}`, `body.${PRESENTING_CLASS}`))
    pageStyle.textContent = css.join('\n')
  }
  // 当前页版式写给 #editor 的 data-slide-layout：版式包里容器级的规则
  // （居中、双栏）靠它选中「正在放映的这一页」。属性值换走再换回来，
  // CSS 动画就重播一次，正好是「每次翻到这页都进场」。
  const name = dirs?.layout ?? ''
  const surface_ = surface()
  if (surface_) {
    if (name && SAFE_NAME.test(name)) surface_.dataset.slideLayout = name
    else surface_.removeAttribute('data-slide-layout')
  }
  teardownHost()
  resetApplied()
  const js = dirs?.js.join('\n;\n')
  if (js) mountHost(js)
}

// ─── JS 沙箱 ─────────────────────────────────────────────────────────────────

/** 每个宿主一个随机 token：桥上的消息认 token 不认来源，别的窗口仿造不进来。 */
function newToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

let bridgeToken = ''

function bootHtml(token: string): string {
  return `<!doctype html><html><body><script>
(function () {
  var TOKEN = ${JSON.stringify(token)};
  var slide = {
    setClass: function (name, value) {
      parent.postMessage({ __colamdSlide: 1, token: TOKEN, kind: 'class', name: name, value: value }, '*');
    },
    setVar: function (name, value) {
      parent.postMessage({ __colamdSlide: 1, token: TOKEN, kind: 'var', name: name, value: value }, '*');
    },
    setTimeout: function (fn, ms) { return setTimeout(fn, ms); },
    requestAnimationFrame: function (fn) { return requestAnimationFrame(fn); }
  };
  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.__colamdSlideRun !== 1 || data.token !== TOKEN) return;
    try { (new Function('slide', data.code))(slide); }
    catch (err) { console.warn('[slide-js]', err); }
  });
  parent.postMessage({ __colamdSlide: 1, token: TOKEN, ready: true }, '*');
})();
</script></body></html>`
}

function mountHost(code: string): void {
  const target = surface()
  if (!target) return
  bridgeToken = newToken()
  const html = bootHtml(bridgeToken)
  const blob = new Blob([html], { type: 'text/html' })
  hostUrl = URL.createObjectURL(blob)
  host = document.createElement('iframe')
  host.setAttribute('sandbox', 'allow-scripts')
  host.setAttribute('aria-hidden', 'true')
  host.title = 'slide script host'
  host.style.display = 'none'
  host.src = hostUrl
  pendingCode = code
  // 消息只认 token + 当前的 contentWindow：旧宿主的迟到消息（清理竞态）自然作废。
  window.addEventListener('message', onBridgeMessage)
  target.appendChild(host)
}

let pendingCode = ''

function teardownHost(): void {
  window.removeEventListener('message', onBridgeMessage)
  if (host) {
    host.remove()
    host = null
  }
  if (hostUrl) {
    URL.revokeObjectURL(hostUrl)
    hostUrl = null
  }
  pendingCode = ''
}

function onBridgeMessage(event: MessageEvent): void {
  const data = event.data as
    | { __colamdSlide?: number; token?: string; ready?: boolean; kind?: string; name?: string; value?: unknown }
    | null
  if (!data || data.__colamdSlide !== 1 || data.token !== bridgeToken) return
  if (event.source !== host?.contentWindow) return
  if (data.ready) {
    host?.contentWindow?.postMessage({ __colamdSlideRun: 1, token: bridgeToken, code: pendingCode }, '*')
    return
  }
  if (data.kind === 'class') applyClass(String(data.name ?? ''), Boolean(data.value))
  if (data.kind === 'var') applyVar(String(data.name ?? ''), data.value)
}

function applyClass(name: string, value: boolean): void {
  if (!SAFE_NAME.test(name)) return
  const surface_ = surface()
  if (!surface_) return
  const cls = `slide-${name}`
  surface_.classList.toggle(cls, value)
  if (value) appliedClasses.add(cls)
  else appliedClasses.delete(cls)
}

function applyVar(name: string, value: unknown): void {
  if (!SAFE_NAME.test(name)) return
  const surface_ = surface()
  if (!surface_) return
  const prop = `--slide-${name}`
  surface_.style.setProperty(prop, String(value))
  appliedVars.add(prop)
}

function resetApplied(): void {
  const surface_ = surface()
  if (surface_) {
    for (const cls of appliedClasses) surface_.classList.remove(cls)
    for (const prop of appliedVars) surface_.style.removeProperty(prop)
  }
  appliedClasses.clear()
  appliedVars.clear()
}

// ─── 导出（slides-printing） ─────────────────────────────────────────────────
//
// 导出时 JS 一律不执行（不建宿主），页面保持 CSS 静态效果；页内 CSS 与放映同一套
// 白名单，只是 guard 换成打印类、一次注入全篇。

function mountPrintCss(): void {
  printing = true
  const rules: string[] = []
  for (const [page, dirs] of getSlideDirectives()) {
    for (const block of dirs.css) {
      rules.push(scopeSlideCSS(block, `${PAGE_CLASS_PREFIX}${page}`, `body.${PRINT_CLASS}`))
    }
  }
  printStyle = document.createElement('style')
  printStyle.id = PRINT_CSS_ID
  printStyle.textContent = rules.join('\n')
  document.head.appendChild(printStyle)
}

function unmountPrintCss(): void {
  printing = false
  printStyle?.remove()
  printStyle = null
}

// 模块加载即挂监听：main.ts 只 import 这一个文件，一行接通全部行为。
// module script 是 defer 语义，执行到这里时 body 已解析完；万一不是（非标准
// 载入路径），退到 DOMContentLoaded 再挂，观察器晚一拍不丢状态。
if (document.body) initSlidesEnhance()
else document.addEventListener('DOMContentLoaded', initSlidesEnhance, { once: true })
