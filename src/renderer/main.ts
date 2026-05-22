import { createEditor, getMarkdown, getHTML, getLiveHTML, setMarkdown, togglePluginMode } from './editor/editor'
import { applyTheme, loadSavedTheme, setCachedCustomTheme } from './editor/plugins/themes/theme-manager'
import { getAllPlugins, togglePlugin, findPluginBySelector, findExportCapabilities } from './editor/plugins'
import './editor/plugins/math-plugin'
import './editor/plugins/mermaid-plugin'
import { createCapacitorAPI } from './capacitor-api'
import './editor/plugins/themes/base.css'
import './mobile.css'

/**
 * Show a brief toast notification. Used for save/export feedback.
 */
function showToast(message: string, duration = 2000): void {
  const existing = document.querySelector('.cola-toast')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.className = 'cola-toast'
  toast.textContent = message
  toast.style.cssText =
    'position:fixed;top:56px;left:50%;transform:translateX(-50%);' +
    'background:rgba(0,0,0,0.8);color:#fff;padding:10px 20px;' +
    'border-radius:8px;font-size:14px;z-index:9999;pointer-events:none;'
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transition = 'opacity 0.3s'
    setTimeout(() => toast.remove(), 300)
  }, duration)
}

/**
 * 调用原生桥接层检查是否有通过文件管理器 Intent 待打开的文件。
 * 使用 pull 模式：JS 主动向 Java 查询，避免注入时序问题。
 */
function checkAndOpenPendingFile(api?: any): void {
  const bridge = (window as any).ColaMDNative
  if (!bridge || typeof bridge.checkPendingFile !== 'function') return
  try {
    const result = bridge.checkPendingFile()
    if (result && result !== 'null') {
      const data = JSON.parse(result)
      if (data && data.content) {
        setContent(data.content)
        if (data.name && api?.setCurrentFile) {
          api.setCurrentFile(data.name)
        }
      }
    }
  } catch (e) { /* ignore */ }
}

/**
 * 轮询原生桥接层，获取待打开的文件。
 * Android onNewIntent 在 WebView 重载前触发，需要轮询等待。
 */
function processPendingIntentFile(api?: any): void {
  checkAndOpenPendingFile(api)
}

// Eagerly load all plugin modules for side-effect registration (registerPluginModule)
const _pluginRegistry = import.meta.glob<{ default?: unknown }>('./editor/plugins/*-plugin.ts', { eager: true })
Object.keys(_pluginRegistry)

/** Call ensureRendered on all enabled plugins that support it. Used before export. */
async function ensureAllPluginsRendered(): Promise<void> {
  for (const p of getAllPlugins()) {
    if (p.enabled && p.ensureRendered) await p.ensureRendered()
  }
}

/** Re-render nodes of plugins that react to theme changes (e.g. mermaid). */
function refreshThemeSensitivePlugins(): void {
  for (const p of getAllPlugins()) {
    if (p.enabled && p.nodeTypes && p.onThemeChange) {
      togglePluginMode(p.nodeTypes, 'raw')
      requestAnimationFrame(() => togglePluginMode(p.nodeTypes, 'rendered'))
    }
  }
}

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
      togglePluginMode(p.nodeTypes || [], 'rendered')
      api.syncPluginState(p.id, true)
    }
  }
}

