/**
 * ColaMD Renderer Library Entry Point
 *
 * Provides a standalone Milkdown editor for embedding in external applications
 * (e.g., VSCode extension WebViews). No Electron/Capacitor dependencies.
 *
 * Usage:
 *   import { createColaMDEditor } from '@bytechain.cn/colamd/renderer'
 *   const handle = await createColaMDEditor({ rootId: 'editor', editable: false })
 *   handle.setMarkdown('# Hello')
 *   const html = handle.getLiveHTML()
 */

import { createMilkdownEditor } from './editor'
import { Editor } from '@milkdown/kit/core'
import { replaceAll } from '@milkdown/kit/utils'
import { editorViewCtx, serializerCtx } from '@milkdown/kit/core'
import { DOMSerializer } from '@milkdown/kit/prose/model'
import { applyTheme, getActiveCustomThemeCSS, loadSavedTheme } from './plugins/themes/theme-manager'
import { getAllPluginModules, getAllPlugins, togglePlugin as _togglePlugin } from './plugins'
import type { RendererPlugin } from './plugins'

// Trigger side-effect registration of built-in plugins
import './plugins/lib-entry'

// Editor base styles (reset, typography, theme CSS variables)
import './plugins/themes/base.css'

export type { RendererPlugin }

export interface ColaMDEditorOptions {
  /** DOM element ID to attach the editor to */
  rootId: string
  /** Initial theme name (light/dark/elegant/newsprint) */
  theme?: string
  /** Whether the editor is editable. Default: true */
  editable?: boolean
  /** Callback when content changes */
  onChange?: (markdown: string) => void
  /** Callback for Ctrl/Cmd+click on links */
  onExternalLink?: (href: string) => void
}

export interface ColaMDEditorHandle {
  editor: Editor
  setMarkdown(content: string): void
  getMarkdown(): string
  getHTML(): string
  getLiveHTML(): string
  /** 构建完整的独立 HTML 文档（含 CSS 变量、主题、插件样式），用于导出 */
  buildExportHTML(): string
  applyTheme(name: string, customCSS?: string): void
  togglePlugin(id: string, enabled: boolean): void
  togglePluginMode(nodeTypes: string[], mode: 'rendered' | 'raw'): void
  ensureAllPluginsRendered(): Promise<void>
  getAllPlugins(): RendererPlugin[]
  destroy(): void
}

/** Internal helper: clone live editor DOM with plugin-specific processing */
function doGetLiveHTML(root: HTMLElement): string {
  const editorDom = root.querySelector('.ProseMirror')
  if (!editorDom) return ''
  const clone = editorDom.cloneNode(true) as HTMLElement
  const plugins = getAllPlugins().filter((p) => p.enabled)
  for (const p of plugins) {
    if (!p.bgCaptureSelectors) continue
    for (const selector of p.bgCaptureSelectors) {
      const originals = editorDom.querySelectorAll(selector)
      const clones = clone.querySelectorAll(selector)
      originals.forEach((orig, i) => {
        const val = getComputedStyle(orig).backgroundColor
        if (val && clones[i]) (clones[i] as HTMLElement).style.backgroundColor = val
      })
    }
  }
  const rawSelectors = plugins.flatMap((p) => p.rawSelectors || [])
  if (rawSelectors.length) {
    clone.querySelectorAll(rawSelectors.join(',')).forEach((el) => el.remove())
  }
  const hideSelectors = plugins.flatMap((p) => p.hideSelectors || [])
  if (hideSelectors.length) {
    clone.querySelectorAll(hideSelectors.join(',')).forEach((el) => (el as HTMLElement).style.display = 'none')
  }
  return `<div id="write">${clone.innerHTML}</div>`
}

/** Internal helper to toggle plugin node modes (avoids `this` context issues) */
function doTogglePluginMode(_editor: Editor, nodeTypes: string[], mode: 'rendered' | 'raw'): void {
  _editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const { state, dispatch } = view
    const tr = state.tr
    const nodeTypeSet = new Set(nodeTypes)
    state.doc.descendants((node, pos) => {
      if (nodeTypeSet.has(node.type.name)) {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, mode })
      }
    })
    dispatch(tr)
  })
}

/**
 * Create a ColaMD editor instance for embedding in external applications.
 * This is the main library API — no Electron/Capacitor dependencies.
 */
