// Word 导出里的公式：先截成图片，再交给既有的 images 通道。
//
// 与 Mermaid 走同一条思路（editor/mermaid-export.ts）：Word 导出只认 Markdown
// 里的图片引用，所以这里把 `$...$` / `$$...$$` 换成 `![公式](colamd-math-…png)`，
// 图片本体放进 images。公式截图不能在前台用 canvas 直接画——KaTeX 依赖自己的
// 字体与 CSS；这里复用 2.7.7 导出图片的那套「隐藏窗口当相机」（main/math-export.ts）。

import katex from 'katex'
import { markdownLanguage } from '@codemirror/lang-markdown'
import { excludedRanges, scanMath } from './math-scan'

export interface MathExportResult {
  content: string
  images: Record<string, string>
  sizes: Record<string, { width: number; height: number }>
}

const EMPTY: Pick<MathExportResult, 'images' | 'sizes'> = { images: {}, sizes: {} }

const CSS_URL = /url\(\s*(?:'([^']*)'|"([^"]*)"|([^'")]+))\s*\)/g

/** CSS 里的相对字体地址要在临时窗口里也能解析，统一改成绝对地址。 */
function absolutize(css: string, base: string): string {
  return css.replace(CSS_URL, (match, single: string | undefined, double: string | undefined, plain: string | undefined) => {
    const value = (single ?? double ?? plain ?? '').trim()
    if (!value || /^(data:|https?:|file:|#|\/\/)/i.test(value)) return match
    try {
      return `url("${new URL(value, base).href}")`
    } catch {
      return match
    }
  })
}

/** 当前窗口能拿到的全部样式，供公式/HTML 截图窗口加载字体与排版。 */
export function wordExportStyles(): string {
  let text = ''
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const base = sheet.href ?? document.baseURI
      for (const rule of Array.from(sheet.cssRules)) text += absolutize(rule.cssText, base) + '\n'
    } catch {
      // 跨域样式表读不到；导出不因为它失败。
    }
  }
  return text
}

export async function markdownWithMathImages(
  markdown: string,
  chinese: boolean,
  color: string,
): Promise<MathExportResult> {
  const api = window.electronAPI
  if (!api?.renderMathImages) return { content: markdown, ...EMPTY }

  // 用 Markdown 解析器现解析这份文本：HTML 块可能已经被上一层替换掉，
  // 编辑器里的旧语法树对不上新的偏移量。
  const ranges = scanMath(markdown, excludedRanges(markdown, markdownLanguage.parser.parse(markdown)))
  if (ranges.length === 0) return { content: markdown, ...EMPTY }

  // 渲染不了的公式保持原文；一条坏公式不该让整篇文档丢掉公式之外的东西。
  const items = ranges.flatMap((range) => {
    try {
      return [{
        range,
        html: katex.renderToString(range.code, {
          displayMode: range.block,
          throwOnError: true,
          trust: false,
          output: 'html',
        }),
      }]
    } catch {
      return []
    }
  })
  if (items.length === 0) return { content: markdown, ...EMPTY }

  const shots = await api.renderMathImages({
    formulas: items.map((item) => ({ html: item.html, block: item.range.block })),
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
    const name = `colamd-math-${item.range.block ? 'block' : 'inline'}-${index + 1}.png`
    images[name] = shot.dataURL
    sizes[name] = { width: shot.width, height: shot.height }
    replacements.push({ from: item.range.from, to: item.range.to, name })
  })
  if (replacements.length === 0) return { content: markdown, ...EMPTY }

  // 从后往前换，前面的偏移量才不会被打乱。
  let content = markdown
  for (const replacement of replacements.sort((left, right) => right.from - left.from)) {
    content = content.slice(0, replacement.from) + `![${chinese ? '公式' : 'Formula'}](${replacement.name})` + content.slice(replacement.to)
  }
  return { content, images, sizes }
}
