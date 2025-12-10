import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { OSCMessage } from '../types/osc-messages'
import type { LayoutType } from '../types/layouts'
import type { ExportResult } from '../main/maxdevice/export'

/**
 * Preload Script - Minimal OSC API Bridge
 *
 * This script exposes a minimal, generic OSC API to the renderer process
 * via Electron's contextBridge. It provides:
 * - Generic send() method for sending any OSC message
 * - Generic onMessage() listener for receiving all OSC messages
 * - Custom event system for specific message patterns
 *
 * Building Custom APIs:
 * Instead of adding methods here, create wrapper functions in your
 * renderer code that use the generic send() method. This keeps the
 * preload layer thin and flexible.
 *
 * Example (in renderer):
 * ```typescript
 * function setVolume(vol: number) {
 *   window.api.osc.send('/volume', [vol])
 * }
 * ```
 */

// Custom APIs for renderer
const api = {
  // ============================================================================
  // OSC Communication API
  // ============================================================================
  osc: {
    /**
     * Send a generic OSC message to the main process
     *
     * @param address - OSC address pattern (e.g., '/synth/freq')
     * @param args - Array of arguments (numbers, strings, booleans)
     * @returns Promise that resolves when the message is sent
     *
     * @example
     * ```typescript
     * // Send a message with arguments
     * await window.api.osc.send('/synth/freq', [440.0])
     *
     * // Send a trigger (no arguments)
     * await window.api.osc.send('/transport/play')
     *
     * // Send multiple arguments
     * await window.api.osc.send('/note', [60, 100, 'C4'])
     * ```
     */
    send: (address: string, args: Array<number | string | boolean> = []) =>
      ipcRenderer.invoke('osc:send', address, args),

    /**
     * Register a callback for all incoming OSC messages
     *
     * @param callback - Function to call when any OSC message is received
     *
     * @example
     * ```typescript
     * window.api.osc.onMessage((msg) => {
     *   console.log('Received:', msg.address, msg.args)
     *   if (msg.address === '/synth/freq') {
     *     const freq = msg.args[0] as number
     *     // Handle frequency change
     *   }
     * })
     * ```
     */
    onMessage: (callback: (message: OSCMessage) => void) => {
      ipcRenderer.on('osc:message', (_, message) => callback(message))
    },

    /**
     * Register a callback for specific OSC address patterns
     *
     * This allows you to listen for messages matching a specific pattern
     * without having to filter in the onMessage callback.
     *
     * @param pattern - OSC address pattern (supports wildcards)
     * @param callback - Function to call when a matching message is received
     *
     * Note: Pattern matching is handled by the main process OSC server.
     * The pattern must be registered on the server side to work.
     *
     * @example
     * ```typescript
     * // Listen for a specific address
     * window.api.osc.on('/synth/freq', (msg) => {
     *   const freq = msg.args[0] as number
     * })
     *
     * // This requires the main process to forward this event
     * // See main process IPC setup for details
     * ```
     */
    on: (pattern: string, callback: (message: OSCMessage) => void) => {
      ipcRenderer.on(`osc:pattern:${pattern}`, (_, message) => callback(message))
    },

    /**
     * Remove an OSC message listener
     *
     * @param pattern - The pattern to stop listening to
     * @param callback - The callback function to remove
     */
    off: (pattern: string, callback: (message: OSCMessage) => void) => {
      ipcRenderer.removeListener(`osc:pattern:${pattern}`, (_, message) => callback(message))
    }
  },

  // ============================================================================
  // Max Device Export API
  // ============================================================================
  maxDevice: {
    export: (): Promise<ExportResult> => ipcRenderer.invoke('max-device:export'),
    quickInstall: (): Promise<ExportResult> => ipcRenderer.invoke('max-device:quick-install'),
    checkExists: (): Promise<boolean> => ipcRenderer.invoke('max-device:check-exists')
  },

  // ============================================================================
  // Layout Switching API
  // ============================================================================
  layout: {
    setLayout: (layout: LayoutType) => ipcRenderer.invoke('layout:set', layout),
    onLayoutChange: (callback: (layout: LayoutType) => void) => {
      ipcRenderer.on('layout:change', (_, layout) => callback(layout))
    }
  },

  // ============================================================================
  // Configuration File API
  // ============================================================================
  config: {
    save: (
      content: string,
      path: string
    ): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke('config:save', content, path),
    saveAs: (content: string): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke('config:saveAs', content),
    openFile: (): Promise<{ success: boolean; content?: string; path?: string; error?: string }> =>
      ipcRenderer.invoke('config:openFile')
  },

  // ============================================================================
  // Hydra Video Synthesizer API
  // ============================================================================
  hydra: {
    openPopup: (): Promise<{ success: boolean }> => ipcRenderer.invoke('hydra:open-popup'),
    evaluate: (code: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('hydra:evaluate', code),
    onEvaluateShader: (callback: (code: string) => void) => {
      ipcRenderer.on('hydra:evaluate-shader', (_, code) => callback(code))
    },
    requestShader: () => {
      ipcRenderer.send('hydra:request-shader')
    },
    onRequestShader: (callback: () => void) => {
      ipcRenderer.on('hydra:request-shader', callback)
    },
    sendShaderResponse: (code: string) => {
      ipcRenderer.send('hydra:shader-response', code)
    },
    sendTextUpdate: (text: string) => {
      ipcRenderer.send('hydra:text-update', text)
    },
    onTextUpdate: (callback: (text: string) => void) => {
      ipcRenderer.on('hydra:text-update', (_, text) => callback(text))
    },
    sendScrollUpdate: (scrollPercentage: number) => {
      ipcRenderer.send('hydra:scroll-update', scrollPercentage)
    },
    onScrollUpdate: (callback: (scrollPercentage: number) => void) => {
      ipcRenderer.on('hydra:scroll-update', (_, scrollPercentage) => callback(scrollPercentage))
    },
    triggerAnimation: () => {
      ipcRenderer.send('hydra:trigger-animation')
    },
    onTriggerAnimation: (callback: () => void) => {
      ipcRenderer.on('hydra:trigger-animation', callback)
    }
  },

  // ============================================================================
  // Camera WebSocket Streaming API
  // ============================================================================
  camera: {
    start: (port: number = 8765) => ipcRenderer.invoke('camera:start', port),
    stop: () => ipcRenderer.invoke('camera:stop'),
    getStatus: () => ipcRenderer.invoke('camera:get-status'),
    onFrame: (callback: (buffer: ArrayBuffer) => void) => {
      ipcRenderer.on('camera:frame', (_, buffer) => callback(buffer))
    },
    offFrame: (callback: (buffer: ArrayBuffer) => void) => {
      ipcRenderer.removeListener('camera:frame', (_, buffer) => callback(buffer))
    },
    onClientConnected: (callback: (clientCount: number) => void) => {
      ipcRenderer.on('camera:client-connected', (_, count) => callback(count))
    },
    onClientDisconnected: (callback: (clientCount: number) => void) => {
      ipcRenderer.on('camera:client-disconnected', (_, count) => callback(count))
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

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
Example 1: Basic message sending from renderer
----------------------------------------------
// In your React component or renderer code:

function MyComponent() {
  const sendFrequency = async () => {
    await window.api.osc.send('/synth/freq', [440.0])
  }

  const sendNote = async () => {
    await window.api.osc.send('/synth/note', [60, 100])
  }

  return (
    <div>
      <button onClick={sendFrequency}>Set Frequency</button>
      <button onClick={sendNote}>Play Note</button>
    </div>
  )
}


Example 2: Listening to OSC messages in renderer
------------------------------------------------
// In your React component:

function MyComponent() {
  useEffect(() => {
    // Listen to all messages
    window.api.osc.onMessage((msg) => {
      console.log('Received OSC:', msg.address, msg.args)

      // Route based on address
      if (msg.address === '/synth/freq') {
        const freq = msg.args[0] as number
        setFrequency(freq)
      }
    })
  }, [])

  return <div>Listening to OSC messages...</div>
}


Example 3: Creating typed helper functions in renderer
------------------------------------------------------
// Create a separate file: src/renderer/src/lib/osc-helpers.ts

export async function setSynthFrequency(freq: number): Promise<void> {
  if (freq < 20 || freq > 20000) {
    throw new Error('Frequency must be between 20 and 20000 Hz')
  }
  await window.api.osc.send('/synth/freq', [freq])
}

export async function setSynthAmplitude(amp: number): Promise<void> {
  if (amp < 0 || amp > 1) {
    throw new Error('Amplitude must be between 0 and 1')
  }
  await window.api.osc.send('/synth/amp', [amp])
}

export async function playSynthNote(note: number, velocity: number): Promise<void> {
  await window.api.osc.send('/synth/note', [note, velocity])
}

// Use in component:
import { setSynthFrequency, playSynthNote } from './lib/osc-helpers'

function MyComponent() {
  return (
    <div>
      <button onClick={() => setSynthFrequency(440)}>A4</button>
      <button onClick={() => playSynthNote(60, 100)}>Middle C</button>
    </div>
  )
}


Example 4: Pattern-specific listeners (requires main process setup)
-------------------------------------------------------------------
// If you set up pattern forwarding in the main process, you can use:

function MyComponent() {
  useEffect(() => {
    // Listen only to synth messages
    window.api.osc.on('/synth/*', (msg) => {
      console.log('Synth message:', msg.address)
    })

    // Cleanup
    return () => {
      window.api.osc.off('/synth/*', handleSynthMessage)
    }
  }, [])

  return <div>...</div>
}


Example 5: Integration with state management (Zustand)
------------------------------------------------------
// Create a store: src/renderer/src/stores/useOSCStore.ts

import { create } from 'zustand'
import type { OSCMessage } from '../../../types/osc-messages'

interface OSCState {
  lastMessage: OSCMessage | null
  setLastMessage: (msg: OSCMessage) => void
}

export const useOSCStore = create<OSCState>((set) => ({
  lastMessage: null,
  setLastMessage: (msg) => set({ lastMessage: msg })
}))

// Setup listener in App.tsx:
function App() {
  const setLastMessage = useOSCStore((state) => state.setLastMessage)

  useEffect(() => {
    window.api.osc.onMessage((msg) => {
      setLastMessage(msg)
      // Handle other logic...
    })
  }, [setLastMessage])

  return <div>...</div>
}

// Use in component:
function MyComponent() {
  const lastMessage = useOSCStore((state) => state.lastMessage)
  return <div>Last OSC: {lastMessage?.address}</div>
}
*/
