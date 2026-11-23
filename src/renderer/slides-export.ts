// 导出幻灯片 PDF (File → Export Slides PDF).
//
// 一页就是一个 `---`，切法与放映共用一处：装饰层按语法树里的 HorizontalRule 给每一行
// 打上页码类（`cm-md-page-N`，见 editor/live-preview.ts 的 collectPages）。这里不再自己
// 数 DOM 的第几个孩子：CM6 会往正文里插 gap 元素，序号对不上。
//
// 主进程负责文件和对话框；这个模块负责「把编辑面变成纸」：把窗口变成一张张 16:9 的纸，
// 量出每页内容落在纸上的高度，然后还原。
//
// 纸面是 1920×1080 的设计空间，字号、边距、行高全部取 slides.css 的同一份令牌
// （正文 25.92px、左右边距 115.2px）。导出不再自带一套字号。
//
// 它不动编辑器的 DOM。每页的第一行带 `break-before: page`，内容一律从页顶安全区开始、
// 不垂直居中。装不下的页用 `zoom` 整页等比缩放压回一页：zoom 是唯一能把一整页
// 连字号带内距一起缩小的布局手段（改 font-size 会和标题自己的字号规则打架）。

import { PAGE_CLASS_PREFIX, PAGE_START_CLASS } from './editor/live-preview'
import { deckPages, tagBlockWidgets } from './slideshow'
import { renderWholeDocument, restoreViewport } from './print-layout'

/** 16:9, the shape a projector expects and the shape the deck fills. */
const PAGE_WIDTH_INCHES = 20
const PAGE_HEIGHT_INCHES = 11.25

/** Chromium prints at 96 CSS pixels to the inch. */
const PX_PER_INCH = 96
const PAGE_WIDTH_PX = Math.round(PAGE_WIDTH_INCHES * PX_PER_INCH)
const PAGE_HEIGHT_PX = Math.round(PAGE_HEIGHT_INCHES * PX_PER_INCH)
/** A page that fills its sheet exactly is a page that spills over it: leave a hair. */
const SAFETY_PX = 4
/**
 * 装不下时整页缩到的下限。
 *
 * 这个下限只防退化（缩到 0 就什么都不剩了），不是「宁可分两页」的许可：
 * 用户要的是「超出一张纸高的页整页等比缩放压回一页」（2026-11-23 定的），
 * 页裂成两张纸正是当初要修的那个毛病。所以这里让位到实际需要的高度：
 * 内容实在太多时纸上字会小到读不清，但纸上仍然是一页——那本来就该由作者去分页。
 */
const MIN_ZOOM = 0.08
/** 缩放系数要试几轮：估一个、量一次、按量的结果再修一次。 */
const FIT_ROUNDS = 4

/**
 * 纸面是 1920×1080 的设计空间，下面这些就是各令牌在 1920×1080 的视口下解出来的数。
 *
 * 为什么不用 vw/vh 直接算：打印布局的视口是纸面（1920×1080，PDF 里 1px = 0.75pt），
 * 但导出是在**屏幕布局**里量页高的——屏幕的视口是窗口那么大（常常不到 1920），
 * 靠视口的值在两处对不上，量出来的页高和纸上落下来的不是一回事。所以这里把令牌
 * 按纸面定死，版心也定死成 1920，两处的换行位置才会一模一样。
 */
const PAPER = {
  /** clamp(17px, 1.35vw, 26px) @1920 */
  bodySize: 25.92,
  /** 6vw @1920 */
  padX: 115.2,
  /** clamp(11px, 0.72vw, 15px) @1920 */
  kicker: 13.824,
  /** clamp(20px, 3.2vh, 40px) @1080 */
  chromePadY: 34.56,
  /** clamp(18px, 1.6vw, 30px) @1920 */
  chromeLogoH: 30,
  /** clamp(16px, 2.4vh, 28px) @1080 */
  footPadY: 25.92,
  /** 72vh @1080 —— 与放映里 base.css 给 img/svg 的高度上限同一个比例 */
  imgMaxH: 777.6,
  /** 66vh @1080 */
  figureMaxH: 712.8
}

const PRINT_CLASS = 'slides-printing'
const STYLE_ID = 'slides-print-style'

