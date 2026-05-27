const { Capacitor } = await import('@capacitor/core').catch(() => ({ Capacitor: { isNativePlatform: () => false } }))

/**
 * 懒加载 Capacitor 插件模块缓存。
 * Electron 桌面环境不包含这些模块，仅在原生平台按需动态导入。
 * 注意：必须使用 switch-case 中字符串字面量 import()，而不能用 import(name) 变量形式，
 * 否则 Vite 无法在构建时静态分析，导致生产环境中插件模块加载失败。
 */
const _capModules: Record<string, any> = {}
async function capModule(name: string): Promise<any> {
  if (!(name in _capModules)) {
    try {
      switch (name) {
        case '@capacitor/filesystem': _capModules[name] = await import('@capacitor/filesystem'); break
        case '@capacitor/share': _capModules[name] = await import('@capacitor/share'); break
        case '@capacitor/app': _capModules[name] = await import('@capacitor/app'); break
        case '@capawesome/capacitor-file-picker': _capModules[name] = await import('@capawesome/capacitor-file-picker'); break
        case '@capacitor/haptics': _capModules[name] = await import('@capacitor/haptics'); break
        default: _capModules[name] = null
      }
    }
    catch { _capModules[name] = null }
  }
  return _capModules[name]
}

/**
 * 获取 @capacitor/filesystem 模块（含 Filesystem、Directory、Encoding）。
 */
async function capFS() { return capModule('@capacitor/filesystem') }

/**
 * 获取 @capacitor/share 模块。
 */
async function capShare() { return capModule('@capacitor/share') }

/**
 * 获取 @capawesome/capacitor-file-picker 模块。
 */
async function capPicker() { return capModule('@capawesome/capacitor-file-picker') }

export interface CapacitorBridgeAPI {
  openFile: () => Promise<{ path: string; content: string } | null>
  openFilePath: (path: string) => Promise<{ path: string; content: string } | null>
  setCurrentFile: (path: string) => void
  saveFile: (content: string) => Promise<boolean>
  saveFileAs: (content: string) => Promise<boolean>
  exportPDF: (htmlContent?: string) => Promise<boolean>
  exportHTML: (htmlContent: string) => Promise<boolean>
  newSlides: () => Promise<string | null>
  openAsSlides: (content: string) => Promise<boolean>
  loadCustomTheme: () => Promise<{ name: string; css: string } | null>
  loadThemeCSS: (fileName: string) => Promise<string | null>
  getPathForFile: (_file: File) => string
  openExternal: (url: string) => void
  onFileChanged: (callback: (content: string) => void) => void
  onNewFile: (callback: () => void) => void
  onFileOpened: (callback: (data: { path: string; content: string }) => void) => void
  onMenuOpen: (callback: () => void) => void
  onMenuSave: (callback: () => void) => void
  onMenuSaveAs: (callback: () => void) => void
  onMenuExportPDF: (callback: () => void) => void
  onMenuExportHTML: (callback: () => void) => void
  onMenuNewSlides: (callback: () => void) => void
  onMenuOpenAsSlides: (callback: () => void) => void
  onNewSlidesContent: (callback: (content: string) => void) => void
  onSetTheme: (callback: (theme: string) => void) => void
  onSetCustomCSS: (callback: (css: string) => void) => void
  exportSlides: (content: string) => Promise<boolean>
  onMenuExportSlides: (callback: () => void) => void
  onAgentActivity: (callback: (state: string) => void) => void
  registerPlugins: (plugins: Array<{ id: string; name: string; enabled: boolean }>) => Promise<boolean>
  syncPluginState: (id: string, enabled: boolean) => Promise<void>
  onMenuTogglePlugin: (callback: (id: string) => void) => void
  onMenuImportTheme: (callback: () => void) => void
  exportFile: (dataUrl: string, defaultName: string) => Promise<boolean>
  setLocale: (locale: 'en' | 'zh-CN') => Promise<string>
}

let currentFilePath: string | null = null
const eventListeners: Record<string, Array<(...args: any[]) => void>> = {}

/**
 * 将 base64 编码字符串安全解码为 UTF-8 文本。
 */
function decodeBase64UTF8(base64: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder('utf-8').decode(bytes)
}

/**
 * 写入文件并通过系统分享对话框分享。
 */
