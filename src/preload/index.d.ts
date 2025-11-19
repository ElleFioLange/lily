import { ElectronAPI } from '@electron-toolkit/preload'
import type { OSCPacket } from '../types/osc-messages'
import type { ExportResult } from '../main/maxdevice/export'

interface LilyAPI {
  osc: {
    send: (address: string, args?: Array<number | string | boolean>) => Promise<void>
    transportPlay: () => Promise<void>
    transportStop: () => Promise<void>
    transportSetTempo: (bpm: number) => Promise<void>
    trackSetVolume: (trackIndex: number, volume: number) => Promise<void>
    trackSetPan: (trackIndex: number, pan: number) => Promise<void>
    trackSetMute: (trackIndex: number, mute: boolean) => Promise<void>
    trackSetSolo: (trackIndex: number, solo: boolean) => Promise<void>
    sceneFire: (sceneIndex: number) => Promise<void>
    requestInit: () => Promise<void>
    onMessage: (callback: (packet: OSCPacket) => void) => void
    onTransportState: (callback: (packet: OSCPacket) => void) => void
    onTrackUpdate: (
      callback: (data: { trackIndex: number; property: string; args: unknown[] }) => void
    ) => void
    onInitComplete: (callback: (version: number) => void) => void
    onConnectionChange: (callback: (connected: boolean) => void) => void
  }
  maxDevice: {
    export: () => Promise<ExportResult>
    quickInstall: () => Promise<ExportResult>
    checkExists: () => Promise<boolean>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: LilyAPI
  }
}
