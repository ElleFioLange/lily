import { create } from 'zustand'
import type { OSCMessage } from '../../../types/osc-messages'

/**
 * Minimal OSC Store Template
 *
 * This is a basic Zustand store template showing how to integrate OSC
 * message handling with state management.
 *
 * This template is intentionally minimal. Build your own state structure
 * and actions based on your application's needs.
 *
 * Usage:
 * 1. Define your state interface
 * 2. Add actions for updating state
 * 3. Create OSC helper functions that send messages
 * 4. Set up listeners in setupOSCListeners() to handle incoming messages
 *
 * Example:
 * ```typescript
 * // In your component:
 * const lastMessage = useOSCStore((state) => state.lastMessage)
 * const sendMessage = useOSCStore((state) => state.sendMessage)
 *
 * // Send a message
 * await sendMessage('/synth/freq', [440.0])
 * ```
 */

// ============================================================================
// OSC Store Interface
// ============================================================================

interface OSCStore {
  // State: Last received OSC message
  lastMessage: OSCMessage | null

  // Action: Update last message
  setLastMessage: (message: OSCMessage) => void

  // Action: Send an OSC message
  sendMessage: (address: string, args?: Array<number | string | boolean>) => Promise<void>
}

// ============================================================================
// OSC Store Implementation
// ============================================================================

export const useOSCStore = create<OSCStore>((set) => ({
  // Initial state
  lastMessage: null,

  // Update last message
  setLastMessage: (message) =>
    set({
      lastMessage: message
    }),

  // Send OSC message
  sendMessage: async (address, args = []) => {
    await window.api.osc.send(address, args)
  }
}))

// ============================================================================
// OSC Listener Setup
// ============================================================================

/**
 * Setup OSC event listeners
 *
 * Call this function once when your app initializes (typically in App.tsx).
 * It registers listeners for incoming OSC messages and updates the store.
 *
 * Customize this function to handle your specific message patterns and
 * update your state accordingly.
 *
 * @example
 * ```typescript
 * // In App.tsx:
 * useEffect(() => {
 *   setupOSCListeners()
 * }, [])
 * ```
 */
