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

  // Selection state — shared between Monitor and Workspace
  selectedTrack: AbletonTrack | null
  selectedDevice: AbletonDevice | null
  selectedParam: AbletonDeviceParameter | null
  selectedKeyword: string | null

  setAbletonProjectBuffer: (buffer: AbletonProjectBuffer) => void
  setAbletonProject: (state: AbletonProject) => void
  setSelectedTrack: (track: AbletonTrack | null) => void
  setSelectedDevice: (device: AbletonDevice | null) => void
  setSelectedParam: (param: AbletonDeviceParameter | null) => void
  setSelectedKeyword: (keyword: string | null) => void
}

export const createAbletonStore = (instanceId: string): UseStore<AbletonState> => {
  return create<AbletonState>((set) => ({
    instanceId,
    abletonProjectBuffer: {},
    abletonProject: {},

    selectedTrack: null,
    selectedDevice: null,
    selectedParam: null,
    selectedKeyword: null,

    setAbletonProjectBuffer: (buffer) => set({ abletonProjectBuffer: buffer }),
    setAbletonProject: (state) => set({ abletonProject: state }),

    // Cascading resets: selecting a track clears device + param; device clears param
    setSelectedTrack: (selectedTrack) =>
      set({ selectedTrack, selectedDevice: null, selectedParam: null }),
    setSelectedDevice: (selectedDevice) => set({ selectedDevice, selectedParam: null }),
    setSelectedParam: (selectedParam) => set({ selectedParam }),
    setSelectedKeyword: (selectedKeyword) => set({ selectedKeyword })
  }))
}
