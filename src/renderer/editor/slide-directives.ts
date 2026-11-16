// 幻灯片页面指令：解析层（纯逻辑，无 DOM）。
//
// 一页里的三件事都写在 HTML 注释里（CommonMark HTMLBlock，渲染时本来就不显示）：
//   <!-- slide: cover
//        kicker: … label: … chapter: … -->   页头块，仅页首生效（该页第一个真实内容之前）
//   <!-- slide-css … -->                      页内 CSS 微调，页内任意位置，可多条
//   <!-- slide-js … -->                       页内脚本，放映时进沙箱执行
// 旧的单行 `<!-- slide: cover -->` 与 `<!-- slide-kicker: … -->` 继续兼容。
//
// 为什么不并入 live-preview 的 collectPages：分页类是上游装饰，本模块独立扫描同一棵
// 语法树、自己打版式类，上游合并时互不相扰（见 .trae/documents/slides-layout-system.md
// 的上游隔离策略）。分页语义必须与 collectPages 保持一字不差：`---` 归它结束的那一页，
// 下一行开新页；frontmatter 区间排除在外；代码块里的 `---` 不是 HorizontalRule，天然
// 不会误判。
//
// 帧率与安全：解析只认语法树里的 HTMLBlock 与 HorizontalRule，增量更新时随装饰一起
// 重算，没有自己的监听。scopeSlideCSS 给页内 CSS 加白名单，逻辑与 html-sanitize 的
// 思路一致但独立成文（那边是行内 style 的名单，这边是块级规则的名单）。

import { syntaxTree } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'
import type { SyntaxNodeRef } from '@lezer/common'
import { frontmatterRange } from './math-scan'

/** 一页收集到的指令。css/js 按出现顺序保留，拼起来就是这一页的完整微调。 */
export type PageDirectives = {
  layout?: string
  css: string[]
  js: string[]
  /** 标题上方的等宽小字。指令优先，没写时取标题前那段文字。 */
  kicker?: string
  /** chrome 左侧短标签，覆盖 deck-title。 */
  label?: string
  /** chrome 右侧章节文案，覆盖 deck-meta。 */
  chapter?: string
}

/**
 * 一页的结构角色，由 Markdown 本身决定：第一个标题是页标题，标题后的第一段是导语，
 * 标题前的那段兜底当 kicker。行号给 slide-layout 挂类用，不参与快照。
 */
export type PageRoles = {
  titleLines: number[]
  leadLines: number[]
  kickerLines: number[]
}

/**
 * 整副牌的公共元素（deck chrome）：logo、品牌名、主标题、副标题/日期。
 * 写法 `<!-- deck-logo: … -->` 等，单行，文档任意处（惯例是顶部），
 * 同名多条取最后一条。放映与导出在每页的固定位置呈现，见 slides.css。
 */
export type DeckChrome = {
  logo?: string
  brand?: string
  title?: string
  meta?: string
}

/** 一次扫描的全部产出：按页码归档的指令，加上打装饰要用的行号信息。 */
export type SlideScan = {
  /** 页码 → 指令。只有写了指令的页才在表里。 */
  directives: Map<number, PageDirectives>
  /** 版式页打类要用的行号表：页码 → 该页所有行号。 */
  linesByPage: Map<number, number[]>
  /** 指令块（含未生效的）的起始行号，打 cm-md-slide-directive 用。 */
  directiveLines: number[]
  /** deck 级公共元素；一条都没写就是空对象，chrome 整条不出现。 */
  deck: DeckChrome
  /** 页角色：标题、导语、结构兜底的 kicker。 */
  roles: Map<number, PageRoles>
}

