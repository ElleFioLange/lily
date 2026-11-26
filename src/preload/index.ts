import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Settings } from '../types/settings'
import type { AudioDevice, AudioCaptureStatus, AudioBufferData } from '../types/audio'

/**
 * Preload Script: exposes Lily's IPC API to the renderer via contextBridge.
 */

// Custom APIs for renderer
const api = {
  // ============================================================================
  // File System API
  // ============================================================================
  files: {
    open: (): Promise<{ success: boolean; content?: string; path?: string; error?: string }> =>
      ipcRenderer.invoke('files:open'),
    save: (
      content: string,
      path: string
    ): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke('files:save', content, path),
    saveAs: (content: string): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke('files:saveAs', content)
  },
  // ============================================================================
  // Configuration File API (Poiesis keyword configs)
  // ============================================================================
  config: {
    save: (
      content: string,
      path: string
    ): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke('config:save', content, path),
    saveAs: (content: string): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke('config:saveAs', content),
    open: (): Promise<{ success: boolean; content?: string; path?: string; error?: string }> =>
      ipcRenderer.invoke('config:open')
  },

  // ============================================================================
  // Hydra File API
  // ============================================================================
  hydraFile: {
    save: (
      content: string,
      path: string
    ): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke('hydra:save', content, path),
    saveAs: (content: string): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke('hydra:saveAs', content),
    open: (): Promise<{ success: boolean; content?: string; path?: string; error?: string }> =>
      ipcRenderer.invoke('hydra:open'),
    read: (
      path: string
    ): Promise<{ success: boolean; content?: string; path?: string; error?: string }> =>
      ipcRenderer.invoke('hydra:read', path)
  },

  // ============================================================================
  // Session File API (.lly)
  // ============================================================================
  session: {
    /** File menu: Open Session (Cmd+O), Save Session (Cmd+S), Save Session As (Cmd+Shift+S) */
    onMenu: (callback: (action: 'open' | 'save' | 'saveAs') => void): (() => void) => {
      const handler = (_: unknown, action: 'open' | 'save' | 'saveAs'): void => callback(action)
      ipcRenderer.on('session:menu', handler)
      return () => ipcRenderer.removeListener('session:menu', handler)
    },
    write: (
      content: string,
      path: string
    ): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke('session:write', content, path),
    saveAs: (
      content: string,
      suggestedName?: string
    ): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke('session:saveAs', content, suggestedName),
    open: (): Promise<{ success: boolean; content?: string; path?: string; error?: string }> =>
      ipcRenderer.invoke('session:open')
  },

  // ============================================================================
  // Working Directory API (file browser)
  // ============================================================================
  workingDirectory: {
    /** The saved working directory, or where Lily was launched from, or null */
    get: (): Promise<string | null> => ipcRenderer.invoke('workdir:get'),
    /** Pick a folder; returns it, or null if cancelled */
    open: (): Promise<string | null> => ipcRenderer.invoke('workdir:open'),
    /** Switch to a known folder; returns it, or null if it no longer exists */
    set: (directory: string): Promise<string | null> =>
      ipcRenderer.invoke('workdir:set', directory),
    list: (
      directory: string
    ): Promise<{
      files: { name: string; path: string; relativePath: string }[]
      truncated: boolean
    }> => ipcRenderer.invoke('workdir:list', directory)
  },

  // ============================================================================
  // Performance Window API
  // ============================================================================
  performance: {
    /**
     * Register callback for performance window toggle event (from menu)
     * @param callback - Function called when toggle is requested
     * @returns Unsubscribe function
     */
    onToggle: (callback: () => void): (() => void) => {
      const handler = (): void => callback()
      ipcRenderer.on('performance:toggle', handler)
      return () => ipcRenderer.removeListener('performance:toggle', handler)
    }
  },

  // ============================================================================
  // Actions API
  // ============================================================================
  actions: {
    onRun: (callback: () => void): (() => void) => {
      const handler = (): void => callback()
      ipcRenderer.on('actions:run', handler)
      return () => ipcRenderer.removeListener('actions:run', handler)
    },
    onToggleMonitor: (callback: () => void): (() => void) => {
      const handler = (): void => callback()
      ipcRenderer.on('hydra:toggle-monitor', handler)
      return () => ipcRenderer.removeListener('hydra:toggle-monitor', handler)
    },
    onTogglePreview: (callback: () => void): (() => void) => {
      const handler = (): void => callback()
      ipcRenderer.on('preview:toggle', handler)
      return () => ipcRenderer.removeListener('preview:toggle', handler)
    }
  },

  // ============================================================================
  // Audio Capture API (Poiesis audio-reactive keywords)
  // ============================================================================
  audio: {
    /**
     * List available audio input devices
     * @returns Promise resolving to array of audio devices
     */
    listDevices: (): Promise<AudioDevice[]> => ipcRenderer.invoke('audio:list-devices'),

    /**
     * Start audio capture from specified device
     * @param deviceId - Optional device ID. If not provided, auto-detects BlackHole 16ch
     * @returns Promise resolving to result with success/error
     */
    start: (deviceId?: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('audio:start', deviceId),

    /**
     * Stop audio capture
     * @returns Promise resolving to success status
     */
    stop: (): Promise<{ success: boolean }> => ipcRenderer.invoke('audio:stop'),

    /**
     * Get current audio capture status
     * @returns Promise resolving to capture status
     */
    getStatus: (): Promise<AudioCaptureStatus> => ipcRenderer.invoke('audio:get-status'),

    /**
     * Register callback for incoming audio buffers
     * @param callback - Function called with audio buffer data
     */
    onBuffer: (callback: (data: AudioBufferData) => void) => {
      ipcRenderer.on('audio:buffer', (_, data) => callback(data))
    },

    /**
     * Remove audio buffer listener
     * @param callback - The callback function to remove
     */
    offBuffer: (callback: (data: AudioBufferData) => void) => {
      ipcRenderer.removeListener('audio:buffer', (_, data) => callback(data))
    },

    /**
     * Register callback for audio capture errors
     * @param callback - Function called with error message
     */
    onError: (callback: (error: string) => void) => {
      ipcRenderer.on('audio:error', (_, error) => callback(error))
    },

    /**
     * Register callback for capture started event
     * @param callback - Function called when capture starts
     */
    onStarted: (callback: () => void) => {
      ipcRenderer.on('audio:started', callback)
    },

    /**
     * Register callback for capture stopped event
     * @param callback - Function called when capture stops
     */
    onStopped: (callback: () => void) => {
      ipcRenderer.on('audio:stopped', callback)
    }
  },

  // ============================================================================
  // Settings API
  // ============================================================================
  settings: {
    /**
     * Get current application settings
     * @returns Promise resolving to current settings
     */
    get: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),

    /**
     * Save application settings
     * @param settings - Settings to save
     * @returns Promise resolving when settings are saved
     */
    save: (settings: Settings): Promise<void> => ipcRenderer.invoke('settings:save', settings)
  }
}

export type LilyAPI = typeof api

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
