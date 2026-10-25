// ColaMD 2.x 库渲染器（浏览器 ESM）。
//
// 给下游（ColaMD-themes 的 HTML/PDF 导出管线）使用：在无 Electron 的页面里创建同一个
// CodeMirror 6 编辑器，套用同一套主题 CSS，等 mermaid/KaTeX 画完，再把语义化文档和
// 内联样式交出去。它不读写文件、不接 IPC，只复用渲染层的模块。
//
// 用法：
//   const handle = await createColaMDEditor({ rootId: 'editor', editable: false })
//   handle.applyTheme('elegant')
//   handle.setMarkdown(markdown)
//   await handle.ensureAllPluginsRendered()
//   const html = await handle.buildExportHTML()
import {
  createEditor,
  getMarkdown as readEditorMarkdown,
  setCleanExport,
  setMarkdown as writeEditorMarkdown
} from '../renderer/editor/editor'
import type { EditorHandle } from '../renderer/editor/core'
import { applyTheme as applyBodyTheme } from '../renderer/themes/theme-manager'
import { documentHTMLFrom } from '../renderer/editor/clean-html'
import { enterPaperLayout, exitPaperLayout } from '../renderer/print-layout'
import { collectExportStyles } from './export-styles'

import '../renderer/themes/base.css'
import '../renderer/themes/premium.css'
import '../renderer/themes/editor-preview.css'
import '../renderer/themes/document.css'

export { THEME_CONTRACT, CONTRACT_VERSION } from './contract'
export type { ThemeContract } from './contract'

export interface ColaMDEditorOptions {
  /** 编辑器容器 id。默认 `editor`，容器不存在时直接报错。 */
  rootId?: string
  /** 初始 markdown。默认空文档。 */
  markdown?: string
  /** 是否可编辑。导出场景默认 false。 */
  editable?: boolean
}

export interface ColaMDRendererHandle {
  /** 应用主题：内置主题名，或 `custom:` + `:root` 契约 CSS。 */
  applyTheme(name: string, customCSS?: string): void
  /** 替换整篇文档（会清空撤销栈）。 */
  setMarkdown(markdown: string): void
  /** 当前缓冲区内容。 */
  getMarkdown(): string
  /** 摊平整篇、等 mermaid/图片/字体就绪。 */
  ensureAllPluginsRendered(): Promise<void>
  /** 产出一份可以离线打开的完整 HTML。 */
  buildExportHTML(options?: { title?: string }): Promise<string>
  /** 销毁编辑器。 */
  destroy(): void
}

/** 等 CodeMirror / mermaid 补渲染的上限；与应用导出同一档位。 */
const PLUGIN_TIMEOUT_MS = 15000

let handle: EditorHandle | null = null

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

function pluginsSettled(): boolean {
  const pendingDiagrams = document.querySelectorAll(
    '.cm-md-mermaid:not(.cm-md-mermaid-ready):not(.cm-md-mermaid-failed)'
  ).length
  const pendingImages = Array.from(document.images).some((image) => !image.complete)
  return pendingDiagrams === 0 && !pendingImages
}

async function ensureAllPluginsRendered(): Promise<void> {
  await enterPaperLayout()
  await nextFrame()

  const deadline = Date.now() + PLUGIN_TIMEOUT_MS
  while (!pluginsSettled() && Date.now() < deadline) {
    await nextFrame()
  }
  await document.fonts.ready
}

function escapeHTML(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char] ?? char)
}

function exportBodyClass(): string {
  const omitted = new Set(['paper', 'exporting', 'show-file-panel'])
  return Array.from(document.body.classList)
    .filter((name) => !omitted.has(name))
    .join(' ')
}

function exportHTML(documentHTML: string, styles: string, bodyClass: string, title: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHTML(title)}</title>
  <style>${styles}
    html, body { height: auto; overflow: visible; }
    body { min-width: 320px; }
    #titlebar, #file-panel { display: none !important; }
  </style>
</head>
<body class="${escapeHTML(bodyClass)}">
  <article class="colamd-document">${documentHTML}</article>
</body>
</html>
`
}

export async function createColaMDEditor(options: ColaMDEditorOptions = {}): Promise<ColaMDRendererHandle> {
  const rootId = options.rootId ?? 'editor'
  const root = document.getElementById(rootId)
  if (!root) throw new Error(`Element #${rootId} not found`)

  handle = await createEditor(rootId)
  writeEditorMarkdown(options.markdown ?? '', true)
  handle.setEditable(options.editable ?? false)

  return {
    applyTheme(name: string, customCSS?: string): void {
      applyBodyTheme(name, customCSS)
    },
    setMarkdown(markdown: string): void {
      writeEditorMarkdown(markdown, true)
    },
    getMarkdown(): string {
      return readEditorMarkdown()
    },
    ensureAllPluginsRendered,
    async buildExportHTML(exportOptions: { title?: string } = {}): Promise<string> {
      setCleanExport(true)
      document.body.classList.add('exporting')
      try {
        await ensureAllPluginsRendered()
        const content = document.querySelector<HTMLElement>('#editor .cm-content')
        const documentHTML = content ? documentHTMLFrom(content) : ''
        const styles = collectExportStyles()
        return exportHTML(documentHTML, styles, exportBodyClass(), exportOptions.title ?? 'ColaMD document')
      } finally {
        setCleanExport(false)
        document.body.classList.remove('exporting')
        exitPaperLayout()
      }
    },
    destroy(): void {
      handle?.destroy()
      handle = null
      exitPaperLayout()
    }
  }
}