async function writeAndShareFile(fileName: string, content: string): Promise<boolean> {
  try {
    const fs = await capFS()
    await fs.Filesystem.writeFile({
      path: fileName,
      data: content,
      directory: fs.Directory.Documents,
      encoding: fs.Encoding.UTF8,
      recursive: true,
    })

    const fileUri = await fs.Filesystem.getUri({
      path: fileName,
      directory: fs.Directory.Documents,
    })

    const sh = await capShare()
    try {
      await sh.Share.share({
        title: fileName,
        text: 'ColaMD Export',
        files: [fileUri.uri],
        dialogTitle: 'Share Export',
      })
    } catch { /* share dialog cancelled */ }
    return true
  } catch (err) {
    console.error('writeAndShareFile failed:', err)
    return false
  }
}

function emit(event: string, ...args: any[]): void {
  const listeners = eventListeners[event] || []
  listeners.forEach((fn) => fn(...args))
}

function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

function getBaseName(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || 'Untitled'
}

/**
 * 从 markdown 内容中提取第一个标题作为文件名。
 * 如果没有标题则使用默认名称。
 */
function generateFilename(content: string, ext: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  if (match) {
    const title = match[1].replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 50)
    if (title) return `${title}.${ext}`
  }
  const ts = Date.now()
  return `untitled_${ts}.${ext}`
}

/**
 * 读取指定路径的文件内容。
 */
async function readFileContent(filePath: string): Promise<string> {
  try {
    const fs = await capFS()
    const result = await fs.Filesystem.readFile({
      path: filePath,
      directory: fs.Directory.Documents,
      encoding: fs.Encoding.UTF8,
    })
    return result.data as string
  } catch {
    return ''
  }
}

/**
 * 将内容写入指定路径的文件。
 */
async function writeFileContent(filePath: string, content: string): Promise<boolean> {
  try {
    const fs = await capFS()
    await fs.Filesystem.writeFile({
      path: filePath,
      data: content,
      directory: fs.Directory.Documents,
      encoding: fs.Encoding.UTF8,
      recursive: true,
    })
    return true
  } catch (err) {
    console.error('writeFileContent failed:', err)
    return false
  }
}

/**
 * 触发原生平台触觉反馈。
 * 使用已安装的 @capacitor/haptics 插件。
 */
async function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
  if (!isNativePlatform()) return
  try {
    const { Haptics } = await import('@capacitor/haptics')
    if (style === 'heavy') await Haptics.impact({ style: 'HEAVY' as any })
    else if (style === 'medium') await Haptics.impact({ style: 'MEDIUM' as any })
    else await Haptics.impact({ style: 'LIGHT' as any })
  } catch { /* haptics not available */ }
}

/**
 * 使用 FilePicker 插件选择并读取文件内容。
 */
async function pickAndReadFile(): Promise<{ path: string; content: string } | null> {
  try {
    const picker = await capPicker()
    const result = await picker.FilePicker.pickFiles({
      types: [
        'text/markdown',
        'text/plain',
        'application/octet-stream',
        'text/x-markdown',
      ],
      multiple: false,
      readData: true,
    })

    const file = result.files[0]
    if (!file) return null

    let content = ''
    if (file.data) {
      content = decodeBase64UTF8(file.data)
    } else if (file.path) {
      const fs = await capFS()
      const readResult = await fs.Filesystem.readFile({
        path: file.path,
        encoding: fs.Encoding.UTF8,
      })
      content = readResult.data as string
    }

    const filePath = file.path || file.name
    currentFilePath = filePath
    return { path: filePath, content }
  } catch (error) {
    console.warn('File picker cancelled or failed:', error)
    return null
  }
}

/**
 * 使用 FilePicker 插件选择 CSS 文件。
 */
async function pickCSSFile(): Promise<{ name: string; css: string } | null> {
  try {
    const picker = await capPicker()
    const result = await picker.FilePicker.pickFiles({
      types: ['text/css'],
      multiple: false,
      readData: true,
    })

    const file = result.files[0]
    if (!file) return null

    let css = ''
    if (file.data) {
      css = decodeBase64UTF8(file.data)
    } else if (file.path) {
      const fs = await capFS()
      const readResult = await fs.Filesystem.readFile({
        path: file.path,
        encoding: fs.Encoding.UTF8,
      })
      css = readResult.data as string
    }

    return { name: file.name, css }
  } catch (error) {
    console.warn('CSS file picker cancelled or failed:', error)
    return null
  }
}

