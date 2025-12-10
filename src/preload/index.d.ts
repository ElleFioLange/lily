import { ElectronAPI } from '@electron-toolkit/preload'
import type { OSCMessage } from '../types/osc-messages'
import type { LayoutType } from '../types/layouts'
import type { ExportResult } from '../main/maxdevice/export'
import type { CameraServerStatus, StartServerResult, StopServerResult } from '../types/camera'

/**
 * Minimal OSC API Type Definitions
 *
 * This file defines the TypeScript types for the window.api interface
 * exposed by the preload script. It provides type safety for renderer
 * code when calling OSC methods.
 */

interface LilyAPI {
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
   * Hydra Video Synthesizer API
   *
   * Methods for managing Hydra popup window and shader evaluation
   */
  hydra: {
    openPopup: () => Promise<{ success: boolean }>
    evaluate: (code: string) => Promise<{ success: boolean }>
    onEvaluateShader: (callback: (code: string) => void) => void
    requestShader: () => void
    onRequestShader: (callback: () => void) => void
    sendShaderResponse: (code: string) => void
    sendTextUpdate: (text: string) => void
    onTextUpdate: (callback: (text: string) => void) => void
    sendScrollUpdate: (scrollPercentage: number) => void
    onScrollUpdate: (callback: (scrollPercentage: number) => void) => void
    triggerAnimation: () => void
    onTriggerAnimation: (callback: () => void) => void
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
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: LilyAPI
  }
}