// 页头块：第一行声明版式，后面的 `kicker: …` 等是页级文案。
// 单行 `<!-- slide: cover -->` 仍然走同一条正则，group 2 为空。
const LAYOUT_RE = /^<!--\s*slide\s*:\s*([a-z][a-z0-9-]*)\b([\s\S]*?)-->$/
// deck 块：`<-- deck` 后面必须是空白，避免和旧的 deck-logo 单行写法撞车。
const DECK_BLOCK_RE = /^<!--\s*deck(?:\s+([\s\S]*?))?-->$/
// 页级字段：kicker / label / chapter，单行一条。
const PAGE_FIELD_RE = /^([a-z][a-z0-9-]*)\s*:\s*(.+)$/
const PAGE_FIELD_KEYS = new Set(['kicker', 'label', 'chapter'])
const DECK_FIELD_KEYS = new Set(['logo', 'brand', 'title', 'meta'])
const CSS_RE = /^<!--\s*slide-css\b\s*([\s\S]*?)-->$/
const JS_RE = /^<!--\s*slide-js\b\s*([\s\S]*?)-->$/
const PAGE_KEY_RE = /^<!--\s*slide-(kicker|label|chapter)\s*:\s*([\s\S]*?)-->$/
const DECK_RE = /^<!--\s*deck-(logo|brand|title|meta)\s*:\s*([\s\S]*?)-->$/

function inRange(range: { from: number; to: number }, at: number): boolean {
  return at >= range.from && at < range.to
}

/** 与 live-preview 的 iterateContent 同构：跳过 frontmatter 区间的遍历。 */
function iterateContent(
  state: EditorState,
  front: { from: number; to: number } | null,
  enter: (node: SyntaxNodeRef) => boolean | void,
): void {
  syntaxTree(state).iterate({
    enter: (node) => {
      if (front && node.name !== 'Document' && inRange(front, node.from)) return false
      return enter(node)
    },
  })
}

/**
 * 每行的页码（index 0 = 第 1 行）。算法与 collectPages 一字不差，两处必须同步改。
 * `---` 行归它结束的那一页，下一行开新页。
 */
function pageOfLines(state: EditorState, front: { from: number; to: number } | null): number[] {
  const breaks: number[] = []
  iterateContent(state, front, (node) => {
    if (node.name !== 'HorizontalRule') return
    breaks.push(state.doc.lineAt(node.from).number)
  })
  const pageOf = new Array<number>(state.doc.lines)
  let page = 0
  let nextBreak = 0
  for (let n = 1; n <= state.doc.lines; n++) {
    pageOf[n - 1] = page
    if (nextBreak < breaks.length && breaks[nextBreak] === n) {
      page++
      nextBreak++
    }
  }
  return pageOf
}

/** 每页第一个真实内容行；注释块整体（含多行字段）都不算内容。 */
function firstContentLines(
  state: EditorState,
  pageOf: number[],
  commentLines: Set<number>,
): Map<number, number> {
  const first = new Map<number, number>()
  for (let n = 1; n <= state.doc.lines; n++) {
    const page = pageOf[n - 1]
    if (first.has(page)) continue
    // 分隔线自己不算内容：`---` 归前页，但下一页的「第一行」不该是它。
    if (state.doc.line(n).text.trim() === '') continue
    if (/^ {0,3}(?:---|\*\*\*|___)\s*$/.test(state.doc.line(n).text)) continue
    // 注释也不算内容：多行 deck/slide 块的字段行同样不算，否则它们会把
    // 同一页稍后的 slide 声明挤成「页中注释」。
    if (commentLines.has(n)) continue
    first.set(page, n)
  }
  return first
}

type CommentBlock = {
  source: string
  from: number
  to: number
  fromLine: number
  toLine: number
  page: number
}

type BlockRange = { from: number; to: number; fromLine: number; toLine: number }

function lineRange(fromLine: number, toLine: number): number[] {
  const lines: number[] = []
  for (let n = fromLine; n <= toLine; n++) lines.push(n)
  return lines
}

/** 列表、引用、表格里的段落不算页标题或导语。 */
function isNestedBlock(node: SyntaxNodeRef): boolean {
  let parent = node.node.parent
  while (parent) {
    if (parent.name === 'ListItem' || parent.name === 'Blockquote' || parent.name === 'Table') return true
    parent = parent.parent
  }
  return false
}

