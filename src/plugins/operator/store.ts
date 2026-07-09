import { PluginState } from 'src/types/plugins'
import { create } from 'zustand'

export interface OperatorServerInfo {
  name: string
  appName: string
  uuid: string
}

export type ControlStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface OperatorConnectionSettings {
  host: string
  port: number
  token: string
}

const SETTINGS_KEY = 'operator-plugin:connection'

const DEFAULT_SETTINGS: OperatorConnectionSettings = {
  host: '127.0.0.1',
  port: 9700,
  token: ''
}

export function loadConnectionSettings(): OperatorConnectionSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    // Corrupt settings fall back to defaults
  }
  return { ...DEFAULT_SETTINGS }
}

export function saveConnectionSettings(settings: OperatorConnectionSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export interface OperatorState extends PluginState {
  // Syphon video feed (mirrors the generic syphon plugin, auto-connected)
  canvas: HTMLCanvasElement | null
  servers: OperatorServerInfo[]
  connectedServerUUID: string | null
  frameWidth: number
  frameHeight: number
  frameCount: number

  // WebSocket control channel into the Operator patch
  settings: OperatorConnectionSettings
  controlStatus: ControlStatus
  controlError: string | null
  lastAck: string | null

  setCanvas: (canvas: HTMLCanvasElement) => void
  setServers: (servers: OperatorServerInfo[]) => void
  setConnectedServer: (uuid: string | null) => void
  incrementFrameCount: () => void
  setFrameDimensions: (width: number, height: number) => void
  setSettings: (settings: OperatorConnectionSettings) => void
  setControlStatus: (status: ControlStatus, error?: string | null) => void
  setLastAck: (ack: string | null) => void
}

export const createOperatorStore = (instanceId: string) => {
  return create<OperatorState>((set) => ({
    instanceId,
    canvas: null,
    servers: [],
    connectedServerUUID: null,
    frameWidth: 0,
    frameHeight: 0,
    frameCount: 0,

    settings: loadConnectionSettings(),
    controlStatus: 'disconnected',
    controlError: null,
    lastAck: null,

    setCanvas: (canvas) => set({ canvas }),
    setServers: (servers) => set({ servers }),
    setConnectedServer: (uuid) => set({ connectedServerUUID: uuid }),
    incrementFrameCount: () => set((s) => ({ frameCount: s.frameCount + 1 })),
    setFrameDimensions: (width, height) => set({ frameWidth: width, frameHeight: height }),
    setSettings: (settings) => {
      saveConnectionSettings(settings)
      set({ settings })
    },
    setControlStatus: (controlStatus, controlError = null) => set({ controlStatus, controlError }),
    setLastAck: (lastAck) => set({ lastAck })
  }))
}
