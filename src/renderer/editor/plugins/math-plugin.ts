import { $nodeSchema, $view } from '@milkdown/utils'
import type { NodeViewConstructor } from '@milkdown/prose/view'
import type { RendererPlugin } from './index'
import { registerPluginModule } from './index'
import katex from 'katex'
import remarkMath from 'remark-math'
import 'katex/dist/katex.min.css'

;(window as any).katex = katex

const mathInlineSchema = $nodeSchema('math_inline', () => ({
  group: 'inline',
  inline: true,
  atom: true,
  priority: 60,
  attrs: {
    text: { default: '', validate: 'string' },
    mode: { default: 'rendered' as 'rendered' | 'raw' },
  },
  parseDOM: [
    { tag: 'span.math-inline', getAttrs: (dom) => ({ text: (dom as HTMLElement).dataset.math || '' }) },
  ],
  toDOM: (node) => {
    const span = document.createElement('span')
    span.className = 'math-inline'
    span.dataset.math = node.attrs.text as string
    const text = (node.attrs.text as string) || ''
    if (node.attrs.mode === 'raw') {
      span.innerHTML = '<code class="math-raw" data-math="' + text + '">$' + text + '$</code>'
      return { dom: span }
    }
    const katexLib = (window as any).katex
    if (katexLib && text) {
      try {
        span.innerHTML = katexLib.renderToString(text, { throwOnError: false, displayMode: false })
      } catch {
        span.textContent = '$' + text + '$'
      }
    } else {
      span.textContent = '$' + text + '$'
    }
    return { dom: span }
  },
  parseMarkdown: {
    match: (node) => node.type === 'inlineMath',
    runner: (state, node, type) => {
      state.addNode(type, { text: (node.value as string) || '' })
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'math_inline',
    runner: (state, node) => {
      state.addNode('inlineMath', undefined, node.attrs.text as string)
    },
  },
}))

function renderMathInline(dom: HTMLElement, text: string, mode: string): void {
  dom.dataset.math = text
  dom.innerHTML = ''
  if (mode === 'raw') {
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'math-inline-raw'
    input.value = '$' + text + '$'
    input.dataset.math = text
    dom.appendChild(input)
  } else {
    const katexLib = (window as any).katex
    if (katexLib) {
      try {
        dom.innerHTML = katexLib.renderToString(text, { throwOnError: false, displayMode: false })
      } catch {
        dom.textContent = '$' + text + '$'
      }
    } else {
      dom.textContent = '$' + text + '$'
    }
  }
}

const mathInlineView = $view(mathInlineSchema.node, (_ctx): NodeViewConstructor => {
  return (node, view, getPos) => {
    const span = document.createElement('span')
    span.className = 'math-inline'
    renderMathInline(span, node.attrs.text as string, node.attrs.mode as string)

    span.addEventListener('focusout', (e) => {
      const target = e.target as HTMLElement
      if (!target.classList.contains('math-inline-raw')) return
      const rawValue = (target as HTMLInputElement).value
      const m = rawValue.match(/^\$(.*)\$$/)
      const newText = m ? m[1].trim() : rawValue
      const pos = getPos()
      if (pos != null && node.attrs.text !== newText) {
        view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, text: newText }))
      }
    })

    return {
      dom: span,
      update: (updatedNode) => {
        if (updatedNode.type !== node.type) return false
        if (updatedNode.sameMarkup(node)) return true
        node = updatedNode
        renderMathInline(span, node.attrs.text as string, node.attrs.mode as string)
        return true
      },
      stopEvent: (e) => {
        return (e.target as HTMLElement).matches('input, textarea')
      },
      ignoreMutation: () => true,
      destroy: () => { span.remove() },
    }
  }
})