/**
 * 一页的角色由 Markdown 结构决定：
 *   - 第一个 ATX 标题 = 页标题
 *   - 标题后的第一个顶层段落 = 导语
 *   - 标题前紧邻的顶层段落 = 结构兜底的 kicker
 * 段落可能跨多行，整段都挂同一个角色。
 */
function collectRoles(
  state: EditorState,
  front: { from: number; to: number } | null,
  pageOf: number[],
  directives: Map<number, PageDirectives>,
): Map<number, PageRoles> {
  const headings = new Map<number, BlockRange>()
  const paragraphs = new Map<number, BlockRange[]>()

  iterateContent(state, front, (node) => {
    const isHeading = /^ATXHeading[1-6]$/.test(node.name)
    if (!isHeading && node.name !== 'Paragraph') return
    if (isNestedBlock(node)) return
    const fromLine = state.doc.lineAt(node.from).number
    const toLine = state.doc.lineAt(Math.max(node.from, node.to - 1)).number
    const page = pageOf[fromLine - 1]
    const range = { from: node.from, to: node.to, fromLine, toLine }
    if (isHeading) {
      if (!headings.has(page)) headings.set(page, range)
      return
    }
    const list = paragraphs.get(page)
    if (list) list.push(range)
    else paragraphs.set(page, [range])
  })

  const roles = new Map<number, PageRoles>()
  for (const [page, heading] of headings) {
    const paras = paragraphs.get(page) ?? []
    const lead = paras.find((p) => p.from > heading.to)
    const before = paras.filter((p) => p.to < heading.from).pop()
    const role: PageRoles = {
      titleLines: lineRange(heading.fromLine, heading.toLine),
      leadLines: lead ? lineRange(lead.fromLine, lead.toLine) : [],
      kickerLines: [],
    }
    const dirs = directives.get(page)
    if (!dirs?.kicker && before) {
      const text = state.doc.lineAt(before.from).text.trim()
      if (text) {
        ensure(directives, page).kicker = text
        role.kickerLines = lineRange(before.fromLine, before.toLine)
      }
    }
    roles.set(page, role)
  }
  return roles
}

/** 把注释块里的 `key: value` 行收进回调；不认识的键直接跳过。 */
function applyFields(
  source: string,
  keys: Set<string>,
  apply: (key: string, value: string) => void,
): void {
  for (const raw of source.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const hit = PAGE_FIELD_RE.exec(line)
    if (!hit || !keys.has(hit[1])) continue
    const value = hit[2].replace(/-->\s*$/, '').trim()
    if (value) apply(hit[1], value)
  }
}