export function createCapacitorAPI(): CapacitorBridgeAPI {
  const api: CapacitorBridgeAPI = {

    async openFile(): Promise<{ path: string; content: string } | null> {
      if (!isNativePlatform()) {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.md,.markdown,.mdown,.mkd,.txt'
        return new Promise((resolve) => {
          input.onchange = async () => {
            const file = input.files?.[0]
            if (!file) { resolve(null); return }
            const content = await file.text()
            currentFilePath = file.name
            resolve({ path: file.name, content })
            input.remove()
          }
          input.click()
        })
      }
      return pickAndReadFile()
    },

    async openFilePath(path: string): Promise<{ path: string; content: string } | null> {
      const content = await readFileContent(path)
      if (!content && content !== '') return null
      currentFilePath = path
      return { path, content }
    },

    setCurrentFile(path: string): void {
      currentFilePath = path
    },

    async saveFile(content: string): Promise<boolean> {
      if (!currentFilePath) {
        // First save: generate a filename and write directly.
        // Don't call saveFileAs — its prompt() is unreliable on Android WebView.
        const fileName = generateFilename(content, 'md')
        const ok = await writeFileContent(fileName, content)
        if (ok) {
          currentFilePath = fileName
          triggerHaptic('medium')
        }
        return ok
      }
      const ok = await writeFileContent(currentFilePath, content)
      if (ok) triggerHaptic('light')
      return ok
    },

    async saveFileAs(content: string): Promise<boolean> {
      const baseName = currentFilePath
        ? getBaseName(currentFilePath).replace(/\.md$/, '')
        : 'untitled'
      const fileName = `${baseName}_${Date.now()}.md`

      if (!isNativePlatform()) {
        const blob = new Blob([content], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        a.click()
        URL.revokeObjectURL(url)
        currentFilePath = fileName
        return true
      }

      // Android: write file then open Share sheet so user can save to preferred location
      const ok = await writeFileContent(fileName, content)
      if (!ok) {
        triggerHaptic('heavy')
        return false
      }

      currentFilePath = fileName
      triggerHaptic('medium')

      try {
        const fs = await capFS()
        const fileUri = await fs.Filesystem.getUri({
          path: fileName,
          directory: fs.Directory.Documents,
        })
        const sh = await capShare()
        await sh.Share.share({
          title: fileName,
          text: 'ColaMD Document',
          files: [fileUri.uri],
          dialogTitle: 'Save As',
        })
      } catch { /* share cancelled — file already saved */ }
      return true
    },

    async exportPDF(htmlContent?: string): Promise<boolean> {
      if (!isNativePlatform()) {
        window.print()
        return true
      }

      // Android: use native PrintManager via ColaMDNative bridge.
      // This opens the system print dialog with "Save as PDF" option
      // and produces proper paginated PDF output.
      const bridge = (window as any).ColaMDNative
      if (bridge && typeof bridge.printDocument === 'function') {
        // Temporarily unconstrain the fixed-position mobile layout so
        // the full document is captured, not just the visible viewport.
        const orig: { el: HTMLElement; cssText: string }[] = []

        function saveAndOverride(selector: string, overrides: Record<string, string>): void {
          const el = document.querySelector(selector) as HTMLElement | null
          if (!el) return
          orig.push({ el, cssText: el.style.cssText })
          for (const [prop, value] of Object.entries(overrides)) {
            ;(el.style as any)[prop] = value
          }
        }

        // Hide mobile UI chrome, unconstrain editor for full-document capture
        saveAndOverride('#titlebar', { display: 'none' })
        saveAndOverride('#mobile-menu', { display: 'none' })
        saveAndOverride('#menu-btn', { display: 'none' })
        saveAndOverride('.cola-toast', { display: 'none' })
        saveAndOverride('html', { height: 'auto', overflow: 'visible' })
        saveAndOverride('body', { height: 'auto', overflow: 'visible' })
        saveAndOverride('#editor', {
          position: 'static',
          height: 'auto',
          overflow: 'visible',
          top: 'auto',
          bottom: 'auto',
        })
        saveAndOverride('#editor .ProseMirror', { minHeight: 'auto' })

        await new Promise(r => requestAnimationFrame(r))

        const jobName = currentFilePath
          ? getBaseName(currentFilePath).replace(/\.(md|markdown)$/, '')
          : 'ColaMD Document'
        bridge.printDocument(jobName)

        // Restore layout after print adapter captures the content.
        // The 3s delay gives the Android print framework time to snapshot.
        setTimeout(() => {
          for (const { el, cssText } of orig) {
            el.style.cssText = cssText
          }
        }, 3000)

        return true
      }

      // Fallback: if native bridge unavailable, share as HTML file
      const content = htmlContent || ''
      if (!content) return false
      const defaultName = currentFilePath
        ? getBaseName(currentFilePath).replace(/\.(md|markdown)$/, '-print.html')
        : 'colamd-print.html'
      return writeAndShareFile(defaultName, content)
    },

    async exportHTML(htmlContent: string): Promise<boolean> {
      const defaultName = currentFilePath
        ? getBaseName(currentFilePath).replace(/\.(md|markdown)$/, '.html')
        : 'colamd-export.html'

      if (!isNativePlatform()) {
        const blob = new Blob([htmlContent], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = defaultName
        a.click()
        URL.revokeObjectURL(url)
        return true
      }

      return writeAndShareFile(defaultName, htmlContent)
    },

    async newSlides(): Promise<string | null> {
      const template = `---
kicker: ColaMD
chip: Markdown Editor · 2026
page: Your Name
---

<!-- type: cover -->
# Welcome to ColaMD
Agent Native Markdown Editor

---

<!-- type: statement -->
## Start Writing
Edit this file in ColaMD and see your changes in real time.
`
      return template
    },

    async openAsSlides(content: string): Promise<boolean> {
      if (!isNativePlatform()) {
        const newWindow = window.open('', '_blank')
        if (newWindow) {
          newWindow.document.write(`<pre>${content}</pre>`)
        }
        return !!newWindow
      }
      return writeAndShareFile('colamd-slides-preview.html', content)
    },

    async loadCustomTheme(): Promise<{ name: string; css: string } | null> {
      if (!isNativePlatform()) {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.css'
        return new Promise((resolve) => {
          input.onchange = async () => {
            const file = input.files?.[0]
            if (!file) { resolve(null); return }
            const css = await file.text()
            resolve({ name: file.name, css })
            input.remove()
          }
          input.click()
        })
      }
      return pickCSSFile()
    },

    async loadThemeCSS(_fileName: string): Promise<string | null> {
      try {
        const fs = await capFS()
        const result = await fs.Filesystem.readFile({
          path: `.colamd/themes/${_fileName}`,
          directory: fs.Directory.Documents,
          encoding: fs.Encoding.UTF8,
        })
        return result.data as string
      } catch {
        return null
      }
    },

    getPathForFile(_file: File): string {
      return _file.name || ''
    },

    openExternal(url: string): void {
      if (isNativePlatform()) {
        window.open(url, '_system', 'location=yes')
      } else {
        window.open(url, '_blank')
      }
    },

    onFileChanged(callback: (content: string) => void): void {
      eventListeners['file-changed'] = eventListeners['file-changed'] || []
      eventListeners['file-changed'].push(callback)

      if (!isNativePlatform()) return
      let lastContent = ''
      let watcherTimer: ReturnType<typeof setInterval> | null = null

      const pollChanges = async (): Promise<void> => {
        if (!currentFilePath) return
        try {
          const content = await readFileContent(currentFilePath)
          if (content !== lastContent && content) {
            lastContent = content
            emit('file-changed', content)
          }
        } catch { /* ignore */ }
      }

      if (!watcherTimer) {
        watcherTimer = setInterval(pollChanges, 2000)
      }
    },

    onNewFile(callback: () => void): void {
      eventListeners['new-file'] = eventListeners['new-file'] || []
      eventListeners['new-file'].push(callback)
    },

    onFileOpened(callback: (data: { path: string; content: string }) => void): void {
      eventListeners['file-opened'] = eventListeners['file-opened'] || []
      eventListeners['file-opened'].push(callback)
    },

    onMenuOpen(callback: () => void): void {
      eventListeners['menu-open'] = eventListeners['menu-open'] || []
      eventListeners['menu-open'].push(callback)
    },

    onMenuSave(callback: () => void): void {
      eventListeners['menu-save'] = eventListeners['menu-save'] || []
      eventListeners['menu-save'].push(callback)
    },

    onMenuSaveAs(callback: () => void): void {
      eventListeners['menu-save-as'] = eventListeners['menu-save-as'] || []
      eventListeners['menu-save-as'].push(callback)
    },

    onMenuExportPDF(callback: () => void): void {
      eventListeners['menu-export-pdf'] = eventListeners['menu-export-pdf'] || []
      eventListeners['menu-export-pdf'].push(callback)
    },

    onMenuExportHTML(callback: () => void): void {
      eventListeners['menu-export-html'] = eventListeners['menu-export-html'] || []
      eventListeners['menu-export-html'].push(callback)
    },

    onMenuNewSlides(callback: () => void): void {
      eventListeners['menu-new-slides'] = eventListeners['menu-new-slides'] || []
      eventListeners['menu-new-slides'].push(callback)
    },

    onMenuOpenAsSlides(callback: () => void): void {
      eventListeners['menu-open-as-slides'] = eventListeners['menu-open-as-slides'] || []
      eventListeners['menu-open-as-slides'].push(callback)
    },

    onNewSlidesContent(callback: (content: string) => void): void {
      eventListeners['new-slides-content'] = eventListeners['new-slides-content'] || []
      eventListeners['new-slides-content'].push(callback)
    },

    onSetTheme(callback: (theme: string) => void): void {
      eventListeners['set-theme'] = eventListeners['set-theme'] || []
      eventListeners['set-theme'].push(callback)
    },

    onSetCustomCSS(callback: (css: string) => void): void {
      eventListeners['set-custom-css'] = eventListeners['set-custom-css'] || []
      eventListeners['set-custom-css'].push(callback)
    },

    async exportSlides(content: string): Promise<boolean> {
      const defaultName = 'colamd-slides.html'
      if (!isNativePlatform()) {
        const blob = new Blob([content], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = defaultName
        a.click()
        URL.revokeObjectURL(url)
        return true
      }
      return writeAndShareFile(defaultName, content)
    },

    onMenuExportSlides(callback: () => void): void {
      eventListeners['menu-export-slides'] = eventListeners['menu-export-slides'] || []
      eventListeners['menu-export-slides'].push(callback)
    },

    onAgentActivity(callback: (state: string) => void): void {
      eventListeners['agent-activity'] = eventListeners['agent-activity'] || []
      eventListeners['agent-activity'].push(callback)
    },

    async registerPlugins(_plugins: Array<{ id: string; name: string; enabled: boolean }>): Promise<boolean> {
      localStorage.setItem('colamd-plugins', JSON.stringify(_plugins))
      return true
    },

    async syncPluginState(_id: string, _enabled: boolean): Promise<void> {
      const raw = localStorage.getItem('colamd-plugins') || '[]'
      const plugins = JSON.parse(raw)
      const p = plugins.find((x: { id: string }) => x.id === _id)
      if (p) p.enabled = _enabled
      localStorage.setItem('colamd-plugins', JSON.stringify(plugins))
    },

    onMenuTogglePlugin(callback: (id: string) => void): void {
      eventListeners['menu-toggle-plugin'] = eventListeners['menu-toggle-plugin'] || []
      eventListeners['menu-toggle-plugin'].push(callback)
    },

    onMenuImportTheme(callback: () => void): void {
      eventListeners['menu-import-theme'] = eventListeners['menu-import-theme'] || []
      eventListeners['menu-import-theme'].push(callback)
    },

    async exportFile(dataUrl: string, defaultName: string): Promise<boolean> {
      if (!isNativePlatform()) {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = defaultName
        a.click()
        return true
      }

      const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, '')
      try {
        const fs = await capFS()
        await fs.Filesystem.writeFile({
          path: defaultName,
          data: base64Data,
          directory: fs.Directory.Documents,
          recursive: true,
        })

        const fileUri = await fs.Filesystem.getUri({
          path: defaultName,
          directory: fs.Directory.Documents,
        })

        const sh = await capShare()
        try {
          await sh.Share.share({
            title: defaultName,
            files: [fileUri.uri],
            dialogTitle: 'Share Export',
          })
        } catch { /* cancelled */ }
        return true
      } catch {
        return false
      }
    },

    /**
     * 设置语言（移动端仅本地存储，无 Electron 菜单需要更新）
     */
    async setLocale(locale: 'en' | 'zh-CN'): Promise<string> {
      try {
        localStorage.setItem('colamd-locale', locale)
      } catch { /* ignore */ }

      return locale
    },
  }

  return api
}