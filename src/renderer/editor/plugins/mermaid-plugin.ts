import { $nodeSchema, $view, $inputRule } from '@milkdown/utils'
import { InputRule } from '@milkdown/prose/inputrules'
import type { NodeViewConstructor } from '@milkdown/prose/view'
import type { Plugin } from 'unified'
import type { RendererPlugin } from './index'
import { registerPluginModule } from './index'
import mermaid from 'mermaid'
import './mermaid-plugin.css'
import './mermaid-plugin-dark.css'
import './mermaid-plugin-elegant.css'
import './mermaid-plugin-newsprint.css'
import './mermaid-plugin-custom.css'
// import './themes/components/mermaid/variables.css'

;(window as any).mermaid = mermaid

// Track pending mermaid render promises for export synchronization
const pendingRenders = new Set<Promise<void>>()

/**
 * Wait for all currently pending mermaid render() calls to settle.
 * Called before PDF/HTML export to ensure all diagrams are rendered.
 */
export function awaitAllMermaidRenders(): Promise<void> {
  const promises = Array.from(pendingRenders)
  return Promise.allSettled(promises).then(() => {})
}

function getMermaidTheme(): string {
  const cls = document.body.className
  if (cls.includes('theme-dark')) return 'dark'
  if (cls.includes('theme-newsprint')) return 'neutral'
  if (cls.includes('theme-custom')) {
    const style = getComputedStyle(document.body)
    if (style.getPropertyValue('--mermaid-dark-mode').trim() === 'true') return 'dark'
    return 'base'
  }
  return 'default'
}

function getCustomMermaidCSS(): CSSStyleDeclaration {
  return getComputedStyle(document.body)
}

function readCustomVar(style: CSSStyleDeclaration, name: string, fallback: string): string {
  return style.getPropertyValue(name).trim() || fallback
}

function getCustomMermaidFontSize(): number {
  const raw = getCustomMermaidCSS().getPropertyValue('--mermaid-font-size').trim()
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 12
}

function getCustomMermaidThemeVariables(): Record<string, string> {
  const style = getCustomMermaidCSS()
  const v = (name: string, fallback: string) => readCustomVar(style, name, fallback)
  const baseFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif'
  const font = v('--mermaid-font-family', baseFont)
  const darkMode = v('--mermaid-dark-mode', 'false')
  const result: Record<string, string> = {
    darkMode,
    background: v('--mermaid-background', v('--bg-color', '#ffffff')),
    primaryColor: v('--mermaid-primary-color', v('--code-block-bg', '#f6f8fa')),
    primaryBorderColor: v('--mermaid-node-stroke', v('--border-color', '#d0d7de')),
    primaryTextColor: v('--mermaid-primary-text-color', v('--text-color', '#24292f')),
    secondaryColor: v('--mermaid-secondary-color', v('--code-bg', '#f6f8fa')),
    secondaryBorderColor: v('--mermaid-secondary-border-color', v('--border-color', '#d0d7de')),
    secondaryTextColor: v('--mermaid-primary-text-color', v('--text-color', '#24292f')),
    tertiaryColor: v('--mermaid-tertiary-color', v('--bg-color', '#ffffff')),
    tertiaryBorderColor: v('--mermaid-tertiary-border-color', v('--border-color', '#d0d7de')),
    tertiaryTextColor: v('--mermaid-tertiary-text-color', v('--text-color', '#24292f')),
    lineColor: v('--mermaid-edge-stroke', v('--border-color', '#d0d7de')),
    textColor: v('--mermaid-label-text', v('--text-color', '#24292f')),
    mainBkg: v('--mermaid-main-bkg', v('--code-block-bg', '#f6f8fa')),
    secondBkg: v('--mermaid-second-bkg', v('--code-bg', '#f6f8fa')),
    mainContrastColor: v('--mermaid-primary-text-color', v('--text-color', '#24292f')),
    labelBackground: v('--mermaid-label-background', v('--code-block-bg', '#f6f8fa')),
    labelTextColor: v('--mermaid-label-text-color', v('--text-color', '#24292f')),
    nodeBorder: v('--mermaid-node-stroke', v('--border-color', '#d0d7de')),
    nodeBkg: v('--mermaid-node-bkg', v('--code-block-bg', '#f6f8fa')),
    clusterBkg: v('--mermaid-cluster-bkg', v('--code-bg', '#f6f8fa')),
    clusterBorder: v('--mermaid-cluster-stroke', v('--border-color', '#d0d7de')),
    defaultLinkColor: v('--mermaid-edge-stroke', v('--border-color', '#d0d7de')),
    edgeLabelBackground: v('--mermaid-edge-label-background', v('--code-block-bg', '#f6f8fa')),
    arrowheadColor: v('--mermaid-edge-stroke', v('--border-color', '#d0d7de')),
    personBorder: v('--mermaid-person-stroke', v('--border-color', '#d0d7de')),
    personBkg: v('--mermaid-person-bkg', v('--code-block-bg', '#f6f8fa')),
    fontFamily: font,
    cScale0: v('--mermaid-cscale0', '#2d5f8a'),
    cScale1: v('--mermaid-cscale1', '#3d7a5a'),
    cScale2: v('--mermaid-cscale2', '#8a6b3c'),
    cScale3: v('--mermaid-cscale3', '#6b4a7a'),
    cScale4: v('--mermaid-cscale4', '#3c7a6b'),
    cScale5: v('--mermaid-cscale5', '#7a4a4a'),
    cScale6: v('--mermaid-cscale6', '#4a6b8a'),
    cScale7: v('--mermaid-cscale7', '#5a7a3c'),
    cScale8: v('--mermaid-cscale8', '#7a3c6b'),
    cScale9: v('--mermaid-cscale9', '#3c8a5a'),
    cScale10: v('--mermaid-cscale10', '#8a5a3c'),
    cScale11: v('--mermaid-cscale11', '#3c5a8a'),
  }
  return result
}

