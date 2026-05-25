import { Editor, rootCtx, defaultValueCtx, editorViewCtx, serializerCtx, remarkPluginsCtx, nodeViewCtx, schemaCtx } from '@milkdown/kit/core'
import { DOMSerializer } from '@milkdown/kit/prose/model'
import { EditorView } from '@milkdown/kit/prose/view'
import remarkBreaks from 'remark-breaks'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { history } from '@milkdown/kit/plugin/history'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { replaceAll } from '@milkdown/kit/utils'
import { htmlView } from './html-view'
import { getAllPluginModules, getAllPlugins } from './plugins'

import '@milkdown/kit/prose/view/style/prosemirror.css'

let editorInstance: Editor | null = null

const inlineStyles: Record<string, string> = {
  'h1': 'font-size:1.8em;font-weight:700;margin:1em 0 .5em;padding-bottom:.3em;border-bottom:1px solid #eee;',
  'h2': 'font-size:1.4em;font-weight:600;margin:1em 0 .5em;padding-bottom:.25em;border-bottom:1px solid #eee;',
  'h3': 'font-size:1.2em;font-weight:600;margin:.8em 0 .4em;',
  'h4': 'font-weight:600;margin:.8em 0 .4em;',
  'h5': 'font-weight:600;margin:.8em 0 .4em;',
  'h6': 'font-weight:600;margin:.8em 0 .4em;',
  'p': 'margin:.5em 0;line-height:1.75;',
  'strong': 'font-weight:600;',
  'a': 'color:#0969da;text-decoration:none;',
  'code': 'background:rgba(175,184,193,0.2);padding:2px 6px;border-radius:3px;font-size:.875em;font-family:Menlo,Monaco,monospace;',
  'pre': 'background:#f6f8fa;padding:16px;border-radius:6px;overflow-x:auto;margin:1em 0;',
  'blockquote': 'border-left:4px solid #ddd;padding-left:16px;margin:1em 0;color:#666;',
  'ul': 'padding-left:24px;margin:.5em 0;',
  'ol': 'padding-left:24px;margin:.5em 0;',
  'li': 'margin:.25em 0;',
  'table': 'border-collapse:collapse;width:100%;margin:1em 0;',
  'th': 'border:1px solid #ddd;padding:8px 12px;text-align:left;font-weight:600;background:#f6f8fa;',
  'td': 'border:1px solid #ddd;padding:8px 12px;text-align:left;',
  'hr': 'border:none;border-top:2px solid #ddd;margin:2em 0;',
  'img': 'max-width:100%;',
}

function enhanceClipboard(e: ClipboardEvent): void {
  const html = e.clipboardData?.getData('text/html')
  if (!html) return

  const doc = new DOMParser().parseFromString(html, 'text/html')

  for (const [tag, style] of Object.entries(inlineStyles)) {
    doc.querySelectorAll(tag).forEach((el) => {
      ;(el as HTMLElement).setAttribute('style', style)
    })
  }

  doc.querySelectorAll('pre code').forEach((el) => {
    ;(el as HTMLElement).setAttribute('style', 'background:none;padding:0;font-size:.875em;line-height:1.6;font-family:Menlo,Monaco,monospace;')
  })

  for (const p of getAllPlugins()) {
    if (!p.enabled || !p.clipboardStyles) continue
    for (const [selector, style] of Object.entries(p.clipboardStyles)) {
      doc.querySelectorAll(selector).forEach((el) => {
        ;(el as HTMLElement).setAttribute('style', style)
      })
    }
  }

  e.clipboardData?.setData('text/html', doc.body.innerHTML)
}

const defaultContent = `# Welcome to ColaMD\n\nStart typing here...\n`

