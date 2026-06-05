import { PluginState } from 'src/types/plugins'
import { create } from 'zustand'

export interface SyphonServerInfo {
  name: string
  appName: string
  uuid: string
}

export interface SyphonState extends PluginState {
  canvas: HTMLCanvasElement | null
  servers: SyphonServerInfo[]
  connectedServerUUID: string | null
  frameWidth: number
  frameHeight: number
  frameCount: number

  setCanvas: (canvas: HTMLCanvasElement) => void
  setServers: (servers: SyphonServerInfo[]) => void
  setConnectedServer: (uuid: string | null) => void
  incrementFrameCount: () => void
  setFrameDimensions: (width: number, height: number) => void
}

export const createSyphonStore = (instanceId: string) => {
  return create<SyphonState>((set) => ({
    instanceId,
    canvas: null,
    servers: [],
    connectedServerUUID: null,
    frameWidth: 0,
    frameHeight: 0,
    frameCount: 0,

    setCanvas: (canvas) => set({ canvas }),
    setServers: (servers) => set({ servers }),
    setConnectedServer: (uuid) => set({ connectedServerUUID: uuid }),
    incrementFrameCount: () => set((s) => ({ frameCount: s.frameCount + 1 })),
    setFrameDimensions: (width, height) => set({ frameWidth: width, frameHeight: height })
  }))
}
