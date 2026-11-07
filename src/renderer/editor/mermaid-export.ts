// Mermaid diagrams for the Word export.
//
// Word is a white page, so every diagram that goes into a .docx is rendered
// again with a palette inlined into the SVG. The palette follows the current
// theme's light values (浅色跟随主题、深色回落浅色，见 diagramPrintPalette),
// 与正文颜色的规则同一条。The
// SVG on screen is deliberately not reused: it may belong to a dark theme, and
// in source mode (or on a block whose source is open for editing) there is no
// SVG on screen at all, yet the export can still draw one.
//
// The Word pipeline is Markdown based (src/main/docx-export.ts parses the text
// and only understands images that point at a real file), so each diagram is
// burned into a PNG here and the fence is rewritten into an image reference that
// names it in `images`. A diagram that cannot be drawn keeps its code fence: an
// export never fails because one diagram did.

import { renderMermaid } from './mermaid-bridge'

const MERMAID_FENCE = /^([ \t]*)```[ \t]*mermaid[ \t]*\r?\n([\s\S]*?)^\1```[ \t]*$/gm

export interface WordExportPayload {
  content: string
  images: Record<string, string>
}

/** 推导调色板需要的三个令牌，readDocxStyle() 的返回值天然满足。 */
interface PaletteSource {
  codeBlockBackground: string
  codeBlockText: string
  link: string
}

/** sRGB 按权重混合，等价于 `color-mix(in srgb, a w%, b)`。入参出参都不带 `#`。 */
function mixSrgb(a: string, b: string, weightA: number): string {
  const parse = (hex: string) => [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) || 0)
  const [ra, ga, ba] = parse(a)
  const [rb, gb, bb] = parse(b)
  const mix = (x: number, y: number) => Math.max(0, Math.min(255, Math.round(x * weightA + y * (1 - weightA))))
  return [mix(ra, rb), mix(ga, gb), mix(ba, bb)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

/**
 * 从 readDocxStyle() 的令牌推出 Word 导出用的 Pele 调色板。
 *
 * 令牌是「浅色跟随主题、深色整体回落浅色」算出来的，所以深色主题自然落到浅色板，
 * 不需要这里的逻辑再做一次明暗判断。混合公式照抄 themes/editor-preview.css 的
 * `.cm-md-mermaid`（18% / 28% / 45% 三档），两边要一起改。
 */
export function diagramPrintPalette(style: PaletteSource): Record<string, string> {
  const bg = style.codeBlockBackground
  const fg = style.codeBlockText
  return {
    '--pele-bg': `#${bg}`,
    '--pele-fg': `#${fg}`,
    '--pele-muted': `#${mixSrgb(fg, bg, 0.7)}`,
    '--pele-line': `#${fg}`,
    '--pele-surface': `#${mixSrgb(fg, bg, 0.18)}`,
    '--pele-surface-alt': `#${mixSrgb(fg, bg, 0.28)}`,
    '--pele-border': `#${mixSrgb(fg, bg, 0.45)}`,
    '--pele-accent': `#${style.link}`,
  }
}

// Mermaid gives the SVG a viewBox and often a `width="100%"` style, which an
// <img> cannot size from. Pin the natural size on a copy before serialising.
async function diagramPNG(code: string, palette: Record<string, string>): Promise<string | null> {
  const svg = await renderMermaid(code, { print: true, palette })
  const root = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement
  if (!root || root.nodeName !== 'svg') return null

  const viewBox = (root.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number)
  const width = viewBox.length === 4 && viewBox.every(Number.isFinite)
    ? viewBox[2]
    : Number.parseFloat(root.getAttribute('width') ?? '')
  const height = viewBox.length === 4 && viewBox.every(Number.isFinite)
    ? viewBox[3]
    : Number.parseFloat(root.getAttribute('height') ?? '')
  if (!(width > 0) || !(height > 0)) return null

  root.setAttribute('width', String(width))
  root.setAttribute('height', String(height))
  root.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const source = new XMLSerializer().serializeToString(root)

  const image = new Image()
  const decoded = new Promise<boolean>((resolve) => {
    image.onload = () => resolve(true)
    image.onerror = () => resolve(false)
  })
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`
  if (!(await decoded)) return null

  // Twice the natural size: the docx scales the image down to fit the page, and
  // the extra pixels are what keep the labels sharp in print.
  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d')
  if (!context) return null
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

export async function markdownForWord(
  markdown: string,
  chinese: boolean,
  palette: Record<string, string> = diagramPrintPalette({
    // 与 docx-style.ts 的 LIGHT 常量同源：没有样式令牌时（脚本/兜底场景）按浅色画。
    codeBlockBackground: 'F6F8FA',
    codeBlockText: '24292F',
    link: '0969DA',
  }),
): Promise<WordExportPayload> {
  const fences: Array<{ start: number; end: number; code: string }> = []
  MERMAID_FENCE.lastIndex = 0
  for (let match = MERMAID_FENCE.exec(markdown); match; match = MERMAID_FENCE.exec(markdown)) {
    const indent = match[1] ?? ''
    const body = match[2] ?? ''
    fences.push({
      start: match.index,
      end: match.index + match[0].length,
      code: (indent ? body.replace(new RegExp(`^${indent}`, 'gm'), '') : body).trimEnd(),
    })
  }
  if (fences.length === 0) return { content: markdown, images: {} }

  const images: Record<string, string> = {}
  const pieces: string[] = []
  let cursor = 0
  let index = 0
  for (const fence of fences) {
    index += 1
    const name = `colamd-diagram-${index}.png`
    const png = await diagramPNG(fence.code, palette).catch(() => null)
    pieces.push(markdown.slice(cursor, fence.start))
    if (png) {
      images[name] = png
      pieces.push(`![${chinese ? '示意图' : 'Diagram'}](${name})`)
    } else {
      pieces.push(markdown.slice(fence.start, fence.end))
    }
    cursor = fence.end
  }
  pieces.push(markdown.slice(cursor))
  return { content: pieces.join(''), images }
}