function getCustomMermaidC4Config(): Record<string, string> {
  const style = getCustomMermaidCSS()
  const v = (name: string, fallback: string) => readCustomVar(style, name, fallback)
  const baseFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif'
  const font = v('--mermaid-font-family', baseFont)
  return {
    personFontFamily: font,
    systemFontFamily: font,
    containerFontFamily: font,
    componentFontFamily: font,
    boundaryFontFamily: font,
    messageFontFamily: font,
    person_bg_color: v('--mermaid-c4-person-bg', '#2d5f8a'),
    person_border_color: v('--mermaid-c4-person-stroke', '#4a7aaa'),
    external_person_bg_color: v('--mermaid-c4-ext-person-bg', '#4a5568'),
    external_person_border_color: v('--mermaid-c4-ext-person-stroke', '#6b7a8a'),
    system_bg_color: v('--mermaid-c4-system-bg', '#3d7a5a'),
    system_border_color: v('--mermaid-c4-system-stroke', '#5a9a7a'),
    system_db_bg_color: v('--mermaid-c4-system-bg', '#3d7a5a'),
    system_db_border_color: v('--mermaid-c4-system-stroke', '#5a9a7a'),
    system_queue_bg_color: v('--mermaid-c4-system-bg', '#3d7a5a'),
    system_queue_border_color: v('--mermaid-c4-system-stroke', '#5a9a7a'),
    external_system_bg_color: v('--mermaid-c4-ext-system-bg', '#6b4a7a'),
    external_system_border_color: v('--mermaid-c4-ext-system-stroke', '#8a6a9a'),
    external_system_db_bg_color: v('--mermaid-c4-ext-system-bg', '#6b4a7a'),
    external_system_db_border_color: v('--mermaid-c4-ext-system-stroke', '#8a6a9a'),
    external_system_queue_bg_color: v('--mermaid-c4-ext-system-bg', '#6b4a7a'),
    external_system_queue_border_color: v('--mermaid-c4-ext-system-stroke', '#8a6a9a'),
    container_bg_color: v('--mermaid-c4-container-bg', '#8a6b3c'),
    container_border_color: v('--mermaid-c4-container-stroke', '#aa8a5c'),
    container_db_bg_color: v('--mermaid-c4-container-bg', '#8a6b3c'),
    container_db_border_color: v('--mermaid-c4-container-stroke', '#aa8a5c'),
    container_queue_bg_color: v('--mermaid-c4-container-bg', '#8a6b3c'),
    container_queue_border_color: v('--mermaid-c4-container-stroke', '#aa8a5c'),
    external_container_bg_color: v('--mermaid-c4-ext-container-bg', '#5a5a6a'),
    external_container_border_color: v('--mermaid-c4-ext-container-stroke', '#7a7a8a'),
    external_container_db_bg_color: v('--mermaid-c4-ext-container-bg', '#5a5a6a'),
    external_container_db_border_color: v('--mermaid-c4-ext-container-stroke', '#7a7a8a'),
    external_container_queue_bg_color: v('--mermaid-c4-ext-container-bg', '#5a5a6a'),
    external_container_queue_border_color: v('--mermaid-c4-ext-container-stroke', '#7a7a8a'),
    component_bg_color: v('--mermaid-c4-component-bg', '#3c7a6b'),
    component_border_color: v('--mermaid-c4-component-stroke', '#5c9a8b'),
    component_db_bg_color: v('--mermaid-c4-component-bg', '#3c7a6b'),
    component_db_border_color: v('--mermaid-c4-component-stroke', '#5c9a8b'),
    component_queue_bg_color: v('--mermaid-c4-component-bg', '#3c7a6b'),
    component_queue_border_color: v('--mermaid-c4-component-stroke', '#5c9a8b'),
    external_component_bg_color: v('--mermaid-c4-ext-component-bg', '#6a6a6a'),
    external_component_border_color: v('--mermaid-c4-ext-component-stroke', '#8a8a8a'),
    external_component_db_bg_color: v('--mermaid-c4-ext-component-bg', '#6a6a6a'),
    external_component_db_border_color: v('--mermaid-c4-ext-component-stroke', '#8a8a8a'),
    external_component_queue_bg_color: v('--mermaid-c4-ext-component-bg', '#6a6a6a'),
    external_component_queue_border_color: v('--mermaid-c4-ext-component-stroke', '#8a8a8a'),
  }
}

