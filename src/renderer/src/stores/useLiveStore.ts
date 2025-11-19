import { create } from 'zustand'
import type { TransportState, TrackState, ConnectionState } from '../../../types/osc-messages'

interface LiveStore {
  // Transport state
  transport: TransportState

  // Mixer state (8 tracks)
  tracks: TrackState[]

  // Connection state
  connection: ConnectionState

  // Actions - Transport
  setPlaying: (isPlaying: boolean) => void
  setTempo: (tempo: number) => void
  setCurrentBeat: (beat: number) => void
  play: () => Promise<void>
  stop: () => Promise<void>
  changeTempo: (tempo: number) => Promise<void>

  // Actions - Tracks
  setTrackVolume: (trackIndex: number, volume: number) => Promise<void>
  setTrackPan: (trackIndex: number, pan: number) => Promise<void>
  setTrackMute: (trackIndex: number, mute: boolean) => Promise<void>
  setTrackSolo: (trackIndex: number, solo: boolean) => Promise<void>
  setTrackName: (trackIndex: number, name: string) => void
  updateTrackState: (trackIndex: number, state: Partial<TrackState>) => void

  // Actions - Scenes
  fireScene: (sceneIndex: number) => Promise<void>

  // Actions - Connection
  setConnected: (connected: boolean) => void
  setDeviceVersion: (version: number) => void
  updateLastMessageTime: () => void

  // Actions - Initialization
  requestInit: () => Promise<void>
}

// Create initial track states
const createInitialTracks = (): TrackState[] => {
  return Array.from({ length: 8 }, (_, i) => ({
    volume: 0.85,
    pan: 0,
    mute: false,
    solo: false,
    name: `Track ${i + 1}`
  }))
}

export const useLiveStore = create<LiveStore>((set) => ({
  // Initial state
  transport: {
    isPlaying: false,
    tempo: 120,
    currentBeat: 0
  },

  tracks: createInitialTracks(),

  connection: {
    connected: false,
    lastMessageTime: null,
    deviceVersion: null
  },

  // Transport actions
  setPlaying: (isPlaying) =>
    set((state) => ({
      transport: { ...state.transport, isPlaying }
    })),

  setTempo: (tempo) =>
    set((state) => ({
      transport: { ...state.transport, tempo }
    })),

  setCurrentBeat: (beat) =>
    set((state) => ({
      transport: { ...state.transport, currentBeat: beat }
    })),

  play: async () => {
    await window.api.osc.transportPlay()
    set((state) => ({
      transport: { ...state.transport, isPlaying: true }
    }))
  },

  stop: async () => {
    await window.api.osc.transportStop()
    set((state) => ({
      transport: { ...state.transport, isPlaying: false }
    }))
  },

  changeTempo: async (tempo) => {
    await window.api.osc.transportSetTempo(tempo)
    set((state) => ({
      transport: { ...state.transport, tempo }
    }))
  },

  // Track actions
  setTrackVolume: async (trackIndex, volume) => {
    await window.api.osc.trackSetVolume(trackIndex, volume)
    set((state) => {
      const newTracks = [...state.tracks]
      newTracks[trackIndex] = { ...newTracks[trackIndex], volume }
      return { tracks: newTracks }
    })
  },

  setTrackPan: async (trackIndex, pan) => {
    await window.api.osc.trackSetPan(trackIndex, pan)
    set((state) => {
      const newTracks = [...state.tracks]
      newTracks[trackIndex] = { ...newTracks[trackIndex], pan }
      return { tracks: newTracks }
    })
  },

  setTrackMute: async (trackIndex, mute) => {
    await window.api.osc.trackSetMute(trackIndex, mute)
    set((state) => {
      const newTracks = [...state.tracks]
      newTracks[trackIndex] = { ...newTracks[trackIndex], mute }
      return { tracks: newTracks }
    })
  },

  setTrackSolo: async (trackIndex, solo) => {
    await window.api.osc.trackSetSolo(trackIndex, solo)
    set((state) => {
      const newTracks = [...state.tracks]
      newTracks[trackIndex] = { ...newTracks[trackIndex], solo }
      return { tracks: newTracks }
    })
  },

  setTrackName: (trackIndex, name) =>
    set((state) => {
      const newTracks = [...state.tracks]
      newTracks[trackIndex] = { ...newTracks[trackIndex], name }
      return { tracks: newTracks }
    }),

  updateTrackState: (trackIndex, trackState) =>
    set((state) => {
      const newTracks = [...state.tracks]
      newTracks[trackIndex] = { ...newTracks[trackIndex], ...trackState }
      return { tracks: newTracks }
    }),

  // Scene actions
  fireScene: async (sceneIndex) => {
    await window.api.osc.sceneFire(sceneIndex)
  },

  // Connection actions
  setConnected: (connected) =>
    set((state) => ({
      connection: { ...state.connection, connected }
    })),

  setDeviceVersion: (version) =>
    set((state) => ({
      connection: { ...state.connection, deviceVersion: version }
    })),

  updateLastMessageTime: () =>
    set((state) => ({
      connection: { ...state.connection, lastMessageTime: Date.now() }
    })),

  // Initialization
  requestInit: async () => {
    await window.api.osc.requestInit()
  }
}))

// Helper function to setup OSC event listeners
export function setupOSCListeners(): void {
  // Listen for transport state updates
  window.api.osc.onTransportState((packet) => {
    const store = useLiveStore.getState()
    if (packet.args.length >= 2) {
      const isPlaying = packet.args[0] === 1
      const tempo = packet.args[1] as number
      store.setPlaying(isPlaying)
      store.setTempo(tempo)
      store.updateLastMessageTime()
    }
  })

  // Listen for track updates
  window.api.osc.onTrackUpdate((data) => {
    const store = useLiveStore.getState()
    const { trackIndex, property, args } = data

    if (trackIndex < 0 || trackIndex >= 8) return

    switch (property) {
      case 'volume':
        if (args.length > 0) {
          store.updateTrackState(trackIndex, { volume: args[0] as number })
        }
        break
      case 'pan':
        if (args.length > 0) {
          store.updateTrackState(trackIndex, { pan: args[0] as number })
        }
        break
      case 'mute':
        if (args.length > 0) {
          store.updateTrackState(trackIndex, { mute: args[0] === 1 })
        }
        break
      case 'solo':
        if (args.length > 0) {
          store.updateTrackState(trackIndex, { solo: args[0] === 1 })
        }
        break
      case 'name':
        if (args.length > 0) {
          store.setTrackName(trackIndex, args[0] as string)
        }
        break
      case 'state':
        // Full state update [volume, pan, mute, solo, name]
        if (args.length >= 5) {
          store.updateTrackState(trackIndex, {
            volume: args[0] as number,
            pan: args[1] as number,
            mute: args[2] === 1,
            solo: args[3] === 1,
            name: args[4] as string
          })
        }
        break
    }

    store.updateLastMessageTime()
  })

  // Listen for initialization complete
  window.api.osc.onInitComplete((version) => {
    const store = useLiveStore.getState()
    store.setDeviceVersion(version)
    store.setConnected(true)
    store.updateLastMessageTime()
  })

  // Listen for connection changes
  window.api.osc.onConnectionChange((connected) => {
    const store = useLiveStore.getState()
    store.setConnected(connected)
    if (connected) {
      store.updateLastMessageTime()
      // Request initialization when connected
      store.requestInit()
    }
  })
}