export type SlidesSheet = { width: number; height: number }

let sheetStyle: HTMLStyleElement | null = null
let restoreScrollTop = 0

declare global {
  interface Window {
    /** The main process asks the document to become paper through this. */
    __colamdSlidesExport?: { enter: () => Promise<SlidesSheet | false>; exit: () => void }
  }
}

function documentRoot(): HTMLElement | null {
  return document.querySelector('#editor .cm-content') as HTMLElement | null
}

function scroller(): HTMLElement | null {
  return document.querySelector('#editor .cm-scroller') as HTMLElement | null
}

function pageOfLine(line: Element): number | null {
  const match = new RegExp(`(?:^|\\s)${PAGE_CLASS_PREFIX}(\\d+)(?:\\s|$)`).exec(line.className ?? '')
  return match ? Number(match[1]) : null
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

/**
 * 等所有图（mermaid）画完。
 *
 * 整篇渲染会给视口外的行新建 DOM，那些图是刚发起的异步渲染，函数返回时还停在
 * 「图表渲染中…」占位（见 live-preview 的 MermaidWidget）。不在这里等，纸上印出来
 * 就是这行占位文案，而不是图（2026-11-24 报的）。渲染失败或超时就放行：图没上纸，
 * 也比导出卡死好。
 */
async function waitForDiagrams(root: HTMLElement, timeoutMs = 15000): Promise<void> {
  const pending = (): number => root.querySelectorAll(
    '.cm-md-mermaid:not(.cm-md-mermaid-ready):not(.cm-md-mermaid-failed)',
  ).length
  const deadline = Date.now() + timeoutMs
  while (pending() > 0 && Date.now() < deadline) await nextFrame()
  // 图比占位高，块高变了：再让一帧，后面量页高才是画完之后的高度。
  await nextFrame()
}

/**
 * 主题色。从 body 上读自定义属性的计算值：主题的覆盖写在 body.theme-* 上，
 * :root 只留浅色默认值（见 themes/base.css 的注释）。读不到就退到 html，再退到兜底色。
 */
function themeColor(name: string, fallback: string): string {
  const onBody = getComputedStyle(document.body).getPropertyValue(name).trim()
  if (onBody) return onBody
  const onRoot = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return onRoot || fallback
}

function layoutRules(background: string, accent: string): string {
  // 底色在主题底色上极轻地拌一点强调色：白纸不刺眼、深纸不死黑，整副牌更柔和，
  // 也和主题的强调色同调。底色与强调色都取主题的实值写进来，不留 var()：
  // 纸面上 color-mix(in srgb, 透明 95%, var(--pele-accent)) 整条不成立，纸上就没有底色。
  const softened = `color-mix(in srgb, ${background} 95%, ${accent})`
  return `/* The sheet is the page: what margins exist in here are the document's own. */
@page { size: ${PAGE_WIDTH_INCHES}in ${PAGE_HEIGHT_INCHES}in; margin: 0; background: ${softened}; }
html, body { display: block !important; height: auto !important; overflow: visible !important; background: ${softened} !important; }
/* 纸面是 1920×1080 的设计空间：跟着视口走的令牌在这里定死，屏幕上的视口再窄，
   纸上落下来的版式也不变。 */
body.${PRINT_CLASS} {
  --slide-page-pad-x: ${PAPER.padX}px;
  --slide-body-size: ${PAPER.bodySize}px;
  --slide-kicker-size: ${PAPER.kicker}px;
  --slide-chrome-pad-y: ${PAPER.chromePadY}px;
  --slide-chrome-logo-h: ${PAPER.chromeLogoH}px;
  --slide-foot-pad-y: ${PAPER.footPadY}px;
  --slide-img-max-h: ${PAPER.imgMaxH}px;
  --slide-figure-max-h: ${PAPER.figureMaxH}px;
}
body.${PRINT_CLASS} #editor {
  position: static !important;
  inset: auto !important;
  height: auto !important;
  overflow: visible !important;
  padding: 0 !important;
  background: ${softened} !important;
}
/* 纸是普通的块流：CM6 的编辑器/滚动容器都是 flex 或 auto 高度，强制断开的分页在
   它们里面不会生效，所以这里把它们摊平成块。 */
body.${PRINT_CLASS} #editor .cm-editor { height: auto !important; }
body.${PRINT_CLASS} #editor .cm-scroller { display: block !important; height: auto !important; overflow: visible !important; }
/* 版心就是纸面那么宽：屏幕上的窗口常常不到 1920，版心若跟着窗口走，量出来的
   换行位置和纸上落下来的就不是一回事。 */
body.${PRINT_CLASS} #editor .cm-content {
  display: block !important;
  width: ${PAGE_WIDTH_PX}px !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 ${PAPER.padX}px !important;
}
/* 分隔线是分页边界，不是正文里的一行。 */
body.${PRINT_CLASS} #editor .cm-line.cm-md-hr { display: none !important; }
/* Nothing may be cut off at the sheet's edge: code and cells wrap. */
body.${PRINT_CLASS} #editor .cm-md-codeblock { white-space: pre-wrap !important; overflow-wrap: anywhere !important; }
body.${PRINT_CLASS} #editor .cm-md-table-widget th, body.${PRINT_CLASS} #editor .cm-md-table-widget td { overflow-wrap: anywhere !important; word-break: break-word !important; }
`
}

/** 一页在纸上的账：几行、占多高、要不要缩。 */
type PagePlan = {
  page: number
  lines: HTMLElement[]
  used: number
  zoom: number
  /** 放映里这一版式是整页垂直居中的（cover/section/closing），导出也要居中。 */
  centered: boolean
}

/** 放映里 justify-content:center 的版式（slides.css 的容器级规则）。 */
const CENTERED_LAYOUTS = ['cm-md-slide-cover', 'cm-md-slide-section', 'cm-md-slide-closing']

function isCenteredLayout(first: HTMLElement): boolean {
  return CENTERED_LAYOUTS.some((cls) => first.classList.contains(cls))
}

/**
 * 量一页在纸上占多高。
 *
 * 用的是边界盒：缩放过的页，边界盒给的就是缩放之后的视觉高度，和纸面同一个坐标系。
 * 页首那行的 margin 也要算进去：边界盒不含自己的 margin，可那一截白是真的在纸上。
 */
function measurePage(
  root: HTMLElement,
  page: number,
): { lines: HTMLElement[]; used: number; centered: boolean } | null {
  const first = root.querySelector(`.${PAGE_CLASS_PREFIX}${page}.${PAGE_START_CLASS}`) as HTMLElement | null
  const lines = Array.from(root.children).filter(
    (line) => pageOfLine(line) === page && !line.classList.contains('cm-md-hr'),
  ) as HTMLElement[]
  const last = lines[lines.length - 1]
  if (!first || !last) return null
  const ownMargin = parseFloat(getComputedStyle(first).marginTop)
  const owned = last.getBoundingClientRect().bottom - first.getBoundingClientRect().top
  const used = owned + (Number.isFinite(ownMargin) ? ownMargin : 0)
  return { lines, used, centered: isCenteredLayout(first) }
}

/**
 * 把纸面规则写出来。
 *
 * 每页第一行带 `break-before: page`，装不下的页带 `zoom`。`spacers` 是每页上方要
 * 撑的空白：只给 cover/section/closing 这类放映里整页垂直居中的版式撑，普通页
 * 一律从页顶安全区开始。量页高的时候不给它，给了页就变高了。
 */
function applySheet(
  sheet: HTMLStyleElement,
  background: string,
  accent: string,
  plans: PagePlan[],
  spacers: Map<number, number> | null,
): void {
  const rules: string[] = []
  plans.forEach((plan, order) => {
    const start = `.cm-content > .${PAGE_CLASS_PREFIX}${plan.page}.${PAGE_START_CLASS}`
    if (order > 0) rules.push(`body.${PRINT_CLASS} #editor ${start} { break-before: page; }`)
    if (plan.zoom < 1) {
      rules.push(`body.${PRINT_CLASS} #editor .${PAGE_CLASS_PREFIX}${plan.page} { zoom: ${plan.zoom}; }`)
    }
  })
  if (spacers) {
    for (const plan of plans) {
      const above = spacers.get(plan.page) ?? 0
      if (above <= 0) continue
      const start = `.cm-content > .${PAGE_CLASS_PREFIX}${plan.page}.${PAGE_START_CLASS}`
      // 页首那行在缩放里，::before 的高度写在缩放后的空间里：要的是视觉高度，得除回来。
      const css = plan.zoom < 1 ? above / plan.zoom : above
      rules.push(`body.${PRINT_CLASS} #editor ${start}::before { content: ''; display: block; height: ${css}px; }`)
    }
  }
  sheet.textContent = layoutRules(background, accent) + rules.join('\n') + '\n'
}

// Turn the window into sheets and remember the page size, or return false when
// there is nothing to export (no editor, no document).
export async function enterPrintLayout(): Promise<SlidesSheet | false> {
  if (sheetStyle) return { width: PAGE_WIDTH_INCHES, height: PAGE_HEIGHT_INCHES }
  const root = documentRoot()
  if (!root) return false

  const background = themeColor('--bg-color', '#ffffff')
  const accent = themeColor('--pele-accent', themeColor('--link-color', '#0969da'))

  const sheet = document.createElement('style')
  sheet.id = STYLE_ID
  sheet.textContent = layoutRules(background, accent)
  document.head.appendChild(sheet)
  document.body.classList.add(PRINT_CLASS)
  sheetStyle = sheet
  restoreScrollTop = scroller()?.scrollTop ?? 0

  // Measure on paper, never on screen: a page's height depends on the width and
  // the type size it is printed at, and this read is what makes the rules above
  // take effect before anything is measured.
  root.getBoundingClientRect()

  // 摊平之后还要等 CodeMirror 把整篇渲染出来。页数和页高都要量在整篇上：
  // 不等这一步，长文档只有视口里那几页，后面的页根本不在 DOM 里（2026-09-26 报的）。
  await renderWholeDocument()
  // Mermaid / 图片 / 表格是块级 widget，包在 .cm-lineWrapping 里，本身没有
  // 页码类；不补类的话，量页高时会把它漏掉。
  tagBlockWidgets(root)
  // 图是异步画的：整篇渲染刚新建的那些还没内容，等它们画完再量页高、再交给打印。
  await waitForDiagrams(root)

  const deck = deckPages()
  if (deck.length === 0) {
    exitPrintLayout()
    return false
  }

  const target = PAGE_HEIGHT_PX - SAFETY_PX
  const plans: PagePlan[] = []
  for (const page of deck) {
    const measured = measurePage(root, page)
    if (measured) plans.push({ page, lines: measured.lines, used: measured.used, zoom: 1, centered: measured.centered })
  }

  // 装不下的页整页等比缩放：先按高度差估一个系数，量一次再按量的结果修一次。
  for (let round = 0; round < FIT_ROUNDS; round++) {
    const over = plans.filter((plan) => plan.used > target)
    if (over.length === 0) break
    let changed = false
    for (const plan of over) {
      const next = Math.max(MIN_ZOOM, plan.zoom * (target / plan.used))
      if (next < plan.zoom - 0.001) {
        plan.zoom = next
        changed = true
      }
    }
    if (!changed) break
    applySheet(sheet, background, accent, plans, null)
    for (const plan of plans) {
      const measured = measurePage(root, plan.page)
      if (measured) plan.used = measured.used
    }
  }

  // 只给放映里整页垂直居中的版式（cover/section/closing）撑空白居中；普通页顶部对齐。
  const spacers = new Map<number, number>()
  for (const plan of plans) {
    if (!plan.centered) continue
    const above = Math.max(0, Math.floor((target - plan.used) / 2))
    if (above > 0) spacers.set(plan.page, above)
  }
  applySheet(sheet, background, accent, plans, spacers)

  return { width: PAGE_WIDTH_INCHES, height: PAGE_HEIGHT_INCHES }
}

export function exitPrintLayout(): void {
  restoreViewport()
  if (!sheetStyle) return
  sheetStyle.remove()
  sheetStyle = null
  document.body.classList.remove(PRINT_CLASS)
  const scroll = scroller()
  if (scroll) scroll.scrollTop = restoreScrollTop
}
