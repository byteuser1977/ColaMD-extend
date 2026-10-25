// 导出用 CSS：把当前页面样式整理成一份可以离线打开的样式表。
//
// 与应用里的快照逻辑（src/renderer/main.ts 的 getExportSnapshot）保持一致：先序列化
// document.styleSheets，再做两件导出特有的事：
//
//   1. 把 :root 与主题类规则里的自定义属性全部摘掉。应用里这些变量既有活变量也有
//      外壳变量、历史死变量（--table-border 之类），而导出只需要契约里的活变量。
//   2. 用当前主题的实际计算值重新写一条 :root。主题定义在 body 元素级，导出文档却
//      只留下语义结构，把值放到 :root 才能让 .colamd-document 和 mermaid SVG 都解析
//      得到（SVG 里的 var(--pele-*) 就是靠这一条离线生效的）。
import { THEME_CONTRACT } from './contract'

type GroupRule = CSSRule & {
  cssRules: CSSRuleList
  deleteRule(index: number): void
}

function sequenceStyles(): string {
  let css = ''
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      css += Array.from(sheet.cssRules).map((rule) => rule.cssText).join('\n') + '\n'
    } catch {
      // 浏览器标记为不可访问的样式表跳过，与应用快照的行为一致。
    }
  }
  return css
}

function asGroupRule(rule: CSSRule): GroupRule | null {
  const candidate = rule as Partial<GroupRule>
  return candidate.cssRules && typeof candidate.deleteRule === 'function'
    ? candidate as GroupRule
    : null
}

function asStyleRule(rule: CSSRule): CSSStyleRule | null {
  const candidate = rule as CSSStyleRule
  return candidate.selectorText !== undefined && candidate.style ? candidate : null
}

/** 主题变量只认 :root 与主题类；别的规则（排版、字体、@font-face）原样保留。 */
function carriesThemeVariables(selector: string): boolean {
  return selector.includes(':root') || selector.includes('theme-')
}

function stripVariables(rules: CSSRuleList, remove: (index: number) => void): void {
  for (let index = rules.length - 1; index >= 0; index--) {
    const rule = rules[index]
    const group = asGroupRule(rule)
    if (group) {
      stripVariables(group.cssRules, (child) => group.deleteRule(child))
      continue
    }
    const styleRule = asStyleRule(rule)
    if (!styleRule || !carriesThemeVariables(styleRule.selectorText)) continue
    for (let property = styleRule.style.length - 1; property >= 0; property--) {
      const name = styleRule.style.item(property)
      if (name.startsWith('--')) styleRule.style.removeProperty(name)
    }
    if (styleRule.style.length === 0) remove(index)
  }
}

function readVariables(element: Element | null, names: string[]): Array<[string, string]> {
  if (!element) return []
  const computed = getComputedStyle(element)
  return names.map((name) => [name, computed.getPropertyValue(name).trim()])
}

function inlineBodyVariables(): Array<[string, string]> {
  const values: Array<[string, string]> = []
  for (let index = 0; index < document.body.style.length; index++) {
    const name = document.body.style.item(index)
    if (!name.startsWith('--')) continue
    values.push([name, document.body.style.getPropertyValue(name).trim()])
  }
  return values
}

function rootDeclarations(): string {
  const peleNames = new Set(THEME_CONTRACT.peleVariables)
  const regular = THEME_CONTRACT.liveVariables.filter((name) => !peleNames.has(name))
  const mermaid = document.querySelector<HTMLElement>('.cm-md-mermaid')
  const values = [
    ...readVariables(document.body, regular),
    // --pele-* 定义在 .cm-md-mermaid 上，body 上看不到。没有图时不需要输出。
    ...readVariables(mermaid, THEME_CONTRACT.peleVariables),
    ...inlineBodyVariables()
  ]

  const seen = new Set<string>()
  const declarations: string[] = []
  for (const [name, value] of values) {
    if (!value || seen.has(name)) continue
    seen.add(name)
    declarations.push(`${name}: ${value}`)
  }
  return declarations.join('; ')
}

/** 把样式表整理成导出用 CSS：:root 只留契约活变量，其余规则原样带出。 */
export function collectExportStyles(): string {
  const parsed = document.createElement('style')
  // 不参与当前页面渲染，只借它的 CSSOM 做增删。
  parsed.media = 'not all'
  parsed.textContent = sequenceStyles()
  document.head.appendChild(parsed)

  const sheet = parsed.sheet
  if (!sheet) {
    parsed.remove()
    return parsed.textContent ?? ''
  }

  try {
    stripVariables(sheet.cssRules, (index) => sheet.deleteRule(index))
    const declarations = rootDeclarations()
    if (declarations) sheet.insertRule(`:root { ${declarations} }`, 0)
    return Array.from(sheet.cssRules).map((rule) => rule.cssText).join('\n')
  } finally {
    parsed.remove()
  }
}