function getMermaidThemeVariables(): Record<string, string> {
  const cls = document.body.className
  if (cls.includes('theme-dark')) {
    return {
      darkMode: 'true',
      background: '#0d1117',
      primaryColor: '#1c2128',
      primaryBorderColor: '#8b949e',
      primaryTextColor: '#e6edf3',
      secondaryColor: '#21262d',
      secondaryBorderColor: '#8b949e',
      secondaryTextColor: '#e6edf3',
      tertiaryColor: '#1c2128',
      tertiaryBorderColor: '#8b949e',
      tertiaryTextColor: '#e6edf3',
      lineColor: '#8b949e',
      textColor: '#e6edf3',
      mainBkg: '#1c2128',
      secondBkg: '#21262d',
      mainContrastColor: '#e6edf3',
      labelBackground: '#161b22',
      labelTextColor: '#e6edf3',
      nodeBorder: '#8b949e',
      nodeBkg: '#1c2128',
      clusterBkg: '#21262d',
      clusterBorder: '#8b949e',
      defaultLinkColor: '#8b949e',
      edgeLabelBackground: '#161b22',
      arrowheadColor: '#8b949e',
      personBorder: '#8b949e',
      personBkg: '#1c2128',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
      cScale0: '#2d5f8a',
      cScale1: '#3d7a5a',
      cScale2: '#8a6b3c',
      cScale3: '#6b4a7a',
      cScale4: '#3c7a6b',
      cScale5: '#7a4a4a',
      cScale6: '#4a6b8a',
      cScale7: '#5a7a3c',
      cScale8: '#7a3c6b',
      cScale9: '#3c8a5a',
      cScale10: '#8a5a3c',
      cScale11: '#3c5a8a',
    }
  }
  if (cls.includes('theme-elegant')) {
    return {
      darkMode: 'false',
      background: '#e8e2db',
      primaryColor: '#ddd5cb',
      primaryBorderColor: '#b0a89f',
      primaryTextColor: '#3d3530',
      secondaryColor: '#e0d8cf',
      secondaryBorderColor: '#c4bbb0',
      secondaryTextColor: '#3d3530',
      tertiaryColor: '#e8e2db',
      tertiaryBorderColor: '#d0c8ba',
      tertiaryTextColor: '#3d3530',
      lineColor: '#b0a89f',
      textColor: '#3d3530',
      mainBkg: '#ddd5cb',
      secondBkg: '#e0d8cf',
      mainContrastColor: '#3d3530',
      labelBackground: '#e8e2db',
      labelTextColor: '#3d3530',
      nodeBorder: '#b0a89f',
      nodeBkg: '#ddd5cb',
      clusterBkg: '#e0d8cf',
      clusterBorder: '#b0a89f',
      defaultLinkColor: '#b0a89f',
      edgeLabelBackground: '#e8e2db',
      arrowheadColor: '#b0a89f',
      personBorder: '#b0a89f',
      personBkg: '#ddd5cb',
      fontFamily: '"LXGW WenKai", "Noto Serif SC", "Source Han Serif SC", "Songti SC", Georgia, serif',
      cScale0: '#e8a898',
      cScale1: '#c4b8a8',
      cScale2: '#a8c4b8',
      cScale3: '#c8b098',
      cScale4: '#b8a8c4',
      cScale5: '#98c4b0',
      cScale6: '#d4a888',
      cScale7: '#a8b8c8',
      cScale8: '#c4a898',
      cScale9: '#98b8a8',
      cScale10: '#b8c4a8',
      cScale11: '#a898b8',
    }
  }
  if (cls.includes('theme-newsprint')) {
    return {
      fontFamily: '"PT Serif", Georgia, serif',
      cScale0: '#2c5f8a',
      cScale1: '#5a7a4a',
      cScale2: '#8a6b3c',
      cScale3: '#6b4a7a',
      cScale4: '#3c7a6b',
      cScale5: '#7a3c3c',
      cScale6: '#4a6b8a',
      cScale7: '#6b7a3c',
      cScale8: '#5a3c7a',
      cScale9: '#3c8a5a',
      cScale10: '#8a5a3c',
      cScale11: '#3c5a8a',
    }
  }
  if (cls.includes('theme-custom')) {
    return getCustomMermaidThemeVariables()
  }
  return {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
  }
}

