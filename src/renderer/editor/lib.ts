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
import { applyTheme } from './plugins/themes/theme-manager'
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
  applyTheme(name: string, customCSS?: string): void
  togglePlugin(id: string, enabled: boolean): void
  togglePluginMode(nodeTypes: string[], mode: 'rendered' | 'raw'): void
  ensureAllPluginsRendered(): Promise<void>
  getAllPlugins(): RendererPlugin[]
  destroy(): void
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
      const editorDom = root.querySelector('.ProseMirror')
      if (!editorDom) return ''
      const clone = editorDom.cloneNode(true) as HTMLElement

      const plugins = getAllPlugins().filter((p) => p.enabled)

      // Inline computed background colors from plugin-declared selectors
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

      // Remove raw-source textareas declared by plugins
      const rawSelectors = plugins.flatMap((p) => p.rawSelectors || [])
      if (rawSelectors.length) {
        clone.querySelectorAll(rawSelectors.join(',')).forEach((el) => el.remove())
      }
      // Hide loading/error placeholders declared by plugins
      const hideSelectors = plugins.flatMap((p) => p.hideSelectors || [])
      if (hideSelectors.length) {
        clone.querySelectorAll(hideSelectors.join(',')).forEach((el) => (el as HTMLElement).style.display = 'none')
      }
      return `<div id="write">${clone.innerHTML}</div>`
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
          requestAnimationFrame(() => doTogglePluginMode(editor, p.nodeTypes, 'rendered'))
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
