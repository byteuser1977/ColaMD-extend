/**
 * Capacitor 移动端替身：在 Android WebView 里顶替 window.electronAPI。
 *
 * 2.x 的渲染层只认 ElectronAPI 一个接口（preload/index.ts），本文件按同一形状
 * 提供移动端实现：文件通道走 Capacitor Filesystem/FilePicker，导出走原生桥
 * （MainActivity 的 ColaMDNativeBridge），没有原生触发源的事件（菜单、更新、字体）
 * 注册后不触发，等价于「功能不存在」而不是「报错」。
 *
 * 接入（main.ts 顶部同步调用）：installCapacitorAPI() —— Electron 环境直接返回，
 * 原生环境且 electronAPI 缺位时挂上替身。桌面构建也会打进这个模块，但
 * @capacitor/core 的运行时开销只有一次 isNativePlatform() 判断。
 */
import type { ElectronAPI, FileManagerName, SiblingFile } from '../preload/index'
import { Capacitor } from '@capacitor/core'

/** 是否跑在 Capacitor 原生壳里（Android/iOS WebView）。 */
function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

/** 是否跑在 Android 壳里：只看 UA，不依赖 Capacitor 的初始化时序。 */
export function isAndroidApp(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
}

/** 移动端文档根目录：Documents 下的 colamd/，路径字段统一用相对它的虚拟路径。 */
const DOCS_DIR = 'colamd'

/** 菜单等主进程事件的总线：移动端暂时没有触发源，先留好接线。 */
const listeners = new Map<string, Set<(payload: unknown) => void>>()
function onEvent<T>(tag: string, cb: (payload: T) => void): void {
  if (!listeners.has(tag)) listeners.set(tag, new Set())
  listeners.get(tag)!.add(cb as (payload: unknown) => void)
}
function emitEvent(tag: string, payload: unknown): void {
  listeners.get(tag)?.forEach((cb) => cb(payload))
}

/** onFileOpened 注册前的 Intent 内容缓冲（对齐 preload 的 pendingFileOpened 机制）。 */
type FileOpenedData = { path: string | null; content: string; fileUrl: string | null }
const pendingFileOpened: FileOpenedData[] = []
function emitFileOpened(name: string, content: string): void {
  const data: FileOpenedData = { path: `${DOCS_DIR}/${name}`, content, fileUrl: null }
  if (listeners.get('file-opened')?.size) emitEvent('file-opened', data)
  else pendingFileOpened.push(data)
}

/** 原生桥回调的 promise 化：MainActivity 通过 evaluateJavascript 调它。 */
const nativeResolvers = new Map<string, (payload: Record<string, unknown>) => void>()
;(
  window as unknown as { __colamdNativeResult?: (tag: string, payload: Record<string, unknown>) => void }
).__colamdNativeResult = (tag, payload) => {
  const resolve = nativeResolvers.get(tag)
  if (resolve) {
    nativeResolvers.delete(tag)
    resolve(payload)
  }
}
function callNative<T extends Record<string, unknown>>(tag: string): Promise<T> {
  return new Promise((resolve) => nativeResolvers.set(tag, resolve as (p: Record<string, unknown>) => void))
}

/** 原生打印桥（MainActivity 注入的 ColaMDNative）。 */
function nativeBridge(): { printDocument: (job: string) => void; printToFile: (job: string) => void; pdfToImage: (pdf: string, out: string, scale: number) => void } | null {
  const bridge = (window as unknown as Record<string, unknown>).ColaMDNative as
    | { printDocument?: unknown; printToFile?: unknown; pdfToImage?: unknown }
    | undefined
  if (!bridge || typeof bridge.printDocument !== 'function') return null
  return bridge as never
}

/**
 * 渲染层日志走原生 logcat。release 包没有控制台，桌面版把错误写文件，
 * 移动端写 Log.e，用 `adb logcat -s ColaMD` 就能看到。
 */
function nativeLog(message: string): void {
  try {
    const bridge = (window as unknown as Record<string, unknown>).ColaMDNative as
      | { log?: (value: string) => void }
      | undefined
    bridge?.log?.(message)
  } catch {
    /* 桥不可用就算了，不能因为打日志再抛错 */
  }
  console.error('[ColaMD]', message)
}

