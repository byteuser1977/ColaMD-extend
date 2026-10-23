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
 * 打印布局改造：导出 PDF/长图前把移动端 UI 收起来、解除固定定位，
 * 让 Chromium 打印管线捕获完整文档而不是可视视口。返回恢复函数。
 * 选择器按 2.x 的 DOM 写，跟 1.5.2（#titlebar/#mobile-menu）不同源。
 */
function enterPrintLayout(): () => void {
  const undo: { el: HTMLElement; cssText: string }[] = []
  const override = (selector: string, styles: Record<string, string>): void => {
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      undo.push({ el, cssText: el.style.cssText })
      Object.assign(el.style, styles)
    })
  }
  override('.titlebar, #titlebar', { display: 'none' })
  override('.cola-toast', { display: 'none' })
  override('html', { height: 'auto', overflow: 'visible' })
  override('body', { height: 'auto', overflow: 'visible' })
  override('#app, .app-shell, #editor-host', { position: 'static', height: 'auto', overflow: 'visible' })
  override('.cm-scroller', { overflow: 'visible', height: 'auto' })
  return () => undo.forEach(({ el, cssText }) => (el.style.cssText = cssText))
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
      const target = expectedPath ?? `${DOCS_DIR}/未命名-${Date.now()}.md`
      await f.Filesystem.writeFile({ path: target, directory: f.Directory.Documents, data: content, encoding: f.Encoding.UTF8, recursive: true })
      return target
    },
    saveFileAs: async (content) => api.saveFile(content),
    exportPDF: async () => {
      const bridge = nativeBridge()
      if (!bridge) return false
      const restore = enterPrintLayout()
      try {
        bridge.printDocument(document.title || 'ColaMD Document')
        return true // 弹系统打印对话框（含"保存为 PDF"），结果由系统接管
      } finally {
        // 对话框弹出后布局即可恢复；打印预览用的是当时的 DOM 快照
        setTimeout(restore, 500)
      }
    },
    exportHTML: async (snapshot) => {
      const f = await fs()
      if (!f) return false
      const name = (document.title || 'document').replace(/[\\/:*?"<>|]/g, '_')
      const target = `${DOCS_DIR}/exports/${name}-${Date.now()}.html`
      await f.Filesystem.writeFile({ path: target, directory: f.Directory.Documents, data: snapshot.html, encoding: f.Encoding.UTF8, recursive: true })
      return true
    },
    exportDOCX: async () => false, // 移动端第一版不做 Word 导出
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
    popupAppMenu: () => showMobileMenu(),
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
    reportRendererReady: noop,
    closeWindow: noopVoid, // 移动端由系统返回键管理（@capacitor/app backButton，阶段 2 接）
    logRendererError: noopVoid,
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

/**
 * 轮询原生桥的 Intent 待开文件（MainActivity handleIntent 缓存，checkPendingFile
 * 一次性取走）。注册 onFileOpened 的渲染层代码要等文档初始化跑完，所以轮询 +
 * 缓冲双保险：内容到达早于注册也能补发。间隔 400ms，取空后自动停止。
 */
export function startIntentPolling(): void {
  let stopped = false
  const timer = setInterval(() => {
    const bridge = (window as unknown as Record<string, unknown>).ColaMDNative as
      | { checkPendingFile?: () => string }
      | undefined
    const raw = bridge?.checkPendingFile?.()
    if (raw === undefined || raw === null) return // 桥没就绪，下一轮再试
    if (raw === 'null' || raw === '') {
      if (stopped) return
      stopped = true
      clearInterval(timer) // 桥通了且无待开文件，收工
      return
    }
    try {
      const parsed = JSON.parse(raw) as { name: string; content: string }
      if (parsed?.name && typeof parsed.content === 'string') emitFileOpened(parsed.name, parsed.content)
    } catch {
      // JSON 解析失败（内容含未转义字符），丢弃，不阻塞后续轮询
    }
  }, 400)
}

/**
 * 移动端菜单：桌面版 popupAppMenu 由主进程弹原生菜单，WebView 里没有主进程，
 * 用 HTML 浮层替代。配色走主题基础变量（--bg-color 等），跟随全部主题。
 */
let menuEl: HTMLElement | null = null
function showMobileMenu(): void {
  if (menuEl) {
    menuEl.remove()
    menuEl = null
    return
  }
  const items: [string, string][] = [
    ['menu-new-tab', '新建标签页'],
    ['menu-open', '打开文件'],
    ['menu-save', '保存'],
    ['menu-save-as', '另存为'],
    ['toggle-file-panel', '文件面板'],
    ['toggle-source-mode', '源码模式'],
    ['menu-export-pdf', '导出 PDF'],
    ['menu-export-html', '导出 HTML'],
  ]
  const root = document.createElement('div')
  root.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,0.25)'
  const list = document.createElement('div')
  list.style.cssText = `position:absolute;top:48px;right:12px;min-width:180px;`
    + `background:var(--bg-color,#fff);color:var(--text-color,#333);`
    + `border:1px solid var(--border-color,#ddd);border-radius:10px;`
    + `box-shadow:0 8px 28px rgba(0,0,0,0.22);padding:6px 0;font-size:14px`
  items.forEach(([tag, label]) => {
    const item = document.createElement('div')
    item.style.cssText = 'padding:11px 20px;white-space:nowrap'
    item.textContent = label
    item.addEventListener('click', () => {
      closeMenu()
      emitEvent(tag, undefined)
    })
    list.appendChild(item)
  })
  root.addEventListener('click', closeMenu)
  root.appendChild(list)
  document.body.appendChild(root)
  menuEl = root
}
function closeMenu(): void {
  menuEl?.remove()
  menuEl = null
}