function getMermaidC4Config(): Record<string, string> {
  const cls = document.body.className
  if (cls.includes('theme-custom')) {
    return getCustomMermaidC4Config()
  }
  const font = cls.includes('theme-elegant')
    ? '"LXGW WenKai", "Noto Serif SC", Georgia, serif'
    : cls.includes('theme-newsprint')
      ? '"PT Serif", Georgia, serif'
      : '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif'
  if (cls.includes('theme-dark')) {
    return {
      personFontFamily: font,
      systemFontFamily: font,
      containerFontFamily: font,
      componentFontFamily: font,
      boundaryFontFamily: font,
      messageFontFamily: font,
      person_bg_color: '#2d5f8a',
      person_border_color: '#4a7aaa',
      external_person_bg_color: '#4a5568',
      external_person_border_color: '#6b7a8a',
      system_bg_color: '#3d7a5a',
      system_border_color: '#5a9a7a',
      system_db_bg_color: '#3d7a5a',
      system_db_border_color: '#5a9a7a',
      system_queue_bg_color: '#3d7a5a',
      system_queue_border_color: '#5a9a7a',
      external_system_bg_color: '#6b4a7a',
      external_system_border_color: '#8a6a9a',
      external_system_db_bg_color: '#6b4a7a',
      external_system_db_border_color: '#8a6a9a',
      external_system_queue_bg_color: '#6b4a7a',
      external_system_queue_border_color: '#8a6a9a',
      container_bg_color: '#8a6b3c',
      container_border_color: '#aa8a5c',
      container_db_bg_color: '#8a6b3c',
      container_db_border_color: '#aa8a5c',
      container_queue_bg_color: '#8a6b3c',
      container_queue_border_color: '#aa8a5c',
      external_container_bg_color: '#5a5a6a',
      external_container_border_color: '#7a7a8a',
      external_container_db_bg_color: '#5a5a6a',
      external_container_db_border_color: '#7a7a8a',
      external_container_queue_bg_color: '#5a5a6a',
      external_container_queue_border_color: '#7a7a8a',
      component_bg_color: '#3c7a6b',
      component_border_color: '#5c9a8b',
      component_db_bg_color: '#3c7a6b',
      component_db_border_color: '#5c9a8b',
      component_queue_bg_color: '#3c7a6b',
      component_queue_border_color: '#5c9a8b',
      external_component_bg_color: '#6a6a6a',
      external_component_border_color: '#8a8a8a',
      external_component_db_bg_color: '#6a6a6a',
      external_component_db_border_color: '#8a8a8a',
      external_component_queue_bg_color: '#6a6a6a',
      external_component_queue_border_color: '#8a8a8a',
    }
  }
  if (cls.includes('theme-elegant')) {
    return {
      personFontFamily: font,
      systemFontFamily: font,
      containerFontFamily: font,
      componentFontFamily: font,
      boundaryFontFamily: font,
      messageFontFamily: font,
      person_bg_color: '#c44b2b',
      person_border_color: '#a03a1e',
      external_person_bg_color: '#8b7b6a',
      external_person_border_color: '#7a6a5a',
      system_bg_color: '#5a7a6b',
      system_border_color: '#4a6a5b',
      system_db_bg_color: '#5a7a6b',
      system_db_border_color: '#4a6a5b',
      system_queue_bg_color: '#5a7a6b',
      system_queue_border_color: '#4a6a5b',
      external_system_bg_color: '#8b6b4a',
      external_system_border_color: '#7a5a3a',
      external_system_db_bg_color: '#8b6b4a',
      external_system_db_border_color: '#7a5a3a',
      external_system_queue_bg_color: '#8b6b4a',
      external_system_queue_border_color: '#7a5a3a',
      container_bg_color: '#6b5a7a',
      container_border_color: '#5a4a6a',
      container_db_bg_color: '#6b5a7a',
      container_db_border_color: '#5a4a6a',
      container_queue_bg_color: '#6b5a7a',
      container_queue_border_color: '#5a4a6a',
      external_container_bg_color: '#a09080',
      external_container_border_color: '#8a7a6a',
      external_container_db_bg_color: '#a09080',
      external_container_db_border_color: '#8a7a6a',
      external_container_queue_bg_color: '#a09080',
      external_container_queue_border_color: '#8a7a6a',
      component_bg_color: '#4a7a6b',
      component_border_color: '#3a6a5b',
      component_db_bg_color: '#4a7a6b',
      component_db_border_color: '#3a6a5b',
      component_queue_bg_color: '#4a7a6b',
      component_queue_border_color: '#3a6a5b',
      external_component_bg_color: '#9a8a7a',
      external_component_border_color: '#8a7a6a',
      external_component_db_bg_color: '#9a8a7a',
      external_component_db_border_color: '#8a7a6a',
      external_component_queue_bg_color: '#9a8a7a',
      external_component_queue_border_color: '#8a7a6a',
    }
  }
  return {
    personFontFamily: font,
    systemFontFamily: font,
    containerFontFamily: font,
    componentFontFamily: font,
    boundaryFontFamily: font,
    messageFontFamily: font,
  }
}