/**
 * 打印布局改造：导出 PDF 前把移动端 UI 收起来、解除固定高度，
 * 让 Chromium 打印管线捕获完整文档而不是可视视口。返回恢复函数。
 * 照 1.5.2 的做法，等两帧再触发打印、3 秒后再恢复，给打印框架留出快照时间。
 */
function enterPrintLayout(): () => void {
  const undo: { el: HTMLElement; cssText: string }[] = []
  const override = (selector: string, styles: Record<string, string>): void => {
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      undo.push({ el, cssText: el.style.cssText })
      Object.assign(el.style, styles)
    })
  }
  override('#titlebar, #file-panel, #panel-resizer, #hover-tip, .cola-toast, #update-banner', { display: 'none' })
  override('html, body', { height: 'auto', overflow: 'visible' })
  override('#editor-region', {
    width: '100%',
    height: 'auto',
    marginLeft: '0',
    overflow: 'visible',
  })
  override('#editor, .cm-editor, .cm-scroller', { height: 'auto', overflow: 'visible' })
  return () => undo.forEach(({ el, cssText }) => (el.style.cssText = cssText))
}

/** 导出用的文件名：取当前文档名（去掉扩展名），没有就退回 ColaMD。 */
function exportBaseName(): string {
  const title = (document.title || '').trim()
  if (!title || title === 'ColaMD' || title === '未命名' || title === 'Untitled') return 'ColaMD'
  return title.replace(/\.(md|markdown|mdown|mkd|txt)$/i, '')
}

function isChinese(): boolean {
  return (navigator.language || '').toLowerCase().startsWith('zh')
}

/** 未命名文档第一次保存时的文件名（不含扩展名）。 */
function defaultBaseName(): string {
  const d = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  return `${isChinese() ? '未命名' : 'Untitled'}-${stamp}`
}

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 把文件交给系统分享面板；用户取消或没有分享能力都不算落盘失败。 */
async function shareFile(f: FilesystemModule, path: string, title: string): Promise<void> {
  try {
    const uri = await f.Filesystem.getUri({ path, directory: f.Directory.Documents })
    const share = await capModule<ShareModule>('@capacitor/share')
    if (share) await share.Share.share({ title, files: [uri.uri] })
  } catch {
    /* 文件已经在 Documents 里 */
  }
}

/** 懒加载 Capacitor 插件。字符串字面量 import() 保证 Vite 静态分析可拆 chunk。 */
type FilePickerModule = {
  FilePicker: {
    pickFiles: (o: unknown) => Promise<{ files: { path?: string; name: string; blob?: Blob }[] }>
  }
}
type FilesystemModule = {
  Filesystem: typeof import('@capacitor/filesystem').Filesystem
  Directory: typeof import('@capacitor/filesystem').Directory
  Encoding: typeof import('@capacitor/filesystem').Encoding
}
type ShareModule = { Share: { share: (o: unknown) => Promise<unknown> } }

async function capModule<T = unknown>(name: string): Promise<T | null> {
  try {
    switch (name) {
      case '@capacitor/filesystem':
        return (await import('@capacitor/filesystem')) as T
      case '@capacitor/share':
        return (await import('@capacitor/share')) as T
      case '@capacitor/app':
        return (await import('@capacitor/app')) as T
      case '@capawesome/capacitor-file-picker':
        return (await import('@capawesome/capacitor-file-picker')) as T
      default:
        return null
    }
  } catch {
    return null
  }
}

/** 读写都落在 Documents/colamd/ 下；path 字段用相对它的虚拟路径（如 colamd/note.md）。 */
async function fs(): Promise<FilesystemModule | null> {
  return capModule<FilesystemModule>('@capacitor/filesystem')
}

