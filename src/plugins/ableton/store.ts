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
  isLoading: boolean

  // Selection state — shared between Monitor and Workspace
  selectedTrack: AbletonTrack | null
  selectedClipSlot: AbletonClipSlot | null // mutually exclusive with device
  selectedDevice: AbletonDevice | null // mutually exclusive with clipSlot
  selectedParam: AbletonDeviceParameter | null
  selectedKeyword: string | null

  setAbletonProjectBuffer: (buffer: AbletonProjectBuffer) => void
  setAbletonProject: (state: AbletonProject) => void
  setIsLoading: (loading: boolean) => void
  setSelectedTrack: (track: AbletonTrack | null) => void
  setSelectedClipSlot: (slot: AbletonClipSlot | null) => void
  setSelectedDevice: (device: AbletonDevice | null) => void
  setSelectedParam: (param: AbletonDeviceParameter | null) => void
  setSelectedKeyword: (keyword: string | null) => void
}

export const createAbletonStore = (instanceId: string): UseStore<AbletonState> => {
  return create<AbletonState>((set) => ({
    instanceId,
    abletonProjectBuffer: {},
    abletonProject: {},
    isLoading: false,

    selectedTrack: null,
    selectedClipSlot: null,
    selectedDevice: null,
    selectedParam: null,
    selectedKeyword: null,

    setAbletonProjectBuffer: (buffer) => set({ abletonProjectBuffer: buffer }),
    setAbletonProject: (state) => set({ abletonProject: state, isLoading: false }),
    setIsLoading: (isLoading) => set({ isLoading }),

    setSelectedTrack: (selectedTrack) =>
      set({ selectedTrack, selectedClipSlot: null, selectedDevice: null, selectedParam: null }),
    setSelectedClipSlot: (selectedClipSlot) =>
      set({ selectedClipSlot, selectedDevice: null, selectedParam: null }),
    setSelectedDevice: (selectedDevice) =>
      set({ selectedDevice, selectedClipSlot: null, selectedParam: null }),
    setSelectedParam: (selectedParam) => set({ selectedParam }),
    setSelectedKeyword: (selectedKeyword) => set({ selectedKeyword })
  }))
}