export function setupOSCListeners(): void {
  // Listen for all OSC messages
  window.api.osc.onMessage((message) => {
    const oscStore = useOSCStore.getState()

    // Update last message
    oscStore.setLastMessage(message)

    console.log('OSC Message Received:', message.address, message.args)
  })
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
Example 1: Basic store with custom state
-----------------------------------------
interface MyOSCStore {
  // State
  synthFrequency: number
  synthAmplitude: number
  lastMessage: OSCMessage | null

  // Actions
  setSynthFrequency: (freq: number) => void
  setSynthAmplitude: (amp: number) => void
  setLastMessage: (msg: OSCMessage) => void

  // OSC senders
  sendFrequency: (freq: number) => Promise<void>
  sendAmplitude: (amp: number) => Promise<void>
}

export const useMyOSCStore = create<MyOSCStore>((set) => ({
  // Initial state
  synthFrequency: 440.0,
  synthAmplitude: 0.5,
  lastMessage: null,

  // State setters
  setSynthFrequency: (freq) => set({ synthFrequency: freq }),
  setSynthAmplitude: (amp) => set({ synthAmplitude: amp }),
  setLastMessage: (msg) => set({ lastMessage: msg }),

  // OSC senders
  sendFrequency: async (freq) => {
    await window.api.osc.send('/synth/freq', [freq])
    set({ synthFrequency: freq }) // Optimistic update
  },
  sendAmplitude: async (amp) => {
    await window.api.osc.send('/synth/amp', [amp])
    set({ synthAmplitude: amp }) // Optimistic update
  }
}))

// Setup listeners
export function setupMyOSCListeners() {
  window.api.osc.onMessage((msg) => {
    const store = useMyOSCStore.getState()
    store.setLastMessage(msg)

    // Route incoming messages
    switch (msg.address) {
      case '/synth/freq':
        store.setSynthFrequency(msg.args[0] as number)
        break
      case '/synth/amp':
        store.setSynthAmplitude(msg.args[0] as number)
        break
    }
  })
}


Example 2: Separate stores for different concerns
-------------------------------------------------
// Transport store
interface TransportStore {
  isPlaying: boolean
  tempo: number
  play: () => Promise<void>
  stop: () => Promise<void>
  setTempo: (tempo: number) => Promise<void>
}

export const useTransportStore = create<TransportStore>((set) => ({
  isPlaying: false,
  tempo: 120,

  play: async () => {
    await window.api.osc.send('/transport/play')
    set({ isPlaying: true })
  },

  stop: async () => {
    await window.api.osc.send('/transport/stop')
    set({ isPlaying: false })
  },

  setTempo: async (tempo) => {
    await window.api.osc.send('/transport/tempo', [tempo])
    set({ tempo })
  }
}))

// Mixer store
interface MixerStore {
  tracks: Array<{ volume: number; mute: boolean }>
  setTrackVolume: (index: number, volume: number) => Promise<void>
  setTrackMute: (index: number, mute: boolean) => Promise<void>
}

export const useMixerStore = create<MixerStore>((set) => ({
  tracks: Array(8).fill({ volume: 0.8, mute: false }),

  setTrackVolume: async (index, volume) => {
    await window.api.osc.send(`/track/${index}/volume`, [volume])
    set((state) => {
      const newTracks = [...state.tracks]
      newTracks[index] = { ...newTracks[index], volume }
      return { tracks: newTracks }
    })
  },

  setTrackMute: async (index, mute) => {
    await window.api.osc.send(`/track/${index}/mute`, [mute ? 1 : 0])
    set((state) => {
      const newTracks = [...state.tracks]
      newTracks[index] = { ...newTracks[index], mute }
      return { tracks: newTracks }
    })
  }
}))

// Setup listeners for both stores
export function setupAllListeners() {
  window.api.osc.onMessage((msg) => {
    // Route to transport store
    if (msg.address.startsWith('/transport/')) {
      const transport = useTransportStore.getState()
      if (msg.address === '/transport/state') {
        const playing = msg.args[0] === 1
        const tempo = msg.args[1] as number
        transport.isPlaying = playing
        transport.tempo = tempo
      }
    }

    // Route to mixer store
    if (msg.address.startsWith('/track/')) {
      const match = msg.address.match(/\/track\/(\d+)\/(\w+)/)
      if (match) {
        const index = parseInt(match[1])
        const property = match[2]
        const mixer = useMixerStore.getState()

        // Update mixer state based on property
        // mixer.setTrackVolume, etc.
      }
    }
  })
}


Example 3: Using middleware for logging/debugging
-------------------------------------------------
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface MyStore {
  value: number
  setValue: (val: number) => void
}

export const useMyStore = create<MyStore>()(
  devtools(
    (set) => ({
      value: 0,
      setValue: (val) => set({ value: val }, false, 'setValue')
    }),
    { name: 'MyOSCStore' }
  )
)

// Now you can use Redux DevTools to inspect state changes


Example 4: Pattern-based routing with helper functions
------------------------------------------------------
// Create helper functions for common patterns
function parseTrackMessage(address: string): { index: number; property: string } | null {
  const match = address.match(/\/track\/(\d+)\/(\w+)/)
  if (match) {
    return {
      index: parseInt(match[1]),
      property: match[2]
    }
  }
  return null
}

function parseSynthMessage(address: string): { param: string } | null {
  const match = address.match(/\/synth\/(\w+)/)
  if (match) {
    return { param: match[1] }
  }
  return null
}

// Use in listener setup
export function setupSmartListeners() {
  window.api.osc.onMessage((msg) => {
    // Route track messages
    const trackInfo = parseTrackMessage(msg.address)
    if (trackInfo) {
      console.log(`Track ${trackInfo.index} ${trackInfo.property}:`, msg.args[0])
      // Update store...
    }

    // Route synth messages
    const synthInfo = parseSynthMessage(msg.address)
    if (synthInfo) {
      console.log(`Synth ${synthInfo.param}:`, msg.args[0])
      // Update store...
    }
  })
}
*/
