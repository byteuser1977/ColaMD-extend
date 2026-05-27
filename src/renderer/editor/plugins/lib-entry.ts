/**
 * Library entry point for plugin registration.
 * Explicitly imports all plugin modules to trigger their side-effect registration
 * via registerPluginModule(). This replaces the import.meta.glob pattern in main.ts
 * which only works in Vite's renderer build.
 */
import './math-plugin'
import './mermaid-plugin'

export { getAllPluginModules, getAllPlugins, togglePlugin, registerPluginModule } from './index'
export type { RendererPlugin, PluginModule, ExportCapability } from './index'