function createCapacitorAPI(): ElectronAPI {
  const noop = (): void => {}
  const noopTrue = async (): Promise<boolean> => true
  const noopVoid = async (): Promise<void> => {}
  const noopNull = async (): Promise<null> => null

  const api: ElectronAPI = {
    // ── 文件通道（真实现：Documents/colamd/ 虚拟路径） ──
    openFile: async () => {
      const picker = await capModule<FilePickerModule>('@capawesome/capacitor-file-picker')
      if (!picker) return null
      const picked = await picker.FilePicker.pickFiles({ types: ['text/markdown', 'text/plain'], multiple: false, readData: true })
      const file = picked.files[0]
      if (!file) return null
      let content = ''
      if (file.blob) content = await file.blob.text()
      else if (file.path) {
        const f = await fs()
        if (!f) return null
        content = (await f.Filesystem.readFile({ path: file.path, directory: f.Directory.Cache })).data as string
      }
      const name = file.name || 'document.md'
      // 桌面版由主进程广播 file-opened；移动端 select 完直接在这里补一次，
      // 渲染层只认这个事件（菜单里的「打开文件」靠它载入内容）。
      emitFileOpened(name, content)
      return { path: `${DOCS_DIR}/${name}`, content }
    },
    openFilePath: async (path: string) => {
      const f = await fs()
      if (!f) return null
      try {
        const data = (await f.Filesystem.readFile({ path, directory: f.Directory.Documents })).data as string
        return { path, content: data }
      } catch {
        return null
      }
    },
    getFileManagerName: async () => 'system' as FileManagerName,
    revealFile: noopTrue,
    showEntryContextMenu: noopVoid,
    showTabContextMenu: noopVoid,
    onTabMenuAction: (cb) => onEvent('tab-menu-action', cb),
    listSiblings: async () => {
      const f = await fs()
      if (!f) return null
      try {
        const result = await f.Filesystem.readdir({ path: DOCS_DIR, directory: f.Directory.Documents })
        return result.files
          .filter((fi) => !fi.name.startsWith('.') && fi.name !== 'exports')
          .map<SiblingFile>((fi) => ({
            name: fi.name,
            path: `${DOCS_DIR}/${fi.name}`,
            kind: fi.type === 'directory' ? 'directory' : 'file',
          }))
      } catch {
        return [] // 目录还没建：空列表
      }
    },
    listDirectory: async () => null, // 移动端不做任意目录浏览
    openSibling: async () => false, // 面板打开由 UI 层负责，桌面语义在移动端退化为无操作
    activateFile: async (path) => {
      if (!path) return { content: '', fileUrl: '', mtime: Date.now() }
      const f = await fs()
      if (!f) return null
      try {
        const data = (await f.Filesystem.readFile({ path, directory: f.Directory.Documents })).data as string
        const stat = await f.Filesystem.stat({ path, directory: f.Directory.Documents })
        // fileUrl 给空串：WebView 里 file:// 图片要过 convertFileSrc 绝对路径，
        // 虚拟路径拿不到，图片显示阶段 2 用 Filesystem 读 data URL 解决
        return { content: data, fileUrl: '', mtime: stat.mtime * 1000 }
      } catch {
        return null
      }
    },
    setTabFiles: noop,
    fileUrl: async () => '',
    onFocusFile: (cb) => onEvent('focus-file', cb),
    onOpenInNewTab: (cb) => onEvent('open-in-new-tab', cb),
    saveFile: async (content, expectedPath) => {
      const f = await fs()
      if (!f) return null
      // 渲染层对未命名文档传的是空串（''），不能用 ?? 判断：'' 会被当成合法路径，
      // writeFile 收到空 path 直接失败，保存看起来「没反应」。
      const target = expectedPath && expectedPath.trim() ? expectedPath : `${DOCS_DIR}/${defaultBaseName()}.md`
      try {
        await f.Filesystem.writeFile({ path: target, directory: f.Directory.Documents, data: content, encoding: f.Encoding.UTF8, recursive: true })
        nativeLog(`saveFile ok: ${target}`)
        return target
      } catch (e) {
        nativeLog(`saveFile failed: ${target} ${String(e)}`)
        return null
      }
    },
    saveFileAs: async (content, expectedPath) => {
      const f = await fs()
      if (!f) return null
      const existing = (expectedPath || '').split('/').pop()?.replace(/\.(md|markdown|mdown|mkd|txt)$/i, '') || ''
      const base = existing || defaultBaseName()
      const name = `${base.replace(/[\\/:*?"<>|]/g, '_')}-${Date.now()}.md`
      const target = `${DOCS_DIR}/${name.replace(/[\\/:*?"<>|]/g, '_')}`
      try {
        await f.Filesystem.writeFile({ path: target, directory: f.Directory.Documents, data: content, encoding: f.Encoding.UTF8, recursive: true })
      } catch (e) {
        nativeLog(`saveFileAs failed: ${target} ${String(e)}`)
        return null
      }
      // 和 1.5.2 一致：写完再弹系统分享，用户可以把它存到自己想放的位置
      await shareFile(f, target, name)
      return target
    },
    exportPDF: async () => {
      const bridge = nativeBridge()
      if (!bridge) return false
      const restore = enterPrintLayout()
      try {
        // 等两帧让布局改动生效，打印框架才拿得到完整文档而不是可视视口
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })
        bridge.printDocument(exportBaseName())
        return true // 弹系统打印对话框（含"保存为 PDF"），结果由系统接管
      } finally {
        // 打印对话框是异步快照，恢复太早会让纸上只剩一屏（1.5.2 实测 3 秒）
        setTimeout(restore, 3000)
      }
    },
    exportHTML: async (snapshot) => {
      const f = await fs()
      if (!f) return false
      const base = exportBaseName().replace(/[\\/:*?"<>|]/g, '_')
      const fileName = `${base}-${Date.now()}.html`
      const target = `${DOCS_DIR}/exports/${fileName}`
      const title = escapeHTML(base)
      // 与桌面版同一份结构：优先语义化文档，样式随包，独立可打开
      const renderedContent = snapshot.document || snapshot.html || `<pre>${escapeHTML(snapshot.content)}</pre>`
      const documentHTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>${snapshot.styles || ''}
    html, body { height: auto; overflow: visible; }
    body { min-width: 320px; }
    #titlebar, #file-panel { display: none !important; }
    #editor { height: auto !important; min-height: 100vh; overflow: visible !important; padding: 0 !important; }
  </style>
</head>
<body class="${escapeHTML(snapshot.bodyClass || '')}">
  <article class="colamd-document">${renderedContent}</article>
</body>
</html>
`
      try {
        await f.Filesystem.writeFile({ path: target, directory: f.Directory.Documents, data: documentHTML, encoding: f.Encoding.UTF8, recursive: true })
      } catch (e) {
        nativeLog(`exportHTML failed: ${target} ${String(e)}`)
        return false
      }
      await shareFile(f, target, fileName)
      return true
    },
    exportDOCX: async () => false, // 移动端第一版不做 Word 导出
    renderMathImages: async () => [],
    renderHtmlImages: async () => [],
    exportImage: async (_snapshot, _preset) => {
      const bridge = nativeBridge()
      if (!bridge) return false
      const restore = enterPrintLayout()
      try {
        // resolver 先注册（同步），再触发原生，最后 await 回调——顺序不能反
        const printedP = callNative<{ ok: boolean; path?: string }>('printToFile')
        bridge.printToFile(document.title || 'ColaMD Document')
        const printed = await printedP
        if (!printed.ok || !printed.path) return false
        const out = printed.path.replace(/\.pdf$/, '.png')
        const renderedP = callNative<{ ok: boolean; path?: string }>('pdfToImage')
        bridge.pdfToImage(printed.path, out, 2)
        const rendered = await renderedP
        if (!rendered.ok) return false
        const share = await capModule<ShareModule>('@capacitor/share')
        if (share) await share.Share.share({ title: document.title, url: Capacitor.convertFileSrc(rendered.path!) })
        return true
      } finally {
        setTimeout(restore, 500)
      }
    },
    getLanguage: async () => (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'),
    onLanguageChanged: (cb) => onEvent('language-changed', cb),
    loadCustomTheme: noopNull,
    loadThemeCSS: async () => null,
    reportTheme: noopVoid,
    reportTitlebarColors: noopVoid,
    popupAppMenu: async () => showMobileMenu(),
    onFullscreenChange: (cb) => onEvent('fullscreen-change', cb),
    getPathForFile: (file) => file.name, // WebView 的 File 没有真实路径，交给上层按未保存文件处理
    openExternal: (url) => void window.open(url, '_blank'),
    onFileChanged: (cb) => onEvent('file-changed', cb),
    onNewFile: (cb) => onEvent('new-file', cb),
    // Intent 打开的内容可能早于渲染层注册到达，先缓冲、注册时补发
    onFileOpened: (cb) => {
      onEvent('file-opened', cb)
      const buffered = pendingFileOpened.splice(0)
      buffered.forEach((data) => cb(data))
    },
    onMenuOpen: (cb) => onEvent('menu-open', cb),
    onMenuSave: (cb) => onEvent('menu-save', cb),
    onMenuSaveAs: (cb) => onEvent('menu-save-as', cb),
    onMenuNewTab: (cb) => onEvent('menu-new-tab', cb),
    onMenuCloseTab: (cb) => onEvent('menu-close-tab', cb),
    onMenuExportPDF: (cb) => onEvent('menu-export-pdf', cb),
    onMenuExportHTML: (cb) => onEvent('menu-export-html', cb),
    onMenuExportDOCX: (cb) => onEvent('menu-export-docx', cb),
    onMenuExportImage: (cb) => onEvent('menu-export-image', cb),
    onMenuPlaySlideshow: (cb) => onEvent('menu-play-slideshow', cb),
    setSlideshowFullscreen: async () => false,
    onSetTheme: (cb) => onEvent('set-theme', cb),
    onSetPanelSide: (cb) => onEvent('set-panel-side', cb),
    reportPanelSide: noopVoid,
    onSetPageWidth: (cb) => onEvent('set-page-width', cb),
    reportPageWidth: noopVoid,
    onSetCustomCSS: (cb) => onEvent('set-custom-css', cb),
    onMenuImportTheme: (cb) => onEvent('menu-import-theme', cb),
    onSearch: (cb) => onEvent('search', cb),
    onFormatCommand: (cb) => onEvent('format-command', cb),
    readClipboardText: async () => (await navigator.clipboard.readText().catch(() => '')) ?? '',
    onSiblingsChanged: (cb) => onEvent('siblings-changed', cb),
    onToggleFilePanel: (cb) => onEvent('toggle-file-panel', cb),
    onToggleSourceMode: (cb) => onEvent('toggle-source-mode', cb),
    setEditorFont: noopVoid,
    listSystemFonts: async () => [], // 移动端固定 WebView 字体，不做系统字体枚举
    onEditorFontChanged: (cb) => onEvent('editor-font-changed', cb),
    onOpenFontSettings: (cb) => onEvent('open-font-settings', cb),
    onStepFont: (cb) => onEvent('step-font', cb),
    reportExternalConflict: noopVoid,
    onExternalConflictResult: (cb) => onEvent('external-conflict-result', cb),
    revealPath: async () => false,
    onUpdateAvailable: (cb) => onEvent('update-available', cb),
    onUpdateDownloaded: (cb) => onEvent('update-downloaded', cb),
    onUpdateProgress: (cb) => onEvent('update-progress', cb),
    onUpdateError: (cb) => onEvent('update-error', cb),
    downloadUpdate: noopVoid,
    installUpdate: noopVoid,
    reportDirty: noop,
    reportRendererReady: () => nativeLog('renderer ready'),
    closeWindow: noopVoid, // 移动端由系统返回键管理（@capacitor/app backButton，阶段 2 接）
    logRendererError: async (message) => nativeLog(`renderer error: ${String(message)}`),
    onRequestDocumentState: (cb) => onEvent('request-document-state', cb),
    respondDocumentState: noop,
  }
  return api
}

/**
 * 挂载入口：Electron 环境什么都不做；原生 WebView 里 electronAPI 缺位时挂替身。
 * 在 main.ts 模块加载的最顶部同步调用，保证后续任何 electronAPI 触达都已就绪。
 */
export function installCapacitorAPI(): void {
  if (!isNativePlatform()) return
  if (window.electronAPI) return
  window.electronAPI = createCapacitorAPI()
}

/** 供移动端菜单 UI（阶段 2）主动触发主进程式事件：emitCapacitorEvent('menu-save') */
export function emitCapacitorEvent(tag: string, payload?: unknown): void {
  emitEvent(tag, payload)
}

/** Intent 轮询间隔：只在 Android 壳里跑，一次调用就是一次桥查询。 */
const INTENT_POLL_MS = 2000

/**
 * 轮询原生桥的 Intent 待开文件（MainActivity handleIntent 缓存，checkPendingFile
 * 一次性取走）。照 1.5.2 的做法：启动后立刻查一次，之后持续按固定间隔查。
 * 文件可能在应用已经运行时才由 onNewIntent 送达，查空一次就停会漏掉这种打开
 * （release 版实测：先启动应用、再从文件管理器点 .md 没有载入内容）。
 * 注册 onFileOpened 的渲染层代码要等文档初始化跑完，内容早到就由缓冲补发。
 */
export function startIntentPolling(): void {
  if (!isNativePlatform()) return // 桌面版没有 ColaMDNative 桥，不必轮询
  const check = (): void => {
    const bridge = (window as unknown as Record<string, unknown>).ColaMDNative as
      | { checkPendingFile?: () => string }
      | undefined
    let raw: string | undefined
    try {
      // 桥方法抛异常不能把轮询打断，更不能让它冒到模块顶层
      raw = bridge?.checkPendingFile?.()
    } catch (e) {
      console.error('[ColaMD] checkPendingFile failed', e)
      return
    }
    if (typeof raw !== 'string' || raw === '' || raw === 'null') return
    try {
      const parsed = JSON.parse(raw) as { name?: string; content?: string }
      if (typeof parsed?.name === 'string' && typeof parsed.content === 'string') {
        emitFileOpened(parsed.name, parsed.content)
      } else {
        console.error('[ColaMD] pending file payload incomplete', parsed)
      }
    } catch (e) {
      // 内容里出现未转义的控制字符会让 JSON.parse 失败；原生侧已改用 JSONObject
      // 序列化，这里再兜一层，失败时不要静默吞掉。
      console.error('[ColaMD] pending file JSON parse failed', e)
    }
  }
  check()
  setInterval(check, INTENT_POLL_MS)
}

/**
 * 移动端菜单：桌面版 popupAppMenu 由主进程弹原生菜单（多级结构），WebView 里没有
 * 主进程，也放不下多级子菜单。这里按 1.5.2 的做法做成左侧滑出面板：分区、平铺、
 * 只保留手机上真正会用的动作，配色跟随主题变量。
 */
const THEME_OPTIONS: { id: string; zh: string; en: string }[] = [
  { id: 'light', zh: '明亮', en: 'Light' },
  { id: 'dark', zh: '深色', en: 'Dark' },
  { id: 'elegant', zh: '优雅', en: 'Elegant' },
  { id: 'sepia', zh: '羊皮纸', en: 'Sepia' },
  { id: 'notion', zh: '极简', en: 'Notion' },
  { id: 'bear', zh: '熊掌记', en: 'Bear' },
  { id: 'writer', zh: '写作', en: 'Writer' },
  { id: 'solarized-dark', zh: 'Solarized 深色', en: 'Solarized Dark' },
  { id: 'nord', zh: 'Nord', en: 'Nord' },
  { id: 'gruvbox', zh: 'Gruvbox', en: 'Gruvbox' },
  { id: 'dracula', zh: 'Dracula', en: 'Dracula' },
  { id: 'midnight', zh: '午夜', en: 'Midnight' },
]

const MOBILE_MENU_STYLE_ID = 'cola-mobile-menu-style'
function ensureMobileMenuStyle(): void {
  if (document.getElementById(MOBILE_MENU_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = MOBILE_MENU_STYLE_ID
  style.textContent = `
.cola-mm-root { position: fixed; inset: 0; z-index: 2147483000; background: rgba(0, 0, 0, 0.35); }
.cola-mm-panel { position: absolute; top: 0; left: 0; bottom: 0; width: min(320px, 84vw); display: flex; flex-direction: column;
  background: var(--bg-color, #fff); color: var(--text-color, #222); box-shadow: 4px 0 24px rgba(0, 0, 0, 0.22);
  overflow-y: auto; overscroll-behavior: contain; font-size: 15px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom)); transform: translateX(-100%); transition: transform 180ms ease; }
.cola-mm-panel.open { transform: translateX(0); }
.cola-mm-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px 12px 18px;
  border-bottom: 1px solid var(--border-color, #e0e0e0); }
.cola-mm-title { font-weight: 600; font-size: 16px; }
.cola-mm-close { width: 40px; height: 40px; border: 0; border-radius: 10px; background: transparent;
  color: var(--text-muted, #888); font-size: 26px; line-height: 1; }
.cola-mm-section { padding: 14px 12px 2px; }
.cola-mm-heading { padding: 0 8px 8px; font-size: 12px; letter-spacing: 0.06em; color: var(--text-muted, #888); }
.cola-mm-item { display: block; width: 100%; min-height: 46px; padding: 10px 8px; border: 0; border-radius: 10px;
  background: transparent; color: inherit; font: inherit; text-align: left; }
.cola-mm-item:active { background: color-mix(in srgb, var(--text-color) 10%, transparent); }
.cola-mm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.cola-mm-theme { min-height: 42px; padding: 6px; border: 1px solid var(--border-color, #ddd); border-radius: 9px;
  background: transparent; color: inherit; font-size: 13px; }
.cola-mm-theme.active { border-color: var(--text-color); font-weight: 600; }
`
  document.head.appendChild(style)
}

let menuEl: HTMLElement | null = null

function showMobileMenu(): void {
  if (menuEl) {
    closeMenu()
    return
  }
  ensureMobileMenuStyle()
  const zh = isChinese()
  const root = document.createElement('div')
  root.className = 'cola-mm-root'
  const panel = document.createElement('div')
  panel.className = 'cola-mm-panel'

  const header = document.createElement('div')
  header.className = 'cola-mm-header'
  const title = document.createElement('span')
  title.className = 'cola-mm-title'
  title.textContent = 'ColaMD'
  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = 'cola-mm-close'
  closeBtn.setAttribute('aria-label', zh ? '关闭菜单' : 'Close menu')
  closeBtn.textContent = '×'
  closeBtn.addEventListener('click', closeMenu)
  header.append(title, closeBtn)
  panel.appendChild(header)

  const addSection = (label: string): HTMLElement => {
    const section = document.createElement('div')
    section.className = 'cola-mm-section'
    const heading = document.createElement('div')
    heading.className = 'cola-mm-heading'
    heading.textContent = label
    section.appendChild(heading)
    panel.appendChild(section)
    return section
  }
  const addItem = (section: HTMLElement, label: string, tag: string): void => {
    const item = document.createElement('button')
    item.type = 'button'
    item.className = 'cola-mm-item'
    item.textContent = label
    item.addEventListener('click', () => {
      closeMenu()
      emitEvent(tag, undefined)
    })
    section.appendChild(item)
  }

  const fileSection = addSection(zh ? '文件' : 'File')
  addItem(fileSection, zh ? '新建' : 'New', 'new-file')
  addItem(fileSection, zh ? '打开' : 'Open', 'menu-open')
  addItem(fileSection, zh ? '保存' : 'Save', 'menu-save')
  addItem(fileSection, zh ? '另存为' : 'Save As', 'menu-save-as')

  const exportSection = addSection(zh ? '导出' : 'Export')
  addItem(exportSection, zh ? '导出 PDF' : 'Export PDF', 'menu-export-pdf')
  addItem(exportSection, zh ? '导出 HTML' : 'Export HTML', 'menu-export-html')

  const viewSection = addSection(zh ? '显示' : 'View')
  addItem(viewSection, zh ? '源码模式' : 'Markdown source', 'toggle-source-mode')

  const themeSection = addSection(zh ? '主题' : 'Theme')
  const grid = document.createElement('div')
  grid.className = 'cola-mm-grid'
  const activeTheme = localStorage.getItem('colamd-theme') ?? 'elegant'
  for (const theme of THEME_OPTIONS) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `cola-mm-theme${theme.id === activeTheme ? ' active' : ''}`
    btn.textContent = zh ? theme.zh : theme.en
    btn.addEventListener('click', () => {
      closeMenu()
      emitEvent('set-theme', theme.id)
    })
    grid.appendChild(btn)
  }
  themeSection.appendChild(grid)

  panel.addEventListener('click', (event) => event.stopPropagation())
  root.addEventListener('click', closeMenu)
  root.appendChild(panel)
  document.body.appendChild(root)
  menuEl = root
  // 下一帧再上滑入，避免 display 挂上后立刻跳变
  requestAnimationFrame(() => panel.classList.add('open'))
}

function closeMenu(): void {
  const root = menuEl
  if (!root) return
  menuEl = null
  const panel = root.querySelector<HTMLElement>('.cola-mm-panel')
  if (panel) panel.classList.remove('open')
  window.setTimeout(() => root.remove(), 200)
}