const mathBlockSchema = $nodeSchema('math_block', () => ({
  group: 'block',
  atom: true,
  priority: 60,
  attrs: {
    text: { default: '', validate: 'string' },
    mode: { default: 'rendered' as 'rendered' | 'raw' },
  },
  parseDOM: [
    { tag: 'div.math-block', getAttrs: (dom) => ({ text: (dom as HTMLElement).dataset.math || '' }) },
  ],
  toDOM: (node) => {
    const div = document.createElement('div')
    div.className = 'math-block'
    div.dataset.math = node.attrs.text as string
    const text = (node.attrs.text as string) || ''
    if (node.attrs.mode === 'raw') {
      div.innerHTML = '<pre class="math-raw" data-math="' + text + '">$$\n' + text + '\n$$</pre>'
      return { dom: div }
    }
    const katexLib = (window as any).katex
    if (katexLib && text) {
      try {
        div.innerHTML = katexLib.renderToString(text, { throwOnError: false, displayMode: true })
      } catch {
        div.textContent = '$$\n' + text + '\n$$'
      }
    } else {
      div.textContent = '$$\n' + text + '\n$$'
    }
    return { dom: div }
  },
  parseMarkdown: {
    match: (node) => node.type === 'math',
    runner: (state, node, type) => {
      state.addNode(type, { text: (node.value as string) || '' })
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'math_block',
    runner: (state, node) => {
      state.addNode('math', undefined, node.attrs.text as string)
    },
  },
}))

function renderMathBlock(dom: HTMLElement, text: string, mode: string): void {
  dom.dataset.math = text
  dom.innerHTML = ''
  if (mode === 'raw') {
    const textarea = document.createElement('textarea')
    textarea.className = 'math-block-raw'
    textarea.dataset.math = text
    textarea.value = '$$\n' + text + '\n$$'
    textarea.rows = Math.min(10, (text.match(/\n/g) || []).length + 2)
    dom.appendChild(textarea)
  } else {
    const katexLib = (window as any).katex
    if (katexLib) {
      try {
        dom.innerHTML = katexLib.renderToString(text, { throwOnError: false, displayMode: true })
      } catch {
        dom.textContent = '$$\n' + text + '\n$$'
      }
    } else {
      dom.textContent = '$$\n' + text + '\n$$'
    }
  }
}

const mathBlockView = $view(mathBlockSchema.node, (_ctx): NodeViewConstructor => {
  return (node, view, getPos) => {
    const div = document.createElement('div')
    div.className = 'math-block'
    renderMathBlock(div, node.attrs.text as string, node.attrs.mode as string)

    div.addEventListener('focusout', (e) => {
      const target = e.target as HTMLElement
      if (!target.classList.contains('math-block-raw')) return
      const rawValue = (target as HTMLTextAreaElement).value
      const newText = rawValue.replace(/^\$\$\s*\n?/, '').replace(/\n?\s*\$\$$/, '').trim()
      const pos = getPos()
      if (pos != null && node.attrs.text !== newText) {
        view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, text: newText }))
      }
    })

    return {
      dom: div,
      update: (updatedNode) => {
        if (updatedNode.type !== node.type) return false
        if (updatedNode.sameMarkup(node)) return true
        node = updatedNode
        renderMathBlock(div, node.attrs.text as string, node.attrs.mode as string)
        return true
      },
      stopEvent: (e) => {
        return (e.target as HTMLElement).matches('input, textarea')
      },
      ignoreMutation: () => true,
      destroy: () => { div.remove() },
    }
  }
})

function getKatexCSS(): string {
  const sheets: string[] = []
  for (const sheet of document.styleSheets) {
    try {
      if (sheet.href && sheet.href.includes('katex')) {
        const rules = []
        for (const rule of sheet.cssRules) {
          rules.push(rule.cssText)
        }
        if (rules.length) sheets.push(rules.join('\n'))
      }
    } catch { /* cross-origin sheets throw */ }
  }
  return sheets.join('\n')
}

function mathHtmlToPngDataUrl(element: HTMLElement, scale = 2): Promise<string> {
  const w = element.offsetWidth + 32
  const h = element.offsetHeight + 32
  const canvas = document.createElement('canvas')
  canvas.width = w * scale
  canvas.height = h * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  const katexCSS = getKatexCSS()
  const xml = new XMLSerializer().serializeToString(element)
  const imgSrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<style>${katexCSS}</style>` +
    `<foreignObject width="100%" height="100%" style="background:#fff;padding:16px">` +
    xml +
    `</foreignObject></svg>`
  )))
  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    img.onload = () => {
      ctx.drawImage(img, 16, 16)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Failed to render equation to image'))
    img.src = imgSrc
  })
}

export const mathPlugin: RendererPlugin = {
  id: 'math',
  name: 'Math Rendering',
  enabled: true,
  remarkPlugin: { plugin: remarkMath, options: undefined },
  nodeTypes: ['math_inline', 'math_block'],
  // TODO: KaTeX CSS 在 SVG foreignObject 中丢失，导致导出 PNG 二次内容/空白
  // 后续需解决样式注入问题后重新启用
  // exportCapabilities: [
  //   {
  //     label: 'Save Equation as PNG',
  //     defaultName: 'equation.png',
  //     filter: { name: 'PNG Image', extensions: ['png'] },
  //     execute: async (element: HTMLElement): Promise<string | null> => {
  //       if (element.classList.contains('math-block')) {
  //         return mathHtmlToPngDataUrl(element)
  //       }
  //       return null
  //     },
  //   },
  // ],
}

registerPluginModule({
  info: mathPlugin,
  milkdownPlugins: [mathInlineSchema.node, mathBlockSchema.node, mathInlineView, mathBlockView],
})

export { mathInlineSchema, mathBlockSchema, mathInlineView, mathBlockView }