async function init(): Promise<void> {
  const api = window.electronAPI || await createCapacitorAPI()

  let editorReady = false
  let pendingFileContent: string | null = null

  // Register file-open listener AS EARLY AS POSSIBLE
  api.onFileOpened((data) => {
    if (editorReady) {
      setContent(data.content)
    } else {
      pendingFileContent = data.content
    }
  })

  let savedTheme = loadSavedTheme()

  try {
    if (savedTheme.startsWith('custom:')) {
      const fileName = savedTheme.slice(7)
      const css = await api.loadThemeCSS(fileName)
      if (css) {
        setCachedCustomTheme(fileName, css)
        applyTheme(savedTheme)
      } else {
        applyTheme('elegant')
      }
    } else {
      applyTheme(savedTheme)
    }
  } catch (e) {
    console.error('Theme initialization failed, falling back to elegant:', e)
    applyTheme('elegant')
  }

  try {
    await createEditor('editor')
  } catch (e) {
    console.error('Editor initialization failed:', e)
  }
  editorReady = true

  if (pendingFileContent !== null) {
    setContent(pendingFileContent)
    pendingFileContent = null
  }

  for (const p of getAllPlugins()) p.onInit?.()
  checkAndOpenPendingFile(api)

  api.registerPlugins(getAllPlugins().map((p) => ({ id: p.id, name: p.name, enabled: p.enabled })))

  api.onMenuTogglePlugin((id) => {
    const p = getAllPlugins().find((x) => x.id === id)
    if (p) {
      togglePlugin(id, !p.enabled)
      const mode = p.enabled ? 'rendered' : 'raw'
      togglePluginMode(p.nodeTypes || [], mode)
      api.syncPluginState(p.id, p.enabled)
    }
  })

  // ─── Mobile menu setup ───
  setupMobileMenu(api, savedTheme)

  // Continuously check for Intent files (Android only, APP already running)
  if (!window.electronAPI) {
    setInterval(() => processPendingIntentFile(api), 3000)
  }

  // Slides button — open as slides
  slidesBtnEl().addEventListener('click', () => api.openAsSlides(getContent()))

  api.onMenuOpen(async () => {
    const result = await api.openFile()
    if (result) setContent(result.content)
  })

  api.onMenuSave(async () => {
    syncRawEdits()
    const ok = await api.saveFile(getContent())
    if (ok) {
      showToast('Saved')
      restoreRenderedMode(api)
    } else {
      showToast('Save failed')
    }
  })
  api.onMenuSaveAs(async () => {
    syncRawEdits()
    const ok = await api.saveFileAs(getContent())
    if (ok) {
      showToast('Saved')
      restoreRenderedMode(api)
    } else {
      showToast('Save cancelled or failed')
    }
  })
  api.onMenuExportPDF(async () => {
    syncRawEdits()
    restoreRenderedMode(api)
    await ensureAllPluginsRendered()
    await new Promise(r => setTimeout(r, 300))
    await api.exportPDF(buildExportHTML())
    setTimeout(() => {
      document.querySelectorAll('.mermaid-loading, .mermaid-error')
        .forEach(el => (el as HTMLElement).style.display = 'none')
    }, 1000)
  })
  api.onMenuExportHTML(async () => {
    syncRawEdits()
    restoreRenderedMode(api)
    await ensureAllPluginsRendered()
    await new Promise(r => setTimeout(r, 200))

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
    const mermaidBg = v('--mermaid-background') || bgColor
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
.math-inline{display:inline;padding:2px 4px;border-radius:3px;background:${mermaidBg}}
.math-block{display:block;padding:16px;margin:1em 0;border-radius:6px;background:${mermaidBg};text-align:center;overflow-x:auto}
.mermaid-block{display:block;padding:16px;margin:1em 0;border-radius:6px;background:${mermaidBg};border:1px solid ${borderColor}}
.mermaid-preview{display:flex;justify-content:center;align-items:center}
.mermaid-preview svg{max-width:100%;height:auto}
.mermaid-preview svg .label text,.mermaid-preview svg .nodeLabel text,.mermaid-preview svg .state-title,.mermaid-preview svg .state-description,.mermaid-preview svg .pieTitleText,.mermaid-preview svg .titleText{transform:translateY(-2px)}.mermaid-preview svg .nodeLabel,.mermaid-preview svg .edgeLabel{display:inline-block;position:relative;top:-2px}
</style>
</head><body>${getLiveHTML()}</body></html>`
    api.exportHTML(html)
  })

  api.onNewFile(() => { exitSourceMode(); setMarkdown('') })
  api.onFileChanged((content) => {
    if (sourceModeActive) {
      sourceEl().value = content
    } else {
      setMarkdown(content)
    }
  })
  let pendingThemeChange: string | null = null
  let themeChangeTimer: ReturnType<typeof setTimeout> | null = null

  function applyThemeChange(theme: string): void {
    pendingThemeChange = null
    applyTheme(theme)
    for (const p of getAllPlugins()) p.onThemeChange?.(theme)
    refreshThemeSensitivePlugins()
  }

  api.onSetTheme((theme) => {
    if (themeChangeTimer) clearTimeout(themeChangeTimer)
    pendingThemeChange = theme
    themeChangeTimer = setTimeout(() => {
      if (pendingThemeChange) applyThemeChange(pendingThemeChange)
    }, 50)
  })
  api.onSetCustomCSS((css) => {
    const theme = pendingThemeChange || loadSavedTheme()
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
    if (result) {
      setCachedCustomTheme(result.name, result.css)
      applyTheme(`custom:${result.name}`)
    }
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
        refreshThemeSensitivePlugins()
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
        const p = getAllPlugins().find((x) => x.id === id)
        if (p) {
          togglePlugin(id, !p.enabled)
          const mode = p.enabled ? 'rendered' : 'raw'
          togglePluginMode(p.nodeTypes || [], mode)
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
          {
            const ok = await api.saveFile(getContent())
            if (ok) {
              showToast('Saved')
              restoreRenderedMode(api)
            } else {
              showToast('Save failed')
            }
          }
          break
        case 'save-as':
          syncRawEdits()
          {
            const ok = await api.saveFileAs(getContent())
            if (ok) {
              showToast('Saved')
              restoreRenderedMode(api)
            } else {
              showToast('Save cancelled or failed')
            }
          }
          break
        case 'export-pdf':
          syncRawEdits()
          restoreRenderedMode(api)
          await ensureAllPluginsRendered()
          await new Promise(r => setTimeout(r, 300))
          await api.exportPDF(buildExportHTML())
          setTimeout(() => {
            document.querySelectorAll('.mermaid-loading, .mermaid-error')
              .forEach(el => (el as HTMLElement).style.display = 'none')
          }, 1000)
          break
        case 'export-html':
          syncRawEdits()
          restoreRenderedMode(api)
          await ensureAllPluginsRendered()
          await new Promise(r => setTimeout(r, 200))
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
          if (result) {
            setCachedCustomTheme(result.name, result.css)
            applyTheme(`custom:${result.name}`)
          }
          break
        }
        case 'about':
          api.openExternal('https://github.com/byteuser1977/ColaMD-extend')
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
  const mermaidBg = v('--mermaid-background') || bgColor
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
.mermaid-block{display:block;padding:16px;margin:1em 0;border-radius:6px;background:${mermaidBg};border:1px solid ${borderColor}}
.mermaid-preview{display:flex;justify-content:center;align-items:center}
.mermaid-preview svg{max-width:100%;height:auto}
@page{margin:15mm;size:A4}
@media print{body{max-width:none;margin:0;padding:20px}#editor{position:static!important;overflow:visible!important}}
</style>
</head><body>${getLiveHTML()}</body></html>`
}

// 临时调试：打开 DevTools（确认问题后请删除此行）
if (window.electronAPI) (window as any).electronAPI?.openDevTools?.()
init().catch((e) => console.error('ColaMD init failed:', e))
