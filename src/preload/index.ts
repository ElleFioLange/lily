import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { OSCPacket } from '../types/osc-messages'
import type { ExportResult } from '../main/maxdevice/export'

// Custom APIs for renderer
const api = {
  // OSC Communication
  osc: {
    send: (address: string, args: Array<number | string | boolean> = []) =>
      ipcRenderer.invoke('osc:send', address, args),

    // Transport controls
    transportPlay: () => ipcRenderer.invoke('osc:transport:play'),
    transportStop: () => ipcRenderer.invoke('osc:transport:stop'),
    transportSetTempo: (bpm: number) => ipcRenderer.invoke('osc:transport:tempo', bpm),

    // Track controls
    trackSetVolume: (trackIndex: number, volume: number) =>
      ipcRenderer.invoke('osc:track:volume', trackIndex, volume),
    trackSetPan: (trackIndex: number, pan: number) =>
      ipcRenderer.invoke('osc:track:pan', trackIndex, pan),
    trackSetMute: (trackIndex: number, mute: boolean) =>
      ipcRenderer.invoke('osc:track:mute', trackIndex, mute),
    trackSetSolo: (trackIndex: number, solo: boolean) =>
      ipcRenderer.invoke('osc:track:solo', trackIndex, solo),

    // Scene controls
    sceneFire: (sceneIndex: number) => ipcRenderer.invoke('osc:scene:fire', sceneIndex),

    // Initialization
    requestInit: () => ipcRenderer.invoke('osc:init:request'),

    // Event listeners
    onMessage: (callback: (packet: OSCPacket) => void) => {
      ipcRenderer.on('osc:message', (_, packet) => callback(packet))
    },
    onTransportState: (callback: (packet: OSCPacket) => void) => {
      ipcRenderer.on('osc:transport:state', (_, packet) => callback(packet))
    },
    onTrackUpdate: (
      callback: (data: { trackIndex: number; property: string; args: unknown[] }) => void
    ) => {
      ipcRenderer.on('osc:track:update', (_, data) => callback(data))
    },
    onInitComplete: (callback: (version: number) => void) => {
      ipcRenderer.on('osc:init:complete', (_, version) => callback(version))
    },
    onConnectionChange: (callback: (connected: boolean) => void) => {
      ipcRenderer.on('osc:connection', (_, connected) => callback(connected))
    }
  },

  // Max Device Export
  maxDevice: {
    export: (): Promise<ExportResult> => ipcRenderer.invoke('max-device:export'),
    quickInstall: (): Promise<ExportResult> => ipcRenderer.invoke('max-device:quick-install'),
    checkExists: (): Promise<boolean> => ipcRenderer.invoke('max-device:check-exists')
  },

  // Layout switching
  layout: {
    setLayout: (layout: 'performance' | 'ableton-configuration') =>
      ipcRenderer.invoke('layout:set', layout),
    onLayoutChange: (callback: (layout: 'performance' | 'ableton-configuration') => void) => {
      ipcRenderer.on('layout:change', (_, layout) => callback(layout))
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
