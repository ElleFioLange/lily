import { ElectronAPI } from '@electron-toolkit/preload'
import type { LilyAPI } from './index'

// window.api is typed straight from the preload implementation, so the two can't drift.
declare global {
  interface Window {
    electron: ElectronAPI
    api: LilyAPI
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hydraSynth: any
  }
}
