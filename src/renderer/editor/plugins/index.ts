import type { MilkdownPlugin } from '@milkdown/ctx'
import type { Plugin } from 'unified'

export interface ExportCapability {
  label: string
  defaultName: string
  filter: { name: string; extensions: string[] }
  execute: (element: HTMLElement) => Promise<string | null>
}

export interface RendererPlugin {
  id: string
  name: string
  enabled: boolean
  remarkPlugin?: { plugin: Plugin<any[], any>; options?: any }
  rehypePlugin?: Plugin<any[], any>
  onMount?: (...args: any[]) => any
  onBeforeMount?: (...args: any[]) => any
  onInit?: () => void
  onThemeChange?: (theme: string, customCSS?: string) => void
  css?: string
  nodeTypes?: string[]
  exportCapabilities?: ExportCapability[]
  renderStatus?: (container: HTMLElement) => Promise<{ ok: number; fail: number; total: number }>
  ensureRendered?: () => Promise<void>
  /** Selector→inline-style pairs applied during clipboard copy/cut */
  clipboardStyles?: Record<string, string>
  /** CSS rules injected into HTML export (use var(--...) for theme colors) */
  exportStyles?: string
  /** Selectors for raw-source textareas/inputs (blurred on save, removed on export) */
  rawSelectors?: string[]
  /** Selectors for loading/error placeholder elements (hidden during export) */
  hideSelectors?: string[]
  /** Selectors for elements needing computed background-color captured during clone */
  bgCaptureSelectors?: string[]
}

export interface PluginModule {
  info: RendererPlugin
  milkdownPlugins: MilkdownPlugin[]
}

const modules: PluginModule[] = []

export function registerPluginModule(m: PluginModule): void {
  modules.push(m)
}

export function getAllPluginModules(): PluginModule[] {
  return modules
}

export function getAllPlugins(): RendererPlugin[] {
  return modules.map((m) => m.info)
}

export function findPluginBySelector(selector: string): RendererPlugin | undefined {
  const plugins = getAllPlugins()
  if (selector.startsWith('node:')) {
    const name = selector.slice(5)
    return plugins.find((p) => p.nodeTypes?.includes(name))
  }
  return plugins.find((p) => p.id === selector)
}

export function findExportCapabilities(className: string): ExportCapability[] {
  for (const m of modules) {
    if (m.info.enabled && m.info.exportCapabilities && m.info.nodeTypes?.some(nt => className.includes(nt.replace(/_/g, '-')))) {
      return m.info.exportCapabilities
    }
  }
  return []
}

export function togglePlugin(id: string, enabled: boolean): void {
  const mod = modules.find((m) => m.info.id === id)
  if (mod) mod.info.enabled = enabled
}

/** Build a CSS selector matching all export-capable plugin block elements */
export function getContextMenuSelector(): string {
  return getAllPlugins()
    .filter((p) => p.exportCapabilities && p.exportCapabilities.length > 0)
    .flatMap((p) => (p.nodeTypes || []).map((nt) => '.' + nt.replace(/_/g, '-')))
    .join(', ')
}