export async function createColaMDEditor(options: ColaMDEditorOptions): Promise<ColaMDEditorHandle> {
  const root = document.getElementById(options.rootId)
  if (!root) throw new Error(`Element #${options.rootId} not found`)

  // Apply initial theme
  if (options.theme) {
    applyTheme(options.theme)
  }

  // If editable is false, add a CSS class and configure via ProseMirror
  if (options.editable === false) {
    root.classList.add('colamd-readonly')
  }

  const editor = await createMilkdownEditor(root, {
    onChange: options.onChange,
    onExternalLink: options.onExternalLink,
  })

  // Apply editable state via ProseMirror
  if (options.editable === false) {
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      // ProseMirror editable: false makes the view read-only
      view.setProps({ editable: () => false })
    })
  }

  return {
    editor,

    setMarkdown(content: string) {
      editor.action(replaceAll(content))
    },

    getMarkdown(): string {
      let markdown = ''
      editor.action((ctx) => {
        const serializer = ctx.get(serializerCtx)
        const view = ctx.get(editorViewCtx)
        markdown = serializer(view.state.doc)
      })
      return markdown
    },

    getHTML(): string {
      let html = ''
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        const div = document.createElement('div')
        const fragment = DOMSerializer.fromSchema(view.state.schema).serializeFragment(view.state.doc.content)
        div.appendChild(fragment)
        html = div.innerHTML
      })
      return html
    },

    getLiveHTML(): string {
      return doGetLiveHTML(root)
    },

    buildExportHTML(): string {
      const bodyStyle = getComputedStyle(document.body)
      const v = (name: string) => bodyStyle.getPropertyValue(name).trim()

      const bgColor = v('--bg-color')
      const textColor = v('--text-color')
      const textMuted = v('--text-muted')
      const borderColor = v('--border-color')
      const linkColor = v('--link-color')
      const codeBg = v('--code-bg')
      const codeBlockBg = v('--code-block-bg')
      const codeBlockText = v('--code-block-text') || textColor
      const blockquoteBorder = v('--blockquote-border')
      const blockquoteBg = v('--blockquote-bg') || 'transparent'
      const tableHeaderBg = v('--table-header-bg')
      const selectionBg = v('--selection-bg')

      const editorEl = root.querySelector('.ProseMirror')
      const editorStyle = editorEl ? getComputedStyle(editorEl) : bodyStyle
      const fontFamily = editorStyle.fontFamily || '-apple-system,BlinkMacSystemFont,sans-serif'
      const bodyFontSize = editorStyle.fontSize || '16px'
      const bodyLineHeight = editorStyle.lineHeight || '1.75'

      const getElFontSize = (tag: string, fallback: string): string => {
        const el = root.querySelector(`.ProseMirror ${tag}`)
        return el ? getComputedStyle(el).fontSize : fallback
      }
      const getElFontWeight = (tag: string, fallback: string): string => {
        const el = root.querySelector(`.ProseMirror ${tag}`)
        return el ? getComputedStyle(el).fontWeight : fallback
      }
      const getElColor = (selector: string, fallback: string): string => {
        const el = root.querySelector(`.ProseMirror ${selector}`)
        return el ? getComputedStyle(el).color : fallback
      }
      const strongColor = getElColor('strong', textColor)
      const codeColor = getElColor('code', textColor)

      // CSS variables from live DOM
      const varNames = [
        '--bg-color', '--text-color', '--text-muted', '--text-dim',
        '--border-color', '--link-color', '--accent-color', '--selection-bg',
        '--code-bg', '--code-color', '--code-block-bg', '--code-block-text',
        '--blockquote-bg', '--blockquote-border', '--table-header-bg',
        '--mermaid-background', '--mermaid-border-color', '--mermaid-node-fill',
        '--mermaid-node-stroke', '--mermaid-node-text', '--mermaid-edge-stroke',
        '--mermaid-cluster-fill', '--mermaid-cluster-stroke', '--mermaid-label-text',
        '--mermaid-font-family', '--mermaid-font-size',
        '--radius-sm', '--radius-md', '--radius-lg',
      ]
      const cssVarLines = varNames
        .map(n => { const val = v(n); return val ? `  ${n}: ${val};` : '' })
        .filter(Boolean)
        .join('\n')

      // Plugin export styles
      let pluginCSS = ''
      for (const p of getAllPlugins()) {
        if (p.enabled && p.exportStyles) {
          pluginCSS += `\n/* === ${p.name} === */\n${p.exportStyles}\n`
        }
      }

      // Theme handling
      let themeCSS = ''
      let bodyClass = ''
      const isCustom = document.body.classList.contains('theme-custom')

      if (isCustom) {
        bodyClass = 'theme-custom'
        const customCSS = getActiveCustomThemeCSS()
        if (customCSS) {
          themeCSS += `\n/* === Custom Theme: ${loadSavedTheme()} === */\n${customCSS}\n`
        }
      } else {
        for (const cls of ['theme-light', 'theme-dark', 'theme-elegant', 'theme-newsprint']) {
          if (document.body.classList.contains(cls)) { bodyClass = cls; break }
        }
      }

      const liveHTML = doGetLiveHTML(root)

      return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>ColaMD Export</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.46/dist/katex.min.css">
<style>
:root {
${cssVarLines}
}
${themeCSS}
${pluginCSS}
body{max-width:780px;margin:40px auto;padding:20px;font-size:${bodyFontSize};font-family:${fontFamily};line-height:${bodyLineHeight};background:${bgColor};color:${textColor}}
${isCustom ? '' : `h1{font-size:${getElFontSize('h1', '2em')};font-weight:${getElFontWeight('h1', '700')};border-bottom:1px solid ${borderColor};padding-bottom:.3em}
h2{font-size:${getElFontSize('h2', '1.5em')};font-weight:${getElFontWeight('h2', '600')};border-bottom:1px solid ${borderColor};padding-bottom:.25em}
h3{font-size:${getElFontSize('h3', '1.25em')};font-weight:${getElFontWeight('h3', '600')}}
h4{font-size:${getElFontSize('h4', '1.1em')};font-weight:${getElFontWeight('h4', '600')}}
h5{font-size:${getElFontSize('h5', '1em')};font-weight:${getElFontWeight('h5', '600')}}
h6{font-size:${getElFontSize('h6', '0.9em')};font-weight:${getElFontWeight('h6', '600')}}
strong{color:${strongColor}}`}
a{color:${linkColor};text-decoration:none}
code{background:${codeBg};color:${codeColor};padding:2px 6px;border-radius:3px;font-size:.875em;font-family:'SF Mono','Fira Code',Menlo,monospace}
pre{background:${codeBlockBg};color:${codeBlockText};padding:16px;border-radius:6px;overflow-x:auto;margin:1em 0}
pre code{background:none;padding:0;color:inherit}
blockquote{border-left:4px solid ${blockquoteBorder};background:${blockquoteBg};padding-left:16px;margin:1em 0;color:${textMuted}}
table{border-collapse:collapse;width:100%;margin:1em 0}
th,td{border:1px solid ${borderColor};padding:8px 12px}
th{background:${tableHeaderBg};font-weight:600}
hr{border:none;border-top:2px solid ${borderColor};margin:2em 0}
img{max-width:100%}
::selection{background:${selectionBg}}
${isCustom ? '' : `@page{margin:15mm;size:A4}
@media print{body{max-width:none;margin:0;padding:20px}#editor{position:static!important;overflow:visible!important}}`}
</style>
</head><body class="${bodyClass}">${liveHTML}</body></html>`
    },

    applyTheme(name: string, customCSS?: string) {
      applyTheme(name, customCSS)
      // Refresh theme-sensitive plugins (e.g., mermaid)
      for (const p of getAllPlugins()) {
        if (p.enabled && p.onThemeChange) p.onThemeChange(name, customCSS)
      }
      for (const p of getAllPlugins()) {
        if (p.enabled && p.nodeTypes && p.onThemeChange) {
          doTogglePluginMode(editor, p.nodeTypes, 'raw')
          requestAnimationFrame(() => doTogglePluginMode(editor, p.nodeTypes!, 'rendered'))
        }
      }
    },

    togglePlugin(id: string, enabled: boolean) {
      _togglePlugin(id, enabled)
      const p = getAllPlugins().find((x) => x.id === id)
      if (p) {
        const mode = enabled ? 'rendered' : 'raw'
        doTogglePluginMode(editor, p.nodeTypes || [], mode)
      }
    },

    togglePluginMode(nodeTypes: string[], mode: 'rendered' | 'raw') {
      doTogglePluginMode(editor, nodeTypes, mode)
    },

    async ensureAllPluginsRendered() {
      for (const p of getAllPlugins()) {
        if (p.enabled && p.ensureRendered) await p.ensureRendered()
      }
    },

    getAllPlugins(): RendererPlugin[] {
      return getAllPlugins()
    },

    destroy() {
      editor.destroy()
    },
  }
}
