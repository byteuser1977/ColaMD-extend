import type { Capacitor } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { App as CapApp } from '@capacitor/app'
import { FilePicker } from '@capawesome/capacitor-file-picker'

const { Capacitor } = await import('@capacitor/core')

export interface CapacitorBridgeAPI {
  openFile: () => Promise<{ path: string; content: string } | null>
  openFilePath: (path: string) => Promise<{ path: string; content: string } | null>
  saveFile: (content: string) => Promise<boolean>
  saveFileAs: (content: string) => Promise<boolean>
  exportPDF: () => Promise<boolean>
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
}

let currentFilePath: string | null = null
const eventListeners: Record<string, Array<(...args: any[]) => void>> = {}

/**
 * 将 base64 编码字符串安全解码为 UTF-8 文本。
 * atob() 仅支持 Latin1，中文等多字节字符会乱码，
 * 因此先解码为 Uint8Array 再通过 TextDecoder 转为 UTF-8。
 * @param base64 base64 编码的字符串
 * @returns 解码后的 UTF-8 文本
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
 * 将文本内容写入文件并通过系统分享对话框分享。
 * 使用 Filesystem.writeFile 写入后，获取 file:// URI，
 * 通过 Share 插件的 files 参数分享给其他应用。
 * @param fileName 文件名
 * @param content 文本内容
 * @returns 分享成功返回 true
 */
async function writeAndShareFile(fileName: string, content: string): Promise<boolean> {
  try {
    await Filesystem.writeFile({
      path: fileName,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    })

    const fileUri = await Filesystem.getUri({
      path: fileName,
      directory: Directory.Documents,
    })

    try {
      await Share.share({
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

/**
 * 触发指定事件的所有监听器。
 * @param event 事件名称
 * @param args 传递给监听器的参数
 */
function emit(event: string, ...args: any[]): void {
  const listeners = eventListeners[event] || []
  listeners.forEach((fn) => fn(...args))
}

/**
 * 检查当前是否运行在原生平台（Android/iOS）。
 * @returns 如果是原生平台返回 true
 */
function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * 从文件路径中提取基本文件名。
 * @param path 文件路径
 * @returns 文件名
 */
function getBaseName(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || 'Untitled'
}

/**
 * 读取指定路径的文件内容。
 * @param filePath 文件路径
 * @returns 文件内容字符串
 */
async function readFileContent(filePath: string): Promise<string> {
  try {
    const result = await Filesystem.readFile({
      path: filePath,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    })
    return result.data as string
  } catch {
    return ''
  }
}

/**
 * 将内容写入指定路径的文件。
 * @param filePath 文件路径
 * @param content 文件内容
 * @returns 写入成功返回 true
 */
async function writeFileContent(filePath: string, content: string): Promise<boolean> {
  try {
    await Filesystem.writeFile({
      path: filePath,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    })
    return true
  } catch {
    return false
  }
}

/**
 * 使用 FilePicker 插件选择并读取文件内容。
 * 适用于 Android/iOS 原生平台。
 * @returns 文件路径和内容，如果取消则返回 null
 */
async function pickAndReadFile(): Promise<{ path: string; content: string } | null> {
  try {
    const result = await FilePicker.pickFiles({
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
      const readResult = await Filesystem.readFile({
        path: file.path,
        encoding: Encoding.UTF8,
      })
      content = readResult.data as string
    }

    currentFilePath = file.path || file.name
    return { path: currentFilePath, content }
  } catch (error) {
    console.warn('File picker cancelled or failed:', error)
    return null
  }
}

/**
 * 使用 FilePicker 插件选择 CSS 文件。
 * @returns 文件名和 CSS 内容
 */
async function pickCSSFile(): Promise<{ name: string; css: string } | null> {
  try {
    const result = await FilePicker.pickFiles({
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
      const readResult = await Filesystem.readFile({
        path: file.path,
        encoding: Encoding.UTF8,
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

    /**
     * 打开文件选择器并读取选中的文件。
     * 在 Web 平台使用原生 input[type=file]，
     * 在原生平台使用 FilePicker 插件。
     */
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

    /**
     * 打开指定路径的文件。
     * @param path 文件路径
     */
    async openFilePath(path: string): Promise<{ path: string; content: string } | null> {
      const content = await readFileContent(path)
      if (!content && content !== '') return null
      currentFilePath = path
      return { path, content }
    },

    /**
     * 保存内容到当前文件。
     * @param content 文件内容
     */
    async saveFile(content: string): Promise<boolean> {
      if (!currentFilePath) {
        return api.saveFileAs(content)
      }
      return writeFileContent(currentFilePath, content)
    },

    /**
     * 另存为功能。
     * @param content 文件内容
     */
    async saveFileAs(content: string): Promise<boolean> {
      const defaultName = currentFilePath ? getBaseName(currentFilePath) : 'untitled.md'

      if (!isNativePlatform()) {
        const blob = new Blob([content], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = defaultName
        a.click()
        URL.revokeObjectURL(url)
        currentFilePath = defaultName
        return true
      }

      const timestamp = Date.now()
      const fileName = `${defaultName.replace(/\.md$/, '')}_${timestamp}.md`
      const ok = await writeFileContent(fileName, content)
      if (ok) currentFilePath = fileName
      return ok
    },

    /**
     * 导出 PDF。
     * Web 平台使用 window.print()；
     * 原生平台将内容导出为 HTML 文件并通过系统分享。
     */
    async exportPDF(): Promise<boolean> {
      if (!isNativePlatform()) {
        window.print()
        return true
      }
      return true
    },

    /**
     * 导出 HTML 文件。
     * Web 平台使用 Blob 下载；
     * 原生平台写入文件后通过 Share 插件分享。
     * @param htmlContent HTML 内容
     */
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

    /**
     * 创建新的幻灯片模板。
     */
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

    /**
     * 以幻灯片模式打开内容。
     * @param _content Markdown 内容
     */
    async openAsSlides(_content: string): Promise<boolean> {
      if (!isNativePlatform()) {
        const newWindow = window.open('', '_blank')
        if (newWindow) {
          newWindow.document.write(`<pre>${_content}</pre>`)
        }
        return !!newWindow
      }
      console.warn('Slides preview uses browser — limited on native')
      return false
    },

    /**
     * 加载自定义主题 CSS 文件。
     * 在原生平台使用 FilePicker 插件选择文件。
     */
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

    /**
     * 加载指定文件名的主题 CSS。
     * @param _fileName CSS 文件名
     */
    async loadThemeCSS(_fileName: string): Promise<string | null> {
      try {
        const result = await Filesystem.readFile({
          path: `.colamd/themes/${_fileName}`,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        })
        return result.data as string
      } catch {
        return null
      }
    },

    /**
     * 获取 File 对象的路径。
     * @param _file File 对象
     */
    getPathForFile(_file: File): string {
      return _file.name || ''
    },

    /**
     * 在外部浏览器中打开 URL。
     * @param url 要打开的 URL
     */
    openExternal(url: string): void {
      if (isNativePlatform()) {
        window.open(url, '_system', 'location=yes')
      } else {
        window.open(url, '_blank')
      }
    },

    /**
     * 注册文件变更监听器。
     * 在原生平台上使用轮询检测文件变更。
     * @param callback 文件变更时的回调函数
     */
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
        await Filesystem.writeFile({
          path: defaultName,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        })

        const fileUri = await Filesystem.getUri({
          path: defaultName,
          directory: Directory.Documents,
        })

        try {
          await Share.share({
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
  }

  return api
}
