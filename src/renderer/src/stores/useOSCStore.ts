// Ableton Live Project Store
import { create } from 'zustand'
import type { OSCMessage } from '../../../types/osc-messages'
import { useLiveStore } from './useLiveStore'

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
// Store Interface
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
// Store Implementation
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
    const liveStore = useLiveStore.getState()

    // Update last message
    oscStore.setLastMessage(message)

    if (message.address === '/send/state') {
      const payload = message.args[0] as string

      // Messages are sent with a structure that looks like messageIndex/totalMessages [DATA]
      // First break out marker and data using space character as separation point
      const breakIndex = payload.indexOf(' ')
      const marker = payload.slice(0, breakIndex)
      const data = payload.slice(breakIndex + 1)

      // Then break out the message index and total number of messages from the marker
      const [messageIndex, totalMessages] = marker.split('/')

      if (!liveStore.liveProjectBuffer[messageIndex])
        console.error('Received duplicate packet #' + messageIndex)

      liveStore.setLiveProjectBuffer({ ...liveStore.liveProjectBuffer, [messageIndex]: data })

      if (messageIndex === totalMessages) {
        const messages = Object.values(liveStore.liveProjectBuffer)

        // liveStore doesn't update from new set state immediately
        if (messages.length !== Number(totalMessages)) messages.push(data)

        const fullData = messages.reduce((a, b) => a + b)
        liveStore.setLiveProject(JSON.parse(fullData))
        liveStore.setLiveProjectBuffer({})
      }
      // const state = JSON.parse(message.args[0] as string)
      // console.log('live project state: \n', state)
      // liveStore.setLiveProject(state)
    }

    console.log('OSC Message Received:', message.address, message.args)
  })
}
