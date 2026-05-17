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
  remarkPlugin: { plugin: Plugin; options?: any }
  nodeTypes: string[]
  onInit?: () => void
  onThemeChange?: (theme: string) => void
  exportCapabilities?: ExportCapability[]
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
  return modules.map(m => m.info)
}

export function getEnabledPlugins(): RendererPlugin[] {
  return modules.filter(m => m.info.enabled).map(m => m.info)
}

export function getPlugin(id: string): RendererPlugin | undefined {
  return modules.find(m => m.info.id === id)?.info
}

export function togglePlugin(id: string): void {
  const m = modules.find(m => m.info.id === id)
  if (m) m.info.enabled = !m.info.enabled
}

export function findPluginBySelector(selector: string): { plugin: RendererPlugin; capability: ExportCapability } | undefined {
  for (const m of modules) {
    if (!m.info.enabled || !m.info.exportCapabilities?.length) continue
    for (const nodeType of m.info.nodeTypes) {
      if (selector.includes(nodeType.replace(/_/g, '-'))) {
        return { plugin: m.info, capability: m.info.exportCapabilities[0] }
      }
    }
  }
  return undefined
}

export function findExportCapabilities(selector: string): ExportCapability[] {
  for (const m of modules) {
    if (!m.info.enabled || !m.info.exportCapabilities?.length) continue
    for (const nodeType of m.info.nodeTypes) {
      if (selector.includes(nodeType.replace(/_/g, '-'))) {
        return m.info.exportCapabilities
      }
    }
  }
  return []
}
