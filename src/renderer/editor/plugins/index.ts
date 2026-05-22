import type { MilkdownPlugin } from '@milkdown/ctx'
import type { Plugin } from 'unified'

export interface RendererPlugin {
  id: string
  name: string
  enabled: boolean
  remarkPlugin?: Plugin<any[], any>
  rehypePlugin?: Plugin<any[], any>
  onMount?: (...args: any[]) => any
  onBeforeMount?: (...args: any[]) => any
  onInit?: () => void
  onThemeChange?: (theme: string, customCSS?: string) => void
  css?: string
  nodeTypes?: string[]
  renderStatus?: (container: HTMLElement) => Promise<{ ok: number; fail: number; total: number }>
  ensureRendered?: () => Promise<void>
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

export function findExportCapabilities(): { id: string; name: string }[] {
  return modules
    .filter((m) => m.info.enabled && m.info.onMount)
    .map((m) => ({ id: m.info.id, name: m.info.name }))
}

export function togglePlugin(id: string, enabled: boolean): void {
  const mod = modules.find((m) => m.info.id === id)
  if (mod) mod.info.enabled = enabled
}