export async function createEditor(
  rootId: string,
  onChange?: (markdown: string) => void
): Promise<Editor> {
  const root = document.getElementById(rootId)
  if (!root) throw new Error(`Element #${rootId} not found`)

  const pluginModules = getAllPluginModules()

  let builder = Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, defaultContent)
      ctx.set(remarkPluginsCtx, [
        ...pluginModules.map((m) => m.info.remarkPlugin),
        { plugin: remarkBreaks, options: undefined },
      ] as any)
      if (onChange) {
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
          onChange(markdown)
        })
      }
    })
    .use(commonmark)
    .use(gfm)
    .use(history)
    .use(listener)
    .use(clipboard)
    .use(htmlView)

  for (const mod of pluginModules) {
    for (const p of mod.milkdownPlugins) {
      builder = builder.use(p)
    }
  }

  try {
    editorInstance = await builder.create()
  } catch (e: any) {
    const offendingModule = pluginModules.find((m) =>
      m.info.nodeTypes?.some((nt) => e?.message?.includes(nt))
    )
    if (offendingModule) {
      console.warn('[editor] Milkdown context error, retrying without plugin:', offendingModule.info.id, e.message)
      const filteredModules = pluginModules.filter((m) => m !== offendingModule)
      builder = Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root)
          ctx.set(defaultValueCtx, defaultContent)
          ctx.set(remarkPluginsCtx, [
            ...filteredModules.map((m) => m.info.remarkPlugin),
            { plugin: remarkBreaks, options: undefined },
          ] as any)
          if (onChange) ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => { onChange(markdown) })
        })
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(listener)
        .use(clipboard)
        .use(htmlView)
      for (const mod of filteredModules) {
        for (const p of mod.milkdownPlugins) {
          builder = builder.use(p)
        }
      }
      editorInstance = await builder.create()
    } else {
      throw e
    }
  }

  editorInstance.action((ctx) => {
    const nvs = ctx.get(nodeViewCtx)
    const schema = ctx.get(schemaCtx)
    const fixed = nvs.map((nv: any, i: number) => {
      if (nv[0] != null) return nv
      const viewFn = nv[1]
      const fallbackNames = pluginModules.flatMap((m) => m.info.nodeTypes || [])
      const name = fallbackNames[i - 1]
      if (name && schema.nodes[name]) {
        return [name, viewFn]
      }
      return nv
    })
    ctx.set(nodeViewCtx, fixed)

    const oldView = ctx.get(editorViewCtx)
    const rootEl = ctx.get(rootCtx) as HTMLElement
    const nodeViews = Object.fromEntries(fixed)

    const newView = new EditorView(rootEl, {
      state: oldView.state,
      nodeViews,
      dispatchTransaction: oldView.props.dispatchTransaction!,
    })
    oldView.destroy()
    rootEl.appendChild(newView.dom)
    ctx.set(editorViewCtx, newView)
  })

  root.addEventListener('copy', enhanceClipboard)
  root.addEventListener('cut', enhanceClipboard)

  /*
   * REMOVED: Custom IME composition handlers for mobile CJK input.
   * ProseMirror handles IME composition natively via its DOM observer and input rules.
   * These handlers dispatched synthetic input events that interfered with ProseMirror's
   * internal state tracking, causing duplicated characters and broken undo history.
   *
   * Original code:
   * if (/android|iphone|ipad/i.test(navigator.userAgent)) {
   *     root.addEventListener('compositionstart', () => { ... })
   *     root.addEventListener('compositionend', () => { ... })
   * }
   */

  root.addEventListener('click', (e) => {
    if (!(e.metaKey || e.ctrlKey)) return
    const link = (e.target as HTMLElement).closest('a')
    if (!link) return
    const href = link.getAttribute('href')
    if (href) {
      e.preventDefault()
      window.electronAPI?.openExternal(href)
      window.capacitorAPI?.openExternal(href)
    }
  })

  return editorInstance
}

export function getMarkdown(): string {
  if (!editorInstance) return ''
  let markdown = ''
  editorInstance.action((ctx) => {
    const serializer = ctx.get(serializerCtx)
    const view = ctx.get(editorViewCtx)
    markdown = serializer(view.state.doc)
  })
  return markdown
}

/**
 * Get HTML by cloning the live rendered DOM.
 * Unlike {@link getHTML} which uses DOMSerializer (creating fresh nodes with
 * "Rendering..." placeholders), this captures the actual rendered SVGs
 * from mermaid, KaTeX math, etc. Used for PDF/HTML export.
 */
export function getLiveHTML(): string {
  const editorDom = document.querySelector('#editor .ProseMirror')
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
  return clone.innerHTML
}

export function getHTML(): string {
  if (!editorInstance) return ''
  let html = ''
  editorInstance.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const div = document.createElement('div')
    const fragment = DOMSerializer.fromSchema(view.state.schema).serializeFragment(view.state.doc.content)
    div.appendChild(fragment)
    html = div.innerHTML
  })
  return html
}

export function setMarkdown(content: string): void {
  if (!editorInstance) return
  editorInstance.action(replaceAll(content))
}

export function togglePluginMode(nodeTypes: string[], mode: 'rendered' | 'raw'): void {
  if (!editorInstance) return
  editorInstance.action((ctx) => {
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
