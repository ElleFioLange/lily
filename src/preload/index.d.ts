import { ElectronAPI } from '@electron-toolkit/preload'
import type { OSCMessage } from '../types/osc-messages'
import type { LayoutType } from '../types/layouts'
import type { ExportResult } from '../plugins/ableton/maxdevice/export'
import type { CameraServerStatus, StartServerResult, StopServerResult } from '../types/camera'
import type { Settings } from '../types/settings'
import type { AudioDevice, AudioCaptureStatus, AudioBufferData } from '../types/audio'
import type { ClaudeSendMessageParams, ClaudeSendMessageResult } from '../types/claude'

/**
 * Minimal OSC API Type Definitions
 *
 * This file defines the TypeScript types for the window.api interface
 * exposed by the preload script. It provides type safety for renderer
 * code when calling OSC methods.
 */

interface LilyAPI {
  /**
   * File System API
   *
   * API for opening and managing files
   */
  files: {
    open: () => Promise<{ success: boolean; content?: string; path?: string; error?: string }>
    save: (
      content: string,
      path: string
    ) => Promise<{ success: boolean; path?: string; error?: string }>
    saveAs: (content: string) => Promise<{ success: boolean; path?: string; error?: string }>
  }
  /**
   * OSC Communication API
   *
   * Minimal, generic API for sending and receiving OSC messages.
   * All application-specific message handling should be built on top
   * of these generic methods in your renderer code.
   */
  osc: {
    /**
     * Send a generic OSC message
     *
     * @param address - OSC address pattern
     * @param args - Array of arguments (numbers, strings, booleans)
     */
    send: (address: string, args?: Array<number | string | boolean>) => Promise<void>

    /**
     * Register a callback for all incoming OSC messages
     *
     * @param callback - Function called with every received OSC message
     */
    onMessage: (callback: (message: OSCMessage) => void) => void

    /**
     * Register a callback for specific OSC address patterns
     *
     * Note: Requires main process setup to forward pattern-matched events
     *
     * @param pattern - OSC address pattern (supports wildcards)
     * @param callback - Function called when matching message is received
     */
    on: (pattern: string, callback: (message: OSCMessage) => void) => void

    /**
     * Remove an OSC message listener
     *
     * @param pattern - The pattern to stop listening to
     * @param callback - The callback function to remove
     */
    off: (pattern: string, callback: (message: OSCMessage) => void) => void
  }

  /**
   * Max Device Export API
   *
   * Methods for exporting and installing Max for Live devices
   */
  maxDevice: {
    export: () => Promise<ExportResult>
    quickInstall: () => Promise<ExportResult>
    checkExists: () => Promise<boolean>
  }

  /**
   * Layout Switching API
   *
   * Methods for managing application layout
   */
  layout: {
    setLayout: (layout: LayoutType) => Promise<void>
    onLayoutChange: (callback: (layout: LayoutType) => void) => void
  }

  /**
   * Configuration File API
   *
   * Methods for loading, saving, and managing configuration files
   */
  config: {
    save: (
      content: string,
      path: string
    ) => Promise<{ success: boolean; path?: string; error?: string }>
    open: () => Promise<{ success: boolean; content?: string; path?: string; error?: string }>
    saveAs: (content: string) => Promise<{ success: boolean; path?: string; error?: string }>
  }

  /**
   * Hydra File API
   *
   * Methods for loading, saving, and managing Hydra shader files
   */
  hydraFile: {
    save: (
      content: string,
      path: string
    ) => Promise<{ success: boolean; path?: string; error?: string }>
    open: () => Promise<{ success: boolean; content?: string; path?: string; error?: string }>
    saveAs: (content: string) => Promise<{ success: boolean; path?: string; error?: string }>
  }

  /**
   * Performance Window API
   *
   * Methods for managing the performance window
   */
  performance: {
    /**
     * Register callback for performance window toggle event (from menu)
     * @param callback - Function called when toggle is requested
     * @returns Unsubscribe function
     */
    onToggle: (callback: () => void) => () => void
  }

  /**
   * Actions API
   *
   * Methods for managing application actions
   */
  actions: {
    onRun: (callback: () => void) => () => void
  }

  /**
   * Camera WebSocket Streaming API
   *
   * Methods for managing camera streaming from mobile devices
   */
  camera: {
    start: (port?: number) => Promise<StartServerResult>
    stop: () => Promise<StopServerResult>
    getStatus: () => Promise<CameraServerStatus>
    onFrame: (callback: (buffer: ArrayBuffer) => void) => void
    offFrame: (callback: (buffer: ArrayBuffer) => void) => void
    onClientConnected: (callback: (clientCount: number) => void) => void
    onClientDisconnected: (callback: (clientCount: number) => void) => void
  }

  /**
   * Audio Capture API
   *
   * Methods for managing multi-channel audio capture from audio devices
   */
  audio: {
    listDevices: () => Promise<AudioDevice[]>
    start: (deviceId?: string) => Promise<{ success: boolean; error?: string }>
    stop: () => Promise<{ success: boolean }>
    getStatus: () => Promise<AudioCaptureStatus>
    onBuffer: (callback: (data: AudioBufferData) => void) => void
    offBuffer: (callback: (data: AudioBufferData) => void) => void
    onError: (callback: (error: string) => void) => void
    onStarted: (callback: () => void) => void
    onStopped: (callback: () => void) => void
  }

  /**
   * Settings API
   *
   * Methods for managing application settings
   */
  settings: {
    get: () => Promise<Settings>
    save: (settings: Settings) => Promise<void>
  }

  /**
   * Claude API
   *
   * Methods for communicating with the Claude API
   */
  claude: {
    sendMessage: (params: ClaudeSendMessageParams) => Promise<ClaudeSendMessageResult>
  }
  llm: {
    sendLocal: (
      baseUrl: string,
      messages: { role: string; content: string }[],
      systemPrompt: string,
      maxTokens: number
    ) => Promise<ClaudeSendMessageResult>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: LilyAPI
    hydraSynth: any
  }
}
