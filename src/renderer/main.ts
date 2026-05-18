import { createEditor, getMarkdown, getHTML, setMarkdown, togglePluginMode } from './editor/editor'
import { applyTheme, loadSavedTheme } from './themes/theme-manager'
import { getAllPlugins, togglePlugin, findPluginBySelector, findExportCapabilities } from './editor/plugins'
import { createCapacitorAPI } from './capacitor-api'
import './themes/base.css'
import './mobile.css'

const pluginModules = import.meta.glob<{ default?: unknown }>('./editor/plugins/*-plugin.ts', { eager: true })
Object.keys(pluginModules)

function isSlidesContent(content: string): boolean {
  return /^---\s*\n[\s\S]*?(kicker|chip):/m.test(content)
}

let sourceModeActive = false
const editorEl = () => document.getElementById('editor') as HTMLElement
const sourceEl = () => document.getElementById('source-editor') as HTMLTextAreaElement
const slidesBtnEl = () => document.getElementById('slides-btn') as HTMLButtonElement

function enterSourceMode(content: string): void {
  sourceModeActive = true
  editorEl().classList.add('hidden')
  const ta = sourceEl()
  ta.classList.add('visible')
  ta.value = content
  slidesBtnEl().classList.add('visible')
}

function exitSourceMode(): void {
  sourceModeActive = false
  editorEl().classList.remove('hidden')
  sourceEl().classList.remove('visible')
  slidesBtnEl().classList.remove('visible')
}

function setContent(content: string): void {
  if (isSlidesContent(content)) {
    enterSourceMode(content)
  } else {
    exitSourceMode()
    setMarkdown(content)
  }
}

function getContent(): string {
  if (sourceModeActive) return sourceEl().value
  return getMarkdown()
}

function syncRawEdits(): void {
  document.querySelectorAll('.math-block-raw, .math-inline-raw, .mermaid-source').forEach((el) => {
    if ((el as HTMLElement).matches(':focus')) (el as HTMLElement).blur()
  })
}

function restoreRenderedMode(api: any): void {
  for (const p of getAllPlugins()) {
    if (!p.enabled) {
      p.enabled = true
      togglePluginMode(p.nodeTypes, 'rendered')
      api.syncPluginState(p.id, true)
    }
  }
}