let renderCounter = 0

function adjustNodeHeights(svg: SVGSVGElement): void {
  const isCustom = document.body.className.includes('theme-custom')
  const PAD = isCustom ? 8 : 6
  svg.querySelectorAll('.node > rect').forEach((el) => {
    const h = parseFloat(el.getAttribute('height') || '0')
    if (h > 0) el.setAttribute('height', String(h + PAD))
  })
  svg.querySelectorAll('.label > foreignObject').forEach((el) => {
    const h = parseFloat(el.getAttribute('height') || '0')
    if (h > 0) el.setAttribute('height', String(h + PAD))
  })
  svg.querySelectorAll('.node > .label').forEach((el) => {
    const t = el.getAttribute('transform') || ''
    const m = t.match(/translate\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/)
    if (m) el.setAttribute('transform', `translate(${m[1]}, ${parseFloat(m[2]) - PAD / 2})`)
  })
}

const remarkMermaid: Plugin = function () {
  return (tree: any) => {
    const walk = (node: any) => {
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i]
          if (child.type === 'code' && child.lang === 'mermaid') {
            node.children[i] = {
              type: 'mermaidCode',
              value: child.value,
              position: child.position,
            }
          } else {
            walk(child)
          }
        }
      }
    }
    walk(tree)
  }
}

