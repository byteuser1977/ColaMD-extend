/**
 * 国际化（i18n）核心模块
 * 提供多语言支持和动态切换功能
 */

import { en } from './locales/en'
import { zhCN } from './locales/zh-CN'

export type SupportedLocale = 'en' | 'zh-CN'

export interface LocaleMessages {
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
  export: {
    export: string
    exportPDF: string
    exportHTML: string
    exportSlides: string
  }
  slides: {
    slides: string
    newSlides: string
    openAsSlides: string
  }
  about: {
    about: string
    aboutApp: string
    exit: string
  }
  toast: {
    saved: string
    saveFailed: string
    saveCancelled: string
  }
  mobile: {
    menuTitle: string
    close: string
  }
}

const localeMap: Record<SupportedLocale, LocaleMessages> = {
  'en': en as unknown as LocaleMessages,
  'zh-CN': zhCN as unknown as LocaleMessages,
}

let currentLocale: SupportedLocale = detectDefaultLocale()

const changeListeners: Array<(locale: SupportedLocale) => void> = []

/**
 * 检测系统默认语言
 */
function detectDefaultLocale(): SupportedLocale {
  try {
    if (typeof navigator !== 'undefined' && navigator.language) {
      const lang = navigator.language.toLowerCase()
      if (lang.startsWith('zh')) return 'zh-CN'
    }
    if (typeof Intl !== 'undefined') {
      const lang = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase()
      if (lang.startsWith('zh')) return 'zh-CN'
    }
  } catch {
  }

  try {
    const stored = localStorage.getItem('colamd-locale')
    if (stored && (stored === 'en' || stored === 'zh-CN')) return stored
  } catch {
  }

  return 'en'
}

/**
 * 获取当前语言设置
 */
export function getCurrentLocale(): SupportedLocale {
  return currentLocale
}

/**
 * 设置当前语言并触发更新回调
 * 同时通知主进程更新 Electron 菜单语言
 */
export function setLocale(locale: SupportedLocale): void {
  if (currentLocale === locale) return

  currentLocale = locale

  try {
    localStorage.setItem('colamd-locale', locale)
  } catch {
  }

  // 通知主进程更新菜单语言（仅桌面端 Electron 环境）
  if (typeof window !== 'undefined' && (window as any).electronAPI?.setLocale) {
    ;(window as any).electronAPI.setLocale(locale).catch((e: any) => {
      console.warn('[i18n] Failed to sync locale to main process:', e)
    })
  }

  changeListeners.forEach((listener) => listener(locale))
}

/**
 * 获取翻译文本（支持嵌套路径访问）
 */
export function t(key: string): string {
  const keys = key.split('.')
  let value: any = localeMap[currentLocale]

  for (const k of keys) {
    if (value == null || typeof value !== 'object') return key
    value = value[k]
  }

  return typeof value === 'string' ? value : key
}

/**
 * 注册语言变更监听器
 */
export function onLocaleChange(callback: (locale: SupportedLocale) => void): () => void {
  changeListeners.push(callback)

  return () => {
    const index = changeListeners.indexOf(callback)
    if (index > -1) changeListeners.splice(index, 1)
  }
}

/**
 * 获取所有支持的语言列表
 */
export function getSupportedLocales(): Array<{ code: SupportedLocale; name: string }> {
  return [
    { code: 'en', name: 'English' },
    { code: 'zh-CN', name: '简体中文' },
  ]
}