async function init(): Promise<void> {
  const api = window.electronAPI || await createCapacitorAPI()
  const savedTheme = loadSavedTheme()
  applyTheme(savedTheme)

  if (savedTheme.startsWith('custom:')) {
    const fileName = savedTheme.slice(7)
    const css = await api.loadThemeCSS(fileName)
    if (css) applyTheme(savedTheme, css)
  }

  await createEditor('editor')

  // Run plugin init hooks (mermaid initialize, etc.)
  for (const p of getAllPlugins()) p.onInit?.()

  // Send plugin list to main process for menu
  api.registerPlugins(getAllPlugins().map((p) => ({ id: p.id, name: p.name, enabled: p.enabled })))

  // Handle plugin toggle from menu
  api.onMenuTogglePlugin((id) => {
    togglePlugin(id)
    const p = getAllPlugins().find((x) => x.id === id)
    if (p) {
      const mode = p.enabled ? 'rendered' : 'raw'
      togglePluginMode(p.nodeTypes, mode)
      api.syncPluginState(p.id, p.enabled)
    }
  })

  // ─── Mobile menu setup ───
  setupMobileMenu(api, savedTheme)

  // ─── Intent file opened (Android) ───
  window.addEventListener('intent-file-opened', ((e: CustomEvent<{ path: string; content: string }>) => {
    const { path, content } = e.detail
    console.log('Intent file opened:', path)
    setContent(content)
  }) as EventListener)

  // Slides button — open as slides
  slidesBtnEl().addEventListener('click', () => api.openAsSlides(getContent()))

  api.onMenuOpen(async () => {
    const result = await api.openFile()
    if (result) setContent(result.content)
  })

  api.onMenuSave(async () => {
    syncRawEdits()
    const ok = await api.saveFile(getContent())
    if (ok) restoreRenderedMode(api)
  })
  api.onMenuSaveAs(async () => {
    syncRawEdits()
    const ok = await api.saveFileAs(getContent())
    if (ok) restoreRenderedMode(api)
  })
  api.onMenuExportPDF(async () => {
    syncRawEdits()
    restoreRenderedMode(api)
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    await api.exportPDF()
  })
  api.onMenuExportHTML(() => {
    const s = getComputedStyle(document.body)
    const v = (name: string) => s.getPropertyValue(name).trim()
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

    const editor = document.querySelector('#editor .ProseMirror')
    const fontFamily = editor ? getComputedStyle(editor).fontFamily : '-apple-system,BlinkMacSystemFont,sans-serif'

    const getElColor = (selector: string, fallback: string): string => {
      const el = document.querySelector(`#editor .ProseMirror ${selector}`)
      return el ? getComputedStyle(el).color : fallback
    }
    const strongColor = getElColor('strong', textColor)
    const codeColor = getElColor('code', textColor)

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>ColaMD Export</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.46/dist/katex.min.css">
<style>
body{max-width:780px;margin:40px auto;padding:20px;font-family:${fontFamily};line-height:1.75;background:${bgColor};color:${textColor}}
h1{font-size:2em;font-weight:700;border-bottom:1px solid ${borderColor};padding-bottom:.3em}
h2{font-size:1.5em;font-weight:600;border-bottom:1px solid ${borderColor};padding-bottom:.25em}
h3{font-size:1.25em;font-weight:600}
strong{color:${strongColor}}
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
.math-inline{display:inline;padding:2px 4px;border-radius:3px;background:${codeBg}}
.math-block{display:block;padding:16px;margin:1em 0;border-radius:6px;background:${codeBlockBg};text-align:center;overflow-x:auto}
.mermaid-block{display:block;padding:16px;margin:1em 0;border-radius:6px;background:${codeBlockBg};border:1px solid ${borderColor}}
.mermaid-preview{display:flex;justify-content:center;align-items:center}
.mermaid-preview svg{max-width:100%;height:auto}
.mermaid-preview svg .label text,.mermaid-preview svg .nodeLabel text,.mermaid-preview svg .state-title,.mermaid-preview svg .state-description,.mermaid-preview svg .pieTitleText,.mermaid-preview svg .titleText{transform:translateY(-2px)}.mermaid-preview svg .nodeLabel,.mermaid-preview svg .edgeLabel{display:inline-block;position:relative;top:-2px}
</style>
</head><body>${getHTML()}</body></html>`
    api.exportHTML(html)
  })

  api.onNewFile(() => { exitSourceMode(); setMarkdown('') })
  api.onFileOpened((data) => setContent(data.content))
  api.onFileChanged((content) => {
    if (sourceModeActive) {
      sourceEl().value = content
    } else {
      setMarkdown(content)
    }
  })
  api.onSetTheme((theme) => {
    applyTheme(theme)
    // Notify all plugins of theme change
    for (const p of getAllPlugins()) p.onThemeChange?.(theme)
    // Force re-render all enabled plugin nodes so they pick up the new theme
    for (const p of getAllPlugins()) {
      if (p.enabled) {
        togglePluginMode(p.nodeTypes, 'raw')
        requestAnimationFrame(() => togglePluginMode(p.nodeTypes, 'rendered'))
      }
    }
  })
  api.onSetCustomCSS((css) => {
    const theme = loadSavedTheme()
    applyTheme(theme, css)
  })

  api.onMenuNewSlides(async () => {
    await api.newSlides()
  })

  api.onNewSlidesContent((content) => {
    enterSourceMode(content)
  })

  api.onMenuOpenAsSlides(async () => {
    await api.openAsSlides(getContent())
  })

  api.onMenuExportSlides(async () => {
    await api.exportSlides(getContent())
  })

  api.onMenuImportTheme(async () => {
    const result = await api.loadCustomTheme()
    if (result) applyTheme(`custom:${result.name}`, result.css)
  })

  const agentDot = document.getElementById('agent-dot')
  api.onAgentActivity((state) => {
    if (agentDot) agentDot.className = state === 'idle' ? '' : state
  })

  // --- Export via plugin capabilities (context menu) ---
  let exportTarget: HTMLElement | null = null
  let exportCapability: import('./editor/plugins').ExportCapability | null = null
  let contextMenu: HTMLDivElement | null = null

  function getContextMenu(): HTMLDivElement {
    if (!contextMenu) {
      contextMenu = document.createElement('div')
      contextMenu.id = 'cola-context-menu'
      document.body.appendChild(contextMenu)
    }
    return contextMenu
  }

  function hideContextMenu(): void {
    if (contextMenu) contextMenu.style.display = 'none'
  }

  async function executeExport(cap: import('./editor/plugins').ExportCapability): Promise<void> {
    const target = exportTarget
    if (!target) return
    hideContextMenu()
    try {
      const dataUrl = await cap.execute(target)
      if (!dataUrl) return
      await api.exportFile(dataUrl, cap.defaultName)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  document.addEventListener('contextmenu', (e) => {
    if ((e.target as Element).matches('textarea, input, [contenteditable="true"]')) return
    const target = (e.target as Element).closest('.mermaid-block, .math-block') as HTMLElement | null
    if (!target) return
    const capabilities = findExportCapabilities(target.className)
    if (!capabilities.length) return
    e.preventDefault()
    exportTarget = target

    const menu = getContextMenu()
    menu.innerHTML = capabilities.map((cap) =>
      `<div class="cola-menu-item" data-export="${cap.label}">${cap.label}</div>`
    ).join('')
    menu.style.left = e.clientX + 'px'
    menu.style.top = e.clientY + 'px'
    menu.style.display = 'block'

    menu.querySelectorAll('.cola-menu-item').forEach((item) => {
      item.addEventListener('click', (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        const cap = capabilities.find((c) => c.label === (ev.target as HTMLElement).dataset.export)
        if (cap) executeExport(cap)
      })
    })
  })

  document.addEventListener('mousedown', (e) => {
    if (contextMenu && !contextMenu.contains(e.target as Node)) {
      hideContextMenu()
    }
  }, true)

  document.addEventListener('dragover', (e) => e.preventDefault())
  document.addEventListener('drop', async (e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files[0]
    if (!file) return
    const filePath = api.getPathForFile(file)
    if (!filePath) return
    const result = await api.openFilePath(filePath)
    if (result) setContent(result.content)
  })
}

/**
 * 初始化移动端侧边栏菜单的交互逻辑。
 * 包括菜单开关、主题切换、插件开关、文件操作等。
 * @param api 平台 API（Electron 或 Capacitor）
 * @param currentTheme 当前激活的主题名称
 */
function setupMobileMenu(api: any, currentTheme: string): void {
  const menuEl = document.getElementById('mobile-menu')!
  const menuBtn = document.getElementById('menu-btn')!
  const closeBtn = document.getElementById('menu-close-btn')
  const overlay = document.getElementById('menu-overlay')
  if (!menuEl || !menuBtn) return

  function openMenu(): void {
    menuEl.classList.add('open')
  }

  function closeMenu(): void {
    menuEl.classList.remove('open')
  }

  menuBtn.addEventListener('click', openMenu)
  closeBtn?.addEventListener('click', closeMenu)
  overlay?.addEventListener('click', closeMenu)

  // 主题列表
  const themes = [
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
    { key: 'elegant', label: 'Elegant' },
    { key: 'newsprint', label: 'Newsprint' },
  ]

  const themeListEl = document.getElementById('menu-theme-list')
  if (themeListEl) {
    themeListEl.innerHTML = themes.map((t) =>
      `<div class="menu-theme-item${t.key === currentTheme ? ' active' : ''}" data-theme="${t.key}">${t.label}</div>`
    ).join('')

    themeListEl.querySelectorAll('.menu-theme-item').forEach((el) => {
      el.addEventListener('click', () => {
        const theme = (el as HTMLElement).dataset.theme!
        applyTheme(theme)
        for (const p of getAllPlugins()) p.onThemeChange?.(theme)
        for (const p of getAllPlugins()) {
          if (p.enabled) {
            togglePluginMode(p.nodeTypes, 'raw')
            requestAnimationFrame(() => togglePluginMode(p.nodeTypes, 'rendered'))
          }
        }
        themeListEl.querySelectorAll('.menu-theme-item').forEach((e) => e.classList.remove('active'))
        el.classList.add('active')
        closeMenu()
      })
    })
  }

  // 插件列表
  const pluginsSection = document.getElementById('menu-plugins-section')
  const pluginListEl = document.getElementById('menu-plugin-list')
  const plugins = getAllPlugins()
  if (pluginsSection && pluginListEl && plugins.length > 0) {
    pluginsSection.style.display = ''
    pluginListEl.innerHTML = plugins.map((p) =>
      `<div class="menu-plugin-item" data-plugin-id="${p.id}"><span>${p.name}</span><div class="menu-plugin-toggle${p.enabled ? ' on' : ''}"></div></div>`
    ).join('')

    pluginListEl.querySelectorAll('.menu-plugin-item').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.pluginId!
        togglePlugin(id)
        const p = getAllPlugins().find((x) => x.id === id)
        if (p) {
          const mode = p.enabled ? 'rendered' : 'raw'
          togglePluginMode(p.nodeTypes, mode)
          api.syncPluginState(p.id, p.enabled)
          const toggle = el.querySelector('.menu-plugin-toggle')
          toggle?.classList.toggle('on', p.enabled)
        }
      })
    })
  }

  // 菜单操作按钮
  menuEl.querySelectorAll('.menu-item').forEach((el) => {
    el.addEventListener('click', async () => {
      const action = (el as HTMLElement).dataset.action
      if (!action) return
      closeMenu()

      switch (action) {
        case 'new':
          exitSourceMode()
          setMarkdown('')
          break
        case 'open': {
          const result = await api.openFile()
          if (result) setContent(result.content)
          break
        }
        case 'save':
          syncRawEdits()
          await api.saveFile(getContent())
          restoreRenderedMode(api)
          break
        case 'save-as':
          syncRawEdits()
          await api.saveFileAs(getContent())
          restoreRenderedMode(api)
          break
        case 'export-pdf':
          syncRawEdits()
          restoreRenderedMode(api)
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
          await api.exportPDF()
          break
        case 'export-html':
          api.exportHTML(buildExportHTML())
          break
        case 'export-slides':
          await api.exportSlides(getContent())
          break
        case 'new-slides': {
          const template = await api.newSlides()
          if (template) enterSourceMode(template)
          break
        }
        case 'open-as-slides':
          await api.openAsSlides(getContent())
          break
        case 'import-theme': {
          const result = await api.loadCustomTheme()
          if (result) applyTheme(`custom:${result.name}`, result.css)
          break
        }
        case 'about':
          api.openExternal('https://github.com/marswaveai/colamd')
          break
        case 'exit':
          try {
            const { App } = await import('@capacitor/app')
            await App.exitApp()
          } catch {
            window.close()
          }
          break
      }
    })
  })
}

/**
 * 构建导出用的 HTML 字符串，包含当前主题样式。
 * @returns 完整的 HTML 文档字符串
 */
function buildExportHTML(): string {
  const s = getComputedStyle(document.body)
  const v = (name: string) => s.getPropertyValue(name).trim()
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

  const editor = document.querySelector('#editor .ProseMirror')
  const fontFamily = editor ? getComputedStyle(editor).fontFamily : '-apple-system,BlinkMacSystemFont,sans-serif'

  const getElColor = (selector: string, fallback: string): string => {
    const el = document.querySelector(`#editor .ProseMirror ${selector}`)
    return el ? getComputedStyle(el).color : fallback
  }
  const strongColor = getElColor('strong', textColor)
  const codeColor = getElColor('code', textColor)

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>ColaMD Export</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.46/dist/katex.min.css">
<style>
body{max-width:780px;margin:40px auto;padding:20px;font-family:${fontFamily};line-height:1.75;background:${bgColor};color:${textColor}}
h1{font-size:2em;font-weight:700;border-bottom:1px solid ${borderColor};padding-bottom:.3em}
h2{font-size:1.5em;font-weight:600;border-bottom:1px solid ${borderColor};padding-bottom:.25em}
h3{font-size:1.25em;font-weight:600}
strong{color:${strongColor}}
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
.math-inline{display:inline;padding:2px 4px;border-radius:3px;background:${codeBg}}
.math-block{display:block;padding:16px;margin:1em 0;border-radius:6px;background:${codeBlockBg};text-align:center;overflow-x:auto}
.mermaid-block{display:block;padding:16px;margin:1em 0;border-radius:6px;background:${codeBlockBg};border:1px solid ${borderColor}}
.mermaid-preview{display:flex;justify-content:center;align-items:center}
.mermaid-preview svg{max-width:100%;height:auto}
</style>
</head><body>${getHTML()}</body></html>`
}

init().catch((e) => console.error('ColaMD init failed:', e))