/** 扫一篇文档的幻灯片指令。纯函数：同样的 state 永远得到同样的结果。 */
export function scanSlideDirectives(state: EditorState): SlideScan {
  const text = state.doc.toString()
  const front = frontmatterRange(text)
  const pageOf = pageOfLines(state, front)

  const directives = new Map<number, PageDirectives>()
  const linesByPage = new Map<number, number[]>()
  const directiveLines: number[] = []
  const deck: DeckChrome = {}
  const comments: CommentBlock[] = []
  const commentLines = new Set<number>()

  // 页行表：后面打行装饰要按页归行，这里顺便把每页的行都记下来。
  for (let n = 1; n <= state.doc.lines; n++) {
    const page = pageOf[n - 1]
    const list = linesByPage.get(page)
    if (list) list.push(n)
    else linesByPage.set(page, [n])
  }

  iterateContent(state, front, (node) => {
    // HTML 注释在 @lezer/markdown 里是 CommentBlock，`<div>…</div>` 那类才是
    // HTMLBlock；指令注释只可能是前者，但两个都认，防止方言差异。
    if (node.name !== 'CommentBlock' && node.name !== 'HTMLBlock') return
    const source = state.doc.sliceString(node.from, node.to).trim()
    if (!source.startsWith('<!--')) return
    const fromLine = state.doc.lineAt(node.from).number
    const toLine = state.doc.lineAt(Math.max(node.from, node.to - 1)).number
    comments.push({ source, from: node.from, to: node.to, fromLine, toLine, page: pageOf[fromLine - 1] })
    for (let n = fromLine; n <= toLine; n++) commentLines.add(n)
  })

  const firstContent = firstContentLines(state, pageOf, commentLines)

  for (const comment of comments) {
    const { source, fromLine, toLine, page } = comment
    const layout = LAYOUT_RE.exec(source)
    if (layout) {
      pushAll(directiveLines, fromLine, toLine)
      // 仅页首生效：在本页任何真实内容（非注释、非空行）之前就行，写在页中间
      // 就当普通注释。deck 指令也在页首，与 slide 声明的先后随意。
      const content = firstContent.get(page)
      if (content === undefined || fromLine < content) {
        const dirs = ensure(directives, page)
        dirs.layout = layout[1]
        applyFields(layout[2], PAGE_FIELD_KEYS, (key, value) => {
          dirs[key as 'kicker' | 'label' | 'chapter'] = value
        })
      }
      continue
    }
    const deckBlock = DECK_BLOCK_RE.exec(source)
    if (deckBlock) {
      pushAll(directiveLines, fromLine, toLine)
      applyFields(deckBlock[1] ?? '', DECK_FIELD_KEYS, (key, value) => {
        deck[key as keyof DeckChrome] = value
      })
      continue
    }
    const pageKey = PAGE_KEY_RE.exec(source)
    if (pageKey) {
      pushAll(directiveLines, fromLine, toLine)
      ensure(directives, page)[pageKey[1] as 'kicker' | 'label' | 'chapter'] =
        pageKey[2].replace(/\s+/g, ' ').trim()
      continue
    }
    const deckHit = DECK_RE.exec(source)
    if (deckHit) {
      pushAll(directiveLines, fromLine, toLine)
      // 同名多条取最后一条：deck 指令没有「页」的归属，写哪都一样。
      deck[deckHit[1] as keyof DeckChrome] = deckHit[2].trim()
      continue
    }
    const css = CSS_RE.exec(source)
    if (css) {
      pushAll(directiveLines, fromLine, toLine)
      ensure(directives, page).css.push(css[1].trim())
      continue
    }
    const js = JS_RE.exec(source)
    if (js) {
      pushAll(directiveLines, fromLine, toLine)
      ensure(directives, page).js.push(js[1].trim())
    }
  }

  const roles = collectRoles(state, front, pageOf, directives)
  return { directives, linesByPage, directiveLines, deck, roles }
}

/**
 * 指令块覆盖到的每一行都要记：多行的 slide-css/slide-js 块在渲染视图里是普通
 * 文本行（CommentBlock 不走 widget 替换），放映时靠行类整块藏掉，少记一行就
 * 会有一行指令源码漏到画面上。
 */
function pushAll(lines: number[], fromLine: number, toLine: number): void {
  for (let n = fromLine; n <= toLine; n++) lines.push(n)
}

function ensure(map: Map<number, PageDirectives>, page: number): PageDirectives {
  let dirs = map.get(page)
  if (!dirs) {
    dirs = { css: [], js: [] }
    map.set(page, dirs)
  }
  return dirs
}

// ─── 快照 ────────────────────────────────────────────────────────────────────
//
// 放映层（slideshow/slides-enhance）拿不到 EditorState，它们读这份模块级快照。
// 仿 live-preview 的 documentFileUrl：field 每次重算时 publish，跨 EditorState 也在。

let snapshot: Map<number, PageDirectives> = new Map()
let deckSnapshot: DeckChrome = {}
let pageCountSnapshot = 0
let documentBaseSnapshot: string | null = null

export function publishSlideDirectives(directives: Map<number, PageDirectives>): void {
  snapshot = directives
}

export function getSlideDirectives(): Map<number, PageDirectives> {
  return snapshot
}

