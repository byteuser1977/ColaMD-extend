/**
 * 主进程国际化模块
 * 为 Electron 菜单提供多语言支持
 */

import { app } from 'electron'

export type SupportedLocale = 'en' | 'zh-CN'

interface LocaleMessages {
  app: {
    name: string
    title: string
  }
  menu: {
    file: string
    edit: string
    view: string
    theme: string
    help: string
    plugins: string
    about: string
  }
  fileMenu: {
    new: string
    newSlides: string
    open: string
    save: string
    saveAs: string
    exportPDF: string
    exportHTML: string
    exportSlides: string
    openAsSlides: string
    close: string
    quit: string
  }
  editMenu: {
    undo: string
    redo: string
    cut: string
    copy: string
    paste: string
    selectAll: string
  }
  viewMenu: {
    resetZoom: string
    zoomIn: string
    zoomOut: string
    toggleFullscreen: string
  }
  themeMenu: {
    light: string
    dark: string
    elegant: string
    newsprint: string
    importTheme: string
  }
  helpMenu: {
    about: string
  }
}

const en: LocaleMessages = {
  app: { name: 'ColaMD', title: 'ColaMD' },
  menu: { file: 'File', edit: 'Edit', view: 'View', theme: 'Theme', help: 'Help', plugins: 'Plugins', about: 'About' },
  fileMenu: { new: 'New', newSlides: 'New Slides...', open: 'Open...', save: 'Save', saveAs: 'Save As...', exportPDF: 'Export PDF...', exportHTML: 'Export HTML...', exportSlides: 'Export Slides...', openAsSlides: 'Open as Slides', close: 'Close', quit: 'Quit' },
  editMenu: { undo: 'Undo', redo: 'Redo', cut: 'Cut', copy: 'Copy', paste: 'Paste', selectAll: 'Select All' },
  viewMenu: { resetZoom: 'Actual Size', zoomIn: 'Zoom In', zoomOut: 'Zoom Out', toggleFullscreen: 'Toggle Fullscreen' },
  themeMenu: { light: 'Light', dark: 'Dark', elegant: 'Elegant', newsprint: 'Newsprint', importTheme: 'Import Theme...' },
  helpMenu: { about: 'About ColaMD' },
}

const zhCN: LocaleMessages = {
  app: { name: 'ColaMD', title: 'ColaMD' },
  menu: { file: '文件', edit: '编辑', view: '视图', theme: '主题', help: '帮助', plugins: '插件', about: '关于' },
  fileMenu: { new: '新建', newSlides: '新建幻灯片...', open: '打开...', save: '保存', saveAs: '另存为...', exportPDF: '导出 PDF...', exportHTML: '导出 HTML...', exportSlides: '导出幻灯片...', openAsSlides: '打开为幻灯片', close: '关闭', quit: '退出' },
  editMenu: { undo: '撤销', redo: '重做', cut: '剪切', copy: '复制', paste: '粘贴', selectAll: '全选' },
  viewMenu: { resetZoom: '实际大小', zoomIn: '放大', zoomOut: '缩小', toggleFullscreen: '切换全屏' },
  themeMenu: { light: '浅色', dark: '深色', elegant: '优雅', newsprint: '新闻纸', importTheme: '导入主题...' },
  helpMenu: { about: '关于 ColaMD' },
}

const localeMap: Record<SupportedLocale, LocaleMessages> = { 'en': en, 'zh-CN': zhCN }

let currentLocale: SupportedLocale = 'en'
let initialized = false

/**
 * 检测系统默认语言
 * 必须在 app.ready 之后调用才能正确获取系统语言
 */
function detectDefaultLocale(): SupportedLocale {
  try {
    const locale = app.getLocale()
    if (locale.toLowerCase().startsWith('zh')) return 'zh-CN'
  } catch (e) {
    console.warn('[i18n] Failed to detect system locale:', e)
  }

  return 'en'
}

/**
 * 初始化国际化模块
 * 应该在 app.whenReady() 中调用，确保能正确检测系统语言
 */
export function initI18n(): void {
  if (initialized) return

  currentLocale = detectDefaultLocale()
  initialized = true

  console.log(`[i18n] Initialized with locale: ${currentLocale}`)
}

export function getCurrentLocale(): SupportedLocale {
  return currentLocale
}

/**
 * 设置当前语言并返回是否发生了变更
 */
export function setLocale(locale: SupportedLocale): boolean {
  if (currentLocale === locale) return false

  currentLocale = locale
  console.log(`[i18n] Locale changed to: ${currentLocale}`)

  return true
}

export function t(key: string): string {
  const keys = key.split('.')
  let value: any = localeMap[currentLocale]

  for (const k of keys) {
    if (value == null || typeof value !== 'object') return key
    value = value[k]
  }

  return typeof value === 'string' ? value : key
}
