import type { ElectronAPI } from '../preload/index'
import type { CapacitorBridgeAPI } from './capacitor-api'

declare global {
  interface Window {
    electronAPI?: ElectronAPI
    capacitorAPI?: CapacitorBridgeAPI
  }
}