const mermaidBlockSchema = $nodeSchema('mermaid_block', () => ({
  group: 'block',
  atom: true,
  priority: 60,
  attrs: {
    text: { default: '', validate: 'string' },
    mode: { default: 'rendered' as 'rendered' | 'raw' },
  },
  parseDOM: [
    { tag: 'div.mermaid-block', getAttrs: (dom) => ({ text: (dom as HTMLElement).dataset.mermaid || '' }) },
    { tag: 'pre.mermaid-raw', getAttrs: (dom) => ({ text: (dom as HTMLElement).dataset.mermaid || '', mode: 'raw' }) },
  ],
  toDOM: (node) => {
    const container = document.createElement('div')
    container.className = 'mermaid-block'
    const text = (node.attrs.text as string || '').trim()
    container.dataset.mermaid = text

    if (node.attrs.mode === 'raw') {
      const el = document.createElement('pre')
      el.className = 'mermaid-raw'
      el.dataset.mermaid = text
      el.textContent = '```mermaid\n' + text + '\n```'
      return { dom: el }
    }

    container.innerHTML = '<div class="mermaid-preview"><div class="mermaid-loading">Rendering...</div></div>'
    return { dom: container }
  },
  parseMarkdown: {
    match: (node) => node.type === 'mermaidCode',
    runner: (state, node, type) => {
      state.addNode(type, { text: (node.value as string) || '' })
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'mermaid_block',
    runner: (state, node) => {
      state.addNode('code', undefined, node.attrs.text as string, { lang: 'mermaid' })
    },
  },
}))

const mermaidBlockInputRule = $inputRule((ctx) => {
  return new InputRule(/^```mermaid[\s\n]$/, (state, _match, start, end) => {
    const { tr } = state
    tr.replaceWith(start, end, mermaidBlockSchema.type(ctx).create({ text: '' }))
    return tr
  })
})

function renderMermaidBlock(dom: HTMLElement, node: any, renderIdRef: { current: number }): void {
  const text = (node.attrs.text as string || '').trim()
  dom.dataset.mermaid = text
  const currentRenderId = ++renderIdRef.current

  dom.innerHTML = ''

  if (node.attrs.mode === 'raw') {
    const textarea = document.createElement('textarea')
    textarea.className = 'mermaid-source'
    textarea.dataset.mermaid = text
    textarea.value = '```mermaid\n' + text + '\n```'
    textarea.rows = Math.min(16, (text.match(/\n/g) || []).length + 3)
    dom.appendChild(textarea)
    return
  }

  if (!text) {
    dom.innerHTML = '<div class="mermaid-preview"><div class="mermaid-loading">Empty diagram</div></div>'
    return
  }

  const mermaidLib = (window as any).mermaid
  if (!mermaidLib || typeof mermaidLib.render !== 'function') {
    dom.innerHTML = '<div class="mermaid-preview"><div class="mermaid-error">Mermaid not loaded</div></div>'
    return
  }

  dom.innerHTML = '<div class="mermaid-preview"><div class="mermaid-loading">Rendering...</div></div>'
  const id = 'mermaid-' + (++renderCounter)

  const renderPromise = mermaidLib.render(id, text).then((result: { svg: string; bindFunctions?: (el: Element) => void }) => {
    if (currentRenderId !== renderIdRef.current) return
    const preview = dom.querySelector('.mermaid-preview')
    if (preview) {
      preview.innerHTML = result.svg
      const svg = preview.querySelector('svg') as SVGSVGElement | null
      if (svg) adjustNodeHeights(svg)
      if (result.bindFunctions) result.bindFunctions(dom)
    }
  }).catch((e: Error) => {
    if (currentRenderId !== renderIdRef.current) return
    const preview = dom.querySelector('.mermaid-preview')
    if (preview) {
      const msg = e.message.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      preview.innerHTML = '<div class="mermaid-error">Error: ' + msg + '</div>'
    }
  }).finally(() => { pendingRenders.delete(renderPromise) })
  pendingRenders.add(renderPromise)
}

const mermaidBlockView = $view(mermaidBlockSchema, (_ctx): NodeViewConstructor => {
  return (node, view, getPos) => {
    const container = document.createElement('div')
    container.className = 'mermaid-block'
    const renderIdRef = { current: 0 }
    renderMermaidBlock(container, node, renderIdRef)

    container.addEventListener('focusout', (e) => {
      const target = e.target as HTMLElement
      if (!target.classList.contains('mermaid-source')) return
      const rawValue = (target as HTMLTextAreaElement).value
      const newText = rawValue.replace(/^```mermaid\s*\n?/, '').replace(/\n?\s*```$/, '').trim()
      const pos = getPos()
      if (pos != null && node.attrs.text !== newText) {
        view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, text: newText }))
      }
    })

    return {
      dom: container,
      update: (updatedNode) => {
        if (updatedNode.type !== node.type) return false
        if (updatedNode.sameMarkup(node)) return true
        node = updatedNode
        renderMermaidBlock(container, node, renderIdRef)
        return true
      },
      stopEvent: (e) => {
        return (e.target as HTMLElement).matches('input, textarea')
      },
      ignoreMutation: () => true,
      destroy: () => { container.remove() },
    }
  }
})

function svgToPngDataUrl(svgEl: SVGSVGElement, scale = 2): Promise<string> {
  const clone = svgEl.cloneNode(true) as SVGSVGElement
  const vb = clone.getAttribute('viewBox')
  let svgW = clone.getAttribute('width')
  let svgH = clone.getAttribute('height')
  if ((!svgW || !svgH) && vb) {
    const parts = vb.split(/[\s,]+/)
    if (parts.length === 4) {
      if (!svgW) svgW = parts[2]
      if (!svgH) svgH = parts[3]
    }
  }
  if (svgW) clone.setAttribute('width', svgW)
  if (svgH) clone.setAttribute('height', svgH)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const svgData = new XMLSerializer().serializeToString(clone)
  const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const w = img.naturalWidth || img.width || parseFloat(svgW || '0')
      const h = img.naturalHeight || img.height || parseFloat(svgH || '0')
      if (!w || !h) { reject(new Error('SVG image has zero dimensions')); return }
      const canvas = document.createElement('canvas')
      canvas.width = w * scale
      canvas.height = h * scale
      const ctx = canvas.getContext('2d')!
      ctx.scale(scale, scale)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => { reject(new Error('Failed to load SVG as image')) }
    img.src = svgBase64
  })
}

export const mermaidPlugin: RendererPlugin = {
  id: 'mermaid',
  name: 'Mermaid Diagrams',
  enabled: true,
  remarkPlugin: { plugin: remarkMermaid, options: undefined },
  nodeTypes: ['mermaid_block'],
  clipboardStyles: {
    '.mermaid-block': 'display:block;padding:16px;margin:1em 0;border-radius:6px;background:#f6f8fa;border:1px solid #d0d7de;',
    '.mermaid-preview svg': 'max-width:100%;height:auto;',
  },
  exportStyles: `.mermaid-block{display:block;padding:16px;margin:1em 0;border-radius:6px;background:var(--mermaid-background,var(--bg-color));border:1px solid var(--border-color)}
.mermaid-preview{display:flex;justify-content:center;align-items:center}
.mermaid-preview svg{max-width:100%;height:auto}`,
  rawSelectors: ['textarea.mermaid-source'],
  hideSelectors: ['.mermaid-loading', '.mermaid-error'],
  bgCaptureSelectors: ['.mermaid-block'],
  exportCapabilities: [
    {
      label: 'Save Diagram as PNG',
      defaultName: 'diagram.png',
      filter: { name: 'PNG Image', extensions: ['png'] },
      execute: async (element: HTMLElement): Promise<string | null> => {
        const svg = element.querySelector('.mermaid-preview svg')
        if (!svg) return null
        return svgToPngDataUrl(svg as SVGSVGElement)
      },
    },
  ],
  onInit: () => {
    const cls = document.body.className
    const isCustom = cls.includes('theme-custom')
    const fontSize = isCustom ? getCustomMermaidFontSize() : 14
    mermaid.initialize({
      startOnLoad: false,
      theme: getMermaidTheme() as any,
      themeVariables: getMermaidThemeVariables(),
      c4: getMermaidC4Config(),
      securityLevel: 'loose',
      logLevel: 'error',
      suppressErrorRendering: true,
      fontSize,
    })
  },
  onThemeChange: () => {
    const cls = document.body.className
    const isCustom = cls.includes('theme-custom')
    const fontSize = isCustom ? getCustomMermaidFontSize() : 16
    mermaid.initialize({
      startOnLoad: false,
      theme: getMermaidTheme() as any,
      themeVariables: getMermaidThemeVariables(),
      c4: getMermaidC4Config(),
      securityLevel: 'loose',
      logLevel: 'error',
      suppressErrorRendering: true,
      fontSize,
    })
  },
  ensureRendered: awaitAllMermaidRenders,
}

registerPluginModule({
  info: mermaidPlugin,
  milkdownPlugins: [mermaidBlockSchema, mermaidBlockInputRule, mermaidBlockView],
})

export { mermaidBlockSchema, mermaidBlockInputRule, mermaidBlockView, remarkMermaid }
