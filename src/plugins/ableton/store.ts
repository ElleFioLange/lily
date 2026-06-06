// Ableton Live Project Store
import { create } from 'zustand'
import { UseStore } from 'src/types/plugins'

// ============================================================================
// Ableton Store Interface
// ============================================================================

type AbletonProjectBuffer = Record<string, string>

export interface AbletonState {
  instanceId: string
  abletonProjectBuffer: AbletonProjectBuffer
  abletonProject: AbletonProject | Record<string, never>

  setAbletonProjectBuffer: (buffer: AbletonProjectBuffer) => void
  setAbletonProject: (state: AbletonProject) => void
}

export const createAbletonStore = (instanceId: string): UseStore<AbletonState> => {
  return create<AbletonState>((set) => ({
    instanceId,
    abletonProjectBuffer: {},
    abletonProject: {},

    setAbletonProjectBuffer: (buffer) => set({ abletonProjectBuffer: buffer }),
    setAbletonProject: (state) => set({ abletonProject: state })
  }))
}
