// Ableton Live Project Store
import { create } from 'zustand'

// ============================================================================
// Live Store Interface
// ============================================================================

type LiveProject = Record<string, any>
type LiveProjectBuffer = Record<number, string>

interface LiveStoreInterface {
  // State
  liveProjectBuffer: LiveProjectBuffer
  liveProject: LiveProject

  // Actions
  setLiveProjectBuffer: (buffer: LiveProjectBuffer) => void
  setLiveProject: (state: LiveProject) => void
}

// ============================================================================
// Live Store Implementation
// ============================================================================

export const useLiveStore = create<LiveStoreInterface>((set) => ({
  // Initial state
  liveProjectBuffer: {},
  liveProject: {},

  setLiveProjectBuffer: (buffer: LiveProjectBuffer) => set({ liveProjectBuffer: buffer }),
  setLiveProject: (state) => set({ liveProject: state })
}))