/** deck 公共元素与总页数随同一条快照发布（总页数给放映层的页码 `03 / 12` 用）。 */
export function publishDeckChrome(deck: DeckChrome, pageCount: number): void {
  deckSnapshot = deck
  pageCountSnapshot = pageCount
}

export function getDeckChrome(): DeckChrome {
  return deckSnapshot
}

export function getDeckPageCount(): number {
  return pageCountSnapshot
}

/** 当前文档的 URL。deck-logo 写相对路径时，用它解析成能加载的绝对地址。 */
export function publishDocumentBase(url: string | null): void {
  documentBaseSnapshot = url
}

export function getDocumentBase(): string | null {
  return documentBaseSnapshot
}

// ─── 页内 CSS 的作用域化 ─────────────────────────────────────────────────────

/**
 * 属性名白名单。思路与 html-sanitize 的 SAFE_STYLE_PROPERTY 一致，但那是行内 style
 * 的名单，这里是块级规则的名单：布局（grid/flex/columns）、动画（animation/transform）
 * 都是版式的正当需求，而 position:absolute/fixed、z-index 这些能把元素盖到应用界面
 * 上的仍然不放进值里（position 本身放行，值再过滤）。
 */
const SAFE_PROPERTY = new Set([
  'text-align', 'text-decoration', 'text-transform', 'text-indent', 'text-shadow',
  'text-underline-offset', 'text-justify', 'text-orientation', 'text-rendering',
  'color', 'opacity', 'visibility', 'filter', 'backdrop-filter', 'mix-blend-mode', 'isolation',
  'background', 'background-color', 'background-image', 'background-size', 'background-position',
  'background-repeat', 'background-clip', 'background-origin', 'background-blend-mode',
  'font', 'font-size', 'font-family', 'font-weight', 'font-style', 'font-variant', 'font-stretch',
  'line-height', 'letter-spacing', 'word-spacing', 'white-space', 'word-break', 'overflow-wrap',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-width', 'border-style', 'border-color', 'border-radius', 'border-image',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
  'outline', 'outline-width', 'outline-style', 'outline-color', 'outline-offset',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'top', 'right', 'bottom', 'left', 'inset',
  'position', 'display', 'float', 'clear', 'vertical-align', 'overflow', 'clip',
  'flex', 'flex-direction', 'flex-wrap', 'flex-flow', 'flex-grow', 'flex-shrink', 'flex-basis',
  'order', 'align-items', 'align-self', 'align-content', 'justify-content', 'justify-items', 'justify-self',
  'gap', 'row-gap', 'column-gap', 'place-items', 'place-content', 'place-self',
  'grid', 'grid-area', 'grid-template', 'grid-template-columns', 'grid-template-rows', 'grid-template-areas',
  'grid-auto-columns', 'grid-auto-rows', 'grid-auto-flow', 'grid-column', 'grid-row',
  'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end',
  'columns', 'column-count', 'column-width', 'column-gap', 'column-rule', 'column-fill', 'column-span',
  'transform', 'transform-origin', 'transform-style', 'perspective', 'perspective-origin',
  'rotate', 'scale', 'translate',
  'animation', 'animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay',
  'animation-iteration-count', 'animation-direction', 'animation-fill-mode', 'animation-play-state',
  'transition', 'transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay',
  'box-shadow', 'clip-path', 'object-fit', 'object-position',
  'list-style', 'list-style-type', 'list-style-position', 'list-style-image',
  'counter-reset', 'counter-increment', 'content', 'quotes',
  'aspect-ratio', 'box-sizing', 'resize', 'user-select', 'pointer-events', 'touch-action',
  'mask', 'mask-image', 'mask-size', 'mask-position', 'mask-repeat',
])

