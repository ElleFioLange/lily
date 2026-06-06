// Ableton Live Project Store
//
// Two read paths coexist for now:
//   - M4L get-state packets (/send/state → abletonProject) — powers the
//     Workspace keyword/connection UI.
//   - Extension bridge (extensions/lily, http://127.0.0.1:7879) — powers the
//     session-style Monitor (snapshot/liveTracks) and "Show in Lily"
//     selection pushes (/lily/select).
import { create } from 'zustand'
import { UseStore } from 'src/types/plugins'
import {
  fetchSnapshot,
  toLiveTracks,
  type LiveTrack,
  type ProjectSnapshot,
  type SelectionPayload
} from './bridge'

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

  // --- Extension-bridge slice (GET /snapshot + /lily/select) ---------------
  snapshot: ProjectSnapshot | null
  /** Filetree-shaped view of snapshot.tracks (maxPath as every node id) */
  liveTracks: LiveTrack[]
  refreshing: boolean
  refreshError: string | null
  /** Last "Show in Lily" push from the extension */
  selection: SelectionPayload | null
  /** Bumped on every push — lets the monitor re-run the highlight pulse even
   *  when the same node is selected twice in a row. */
  selectionSeq: number

  refresh: () => Promise<void>
  setSelection: (selection: SelectionPayload | null) => void
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
    setSelectedKeyword: (selectedKeyword) => set({ selectedKeyword }),

    // --- Extension-bridge slice ----------------------------------------------
    snapshot: null,
    liveTracks: [],
    refreshing: false,
    refreshError: null,
    selection: null,
    selectionSeq: 0,

    refresh: async () => {
      set({ refreshing: true, refreshError: null })
      try {
        const snapshot = await fetchSnapshot()
        set({ snapshot, liveTracks: toLiveTracks(snapshot), refreshing: false })
      } catch (e) {
        // Bridge unreachable usually means Live (or the extension host) isn't running.
        set({ refreshing: false, refreshError: String(e) })
      }
    },

    setSelection: (selection) => set((s) => ({ selection, selectionSeq: s.selectionSeq + 1 }))
  }))
}
