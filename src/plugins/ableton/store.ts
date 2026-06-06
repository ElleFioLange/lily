// Ableton Live Project Store
import { create } from 'zustand'
import { UseStore } from 'src/types/plugins'

// ============================================================================
// Live Store Interface
// ============================================================================

type LiveProjectBuffer = Record<string, string>

export interface LiveState {
  instanceId: string
  liveProjectBuffer: LiveProjectBuffer
  liveProject: LiveProject | Record<string, never>

  setLiveProjectBuffer: (buffer: LiveProjectBuffer) => void
  setLiveProject: (state: LiveProject) => void
}

// ============================================================================
// Store Registry (idempotent — init.ts and Monitor.tsx share the same instance)
// ============================================================================

const storeRegistry = new Map<string, UseStore<LiveState>>()

export const createLiveStore = (instanceId: string): UseStore<LiveState> => {
  if (storeRegistry.has(instanceId)) return storeRegistry.get(instanceId)!

  const store = create<LiveState>((set) => ({
    instanceId,
    liveProjectBuffer: {},
    liveProject: {},

    setLiveProjectBuffer: (buffer) => set({ liveProjectBuffer: buffer }),
    setLiveProject: (state) => set({ liveProject: state })
  }))

  storeRegistry.set(instanceId, store)
  return store
}

export const getLiveStore = (instanceId: string): UseStore<LiveState> | undefined =>
  storeRegistry.get(instanceId)

export const removeLiveStore = (instanceId: string): void => {
  storeRegistry.delete(instanceId)
}
