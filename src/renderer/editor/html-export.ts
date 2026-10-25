// Word 导出里的 HTML 块：渲染成图片。
//
// 编辑器把块级 HTML 当做一个 widget 原样画出来（live-preview.ts），Word 没有
// 对应的排版模型。这里沿用公式截图那条路：消毒后的 HTML 放进隐藏窗口，用导出
// 文档的样式（`.colamd-document`）排版，再整块截成 PNG。截图失败时保留源码文本，
// 与公式、Mermaid 的降级规则一致。

import { markdownLanguage } from '@codemirror/lang-markdown'
import { sanitizeHTML } from './html-sanitize'
import { wordExportStyles, type MathExportResult } from './math-export'

/** 与 `document.css` 的阅读列宽一致；截图宽度也按它来。 */
const BLOCK_WIDTH = 600

const EMPTY: Pick<MathExportResult, 'images' | 'sizes'> = { images: {}, sizes: {} }

export async function markdownWithHtmlImages(markdown: string, color: string): Promise<MathExportResult> {
  const api = window.electronAPI
  if (!api?.renderHtmlImages) return { content: markdown, ...EMPTY }

  const ranges: Array<{ from: number; to: number }> = []
  markdownLanguage.parser.parse(markdown).iterate({
    enter: (node) => {
      if (node.name === 'HTMLBlock') ranges.push({ from: node.from, to: node.to })
    },
  })
  if (ranges.length === 0) return { content: markdown, ...EMPTY }

  // 父块已经包含子块时只截一次，避免同一段 HTML 出两张图。
  const unique: Array<{ from: number; to: number }> = []
  for (const range of ranges.sort((left, right) => left.from - right.from)) {
    const previous = unique[unique.length - 1]
    if (previous && range.from < previous.to) continue
    unique.push(range)
  }

  const items = unique.flatMap((range) => {
    const holder = document.createElement('div')
    holder.appendChild(sanitizeHTML(markdown.slice(range.from, range.to)))
    const inner = holder.innerHTML.trim()
    // 整块被消毒规则删掉（例如只有 <script>）时没有可画的内容。
    if (inner === '') return []
    return [{ range, html: `<div class="colamd-document">${inner}</div>` }]
  })
  if (items.length === 0) return { content: markdown, ...EMPTY }

  const shots = await api.renderHtmlImages({
    items: items.map((item) => ({ html: item.html, width: BLOCK_WIDTH })),
    styles: wordExportStyles(),
    color,
    background: '#ffffff',
  })

  const images: Record<string, string> = {}
  const sizes: Record<string, { width: number; height: number }> = {}
  const replacements: Array<{ from: number; to: number; name: string }> = []

  items.forEach((item, index) => {
    const shot = shots[index]
    if (!shot) return
    const name = `colamd-html-${index + 1}.png`
    images[name] = shot.dataURL
    sizes[name] = { width: shot.width, height: shot.height }
    replacements.push({ from: item.range.from, to: item.range.to, name })
  })
  if (replacements.length === 0) return { content: markdown, ...EMPTY }

  let content = markdown
  for (const replacement of replacements.sort((left, right) => right.from - left.from)) {
    content = content.slice(0, replacement.from) + `![HTML](${replacement.name})` + content.slice(replacement.to)
  }
  return { content, images, sizes }
}
