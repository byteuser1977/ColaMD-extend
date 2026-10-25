// Word 导出用的样式令牌。
//
// Word 没有 CSS：颜色、字体、字号必须在生成 docx 时写成 Word 样式。这里把当前
// 主题实际算出来的值读出来交给主进程。深色主题不直接搬过去——Word 是白纸，
// 浅色字会看不见，所以沿用浅色主题的调色板；这与 Mermaid 导出挑浅色配色是
// 同一条规则（见 editor/mermaid-export.ts）。

/** 主题色板。字段与 preload 的 DocxStyle 对齐，调用处的类型检查会兜底。 */
interface Palette {
  text: string
  secondaryText: string
  link: string
  inlineCodeBackground: string
  codeBlockBackground: string
  codeBlockText: string
  highlightBackground: string
  blockquoteBorder: string
  blockquoteBackground: string | null
  border: string
  tableHeaderBackground: string
}

/** 与 themes/light.css 一致。颜色一律不带 `#`，方便直接写进 docx。 */
const LIGHT: Palette = {
  text: '24292F',
  secondaryText: '656D76',
  link: '0969DA',
  inlineCodeBackground: 'EFF1F3',
  codeBlockBackground: 'F6F8FA',
  codeBlockText: '24292F',
  highlightBackground: 'FFF3BF',
  blockquoteBorder: 'D0D7DE',
  blockquoteBackground: null,
  border: 'D0D7DE',
  tableHeaderBackground: 'F6F8FA',
}

/** 把一个 CSS 颜色按浏览器的方式合成到白纸上，返回不带 `#` 的十六进制。 */
function painted(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'transparent') return null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const context = canvas.getContext('2d')
    if (!context) return null
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, 1, 1)
    // 无效值会被浏览器忽略，fillStyle 保持上一次赋值；用一个哨兵值区分。
    context.fillStyle = '#010203'
    context.fillStyle = trimmed
    if (context.fillStyle === '#010203' && trimmed.toLowerCase() !== '#010203') return null
    context.fillRect(0, 0, 1, 1)
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data
    return [r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('').toUpperCase()
  } catch {
    return null
  }
}

function color(value: string, fallback: string): string {
  return painted(value) ?? fallback
}

function optionalColor(value: string): string | null {
  return painted(value)
}

function luminance(value: string): number {
  const hex = color(value, 'FFFFFF')
  const [r, g, b] = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16))
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

/**
 * 编辑器正文实际使用的字体栈。
 *
 * 主题可以直接在 `#editor .cm-content` 上写字体（雅致就是这样），所以不能只看
 * `--font-body`。用一根不可见的探针取 computed 值；源码模式下 `.cm-content`
 * 会被等宽字体规则接管，读之前临时摘掉 body 上的 `source-mode`（同一帧内还原，
 * 不会真的画出来）。
 */
function editorFontStack(): string {
  const editor = document.getElementById('editor')
  if (!editor) return getComputedStyle(document.body).fontFamily

  const probe = document.createElement('div')
  probe.className = 'cm-content'
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none'

  const body = document.body
  const sourceMode = body.classList.contains('source-mode')
  if (sourceMode) body.classList.remove('source-mode')
  editor.appendChild(probe)
  const stack = getComputedStyle(probe).fontFamily
  probe.remove()
  if (sourceMode) body.classList.add('source-mode')
  return stack
}

/** 读出当前主题的 Word 样式。深色主题回落到浅色板，避免白纸上的浅色字。 */
export function readDocxStyle(): Palette & {
  bodyFontStack: string
  monoFontStack: string
  bodySize: number
  lineHeight: number
} {
  const computed = getComputedStyle(document.body)
  const token = (name: string): string => computed.getPropertyValue(name).trim()

  const palette = luminance(token('--bg-color')) < 0.5
    ? LIGHT
    : {
        text: color(token('--text-color'), LIGHT.text),
        secondaryText: color(token('--text-secondary') || token('--text-muted'), LIGHT.secondaryText),
        link: color(token('--link-color'), LIGHT.link),
        inlineCodeBackground: color(token('--code-bg'), LIGHT.inlineCodeBackground),
        codeBlockBackground: color(token('--code-block-bg'), LIGHT.codeBlockBackground),
        codeBlockText: color(token('--code-block-text') || token('--text-color'), LIGHT.codeBlockText),
        highlightBackground: color(token('--highlight-bg'), LIGHT.highlightBackground),
        blockquoteBorder: color(token('--blockquote-border'), LIGHT.blockquoteBorder),
        blockquoteBackground: optionalColor(token('--blockquote-bg')),
        border: color(token('--border-color'), LIGHT.border),
        tableHeaderBackground: color(token('--table-header-bg'), LIGHT.tableHeaderBackground),
      }

  return {
    ...palette,
    bodyFontStack: editorFontStack(),
    monoFontStack: token('--font-mono') || 'Menlo, Consolas, monospace',
    // 与导出 HTML 的 `.colamd-document` 一致：正文 16px、行高 1.75。
    bodySize: 16,
    lineHeight: 1.75,
  }
}