/** 值里的危险货色：IE 时代的 expression、伪协议地址，一律整条丢。 */
const UNSAFE_VALUE = /expression\s*\(|javascript\s*:|vbscript\s*:|data:text\/html|behavior\s*:/i

/** position 的这两个值能把元素抬到应用界面上，html-sanitize 拒它们，这里同样拒。 */
const UNSAFE_POSITION = /^(?:absolute|fixed)$/i

function safeDeclaration(raw: string): string | null {
  const colon = raw.indexOf(':')
  if (colon <= 0) return null
  const prop = raw.slice(0, colon).trim().toLowerCase()
  const value = raw.slice(colon + 1).trim()
  if (!prop || !value) return null
  if (!SAFE_PROPERTY.has(prop)) return null
  if (UNSAFE_VALUE.test(value)) return null
  if (prop === 'position' && UNSAFE_POSITION.test(value)) return null
  return `${prop}: ${value}`
}

function scopeDeclarations(body: string): string {
  const kept: string[] = []
  for (const raw of body.split(';')) {
    if (!raw.trim()) continue
    const safe = safeDeclaration(raw)
    if (safe) kept.push(safe)
  }
  return kept.join(';\n')
}

/**
 * 把一段页内 CSS 限制到「某一页」里：每个选择器前面加 `guard .cm-md-page-N`，
 * 声明过白名单，解析不动的块整条丢弃。@media/@supports 整体保留在外面再递归，
 * @keyframes 的内部是关键帧不是选择器，原样过白名单即可。
 */
export function scopeSlideCSS(css: string, pageClass: string, guard: string): string {
  const out = scopeBlock(css.trim(), pageClass, guard, 0)
  return out.filter(Boolean).join('\n')
}

function scopeBlock(css: string, pageClass: string, guard: string, depth: number): string[] {
  if (depth > 8) return [] // 恶意嵌套的护栏：CSS 的 at-rule 嵌套不该超过三四层
  const out: string[] = []
  let i = 0
  while (i < css.length) {
    const open = css.indexOf('{', i)
    if (open === -1) break
    const head = css.slice(i, open).trim()
    // 找配平的右括号：@media 里有嵌套块，要数着 `{` 走。
    let level = 1
    let close = open + 1
    while (close < css.length && level > 0) {
      const ch = css[close]
      if (ch === '{') level++
      else if (ch === '}') level--
      close++
    }
    if (level !== 0) return [] // 括号不配平：整段丢弃，宁可没有样式也不能有半截规则
    const body = css.slice(open + 1, close - 1)
    i = close

    if (head.startsWith('@')) {
      const at = head.toLowerCase()
      if (at.startsWith('@media') || at.startsWith('@supports')) {
        const inner = scopeBlock(body, pageClass, guard, depth + 1)
        if (inner.length > 0) out.push(`${head} {\n${inner.join('\n')}\n}`)
      } else if (at.startsWith('@keyframes') || at.startsWith('@counter-style')) {
        // 关键帧里是声明，与页面无关，不能前缀化选择器；白名单照过。
        const kept = scopeKeyframes(body)
        if (kept) out.push(`${head} {\n${kept}\n}`)
      }
      // 其余 at-rule（@import/@font-face/@namespace…）不认识就不带它玩。
      continue
    }

    const selectors = head
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => `${guard} .${pageClass} ${s}`)
    const kept = scopeDeclarations(body)
    if (selectors.length > 0 && kept) {
      out.push(`${selectors.join(', ')} {\n${kept}\n}`)
    }
  }
  return out
}

/** @keyframes 的体内是 `from/left: …` 这种帧头加声明，帧头不动、声明过白名单。 */
function scopeKeyframes(body: string): string | null {
  const out: string[] = []
  let i = 0
  while (i < body.length) {
    const open = body.indexOf('{', i)
    if (open === -1) break
    const head = body.slice(i, open).trim()
    const close = body.indexOf('}', open)
    if (close === -1) return null
    const kept = scopeDeclarations(body.slice(open + 1, close))
    if (head && kept) out.push(`${head} {\n${kept}\n}`)
    i = close + 1
  }
  return out.length > 0 ? out.join('\n') : null
}
