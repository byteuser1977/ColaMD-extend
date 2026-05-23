const themes: Record<string, string> = {
  light: 'theme-light',
  dark: 'theme-dark',
  elegant: 'theme-elegant',
  newsprint: 'theme-newsprint'
}

let customStyleEl: HTMLStyleElement | null = null

/** 已导入的自定义主题缓存：name → { css, template } */
const customThemeCache = new Map<string, { css: string; template: string | null }>()

/**
 * 从 CSS 中解析 `/* @template: <name> *​/` 指令
 * @param css 导入的自定义 CSS 内容
 * @returns 模版名称（light/dark/elegant/newsprint），无指令返回 null
 */
function parseTemplateDirective(css: string): string | null {
  const match = css.match(/\/\*\s*@template:\s*(\w+)\s*\*\//)
  return match && themes[match[1]] ? match[1] : null
}

/**
 * 缓存导入的自定义主题 CSS 和模版引用
 * @param name 主题文件名（不含 custom: 前缀）
 * @param css  自定义 CSS 内容
 */
export function setCachedCustomTheme(name: string, css: string): void {
  const template = parseTemplateDirective(css)
  customThemeCache.set(name, { css, template })
}

/**
 * 获取已缓存的自定义主题信息
 * @param name 主题文件名
 */
export function getCachedCustomTheme(name: string): { css: string; template: string | null } | undefined {
  return customThemeCache.get(name)
}

/**
 * 应用主题：内建主题添加对应 class，自定义主题注入 CSS 并叠加模版
 * @param name      主题名称（light/dark/elegant/newsprint 或 custom:<name>）
 * @param customCSS 自定义 CSS 内容（可选，导入时传入；切换时从缓存恢复）
 */
export function applyTheme(name: string, customCSS?: string): void {
  const body = document.body

  // 移除所有主题 class
  Object.values(themes).forEach(cls => body.classList.remove(cls))
  body.classList.remove('theme-custom')

  // 移除自定义主题 <style>
  if (customStyleEl) {
    customStyleEl.remove()
    customStyleEl = null
  }

  if (customCSS || name.startsWith('custom:')) {
    const key = name.startsWith('custom:') ? name.slice(7) : name

    // 如果传入了新 CSS，更新缓存
    if (customCSS) {
      setCachedCustomTheme(key, customCSS)
    }

    const cached = customThemeCache.get(key)

    // 注入自定义 CSS
    if (cached) {
      customStyleEl = document.createElement('style')
      customStyleEl.textContent = cached.css
      document.head.appendChild(customStyleEl)

      // 如果声明了模版引用，叠加模版 class 作为变量基础
      if (cached.template && themes[cached.template]) {
        body.classList.add(themes[cached.template])
      }
    }

    body.classList.add('theme-custom')
  } else if (themes[name]) {
    body.classList.add(themes[name])
  }

  // 持久化主题选择
  localStorage.setItem('colamd-theme', name)
}

export function loadSavedTheme(): string {
  return localStorage.getItem('colamd-theme') || 'elegant'
}