// Ableton Live Project Store
//
// The extension bridge (extensions/lily, http://127.0.0.1:7879) is the single
// read path: refresh() fetches /snapshot and derives BOTH the Monitor's view
// (liveTracks) and the Workspace's get-state-shaped abletonProject from the
// same data, so selection mapping and Live-path indexes always agree. The M4L
// device is control-only (process.ts → /control).
import { create } from 'zustand'
import { UseStore } from 'src/types/plugins'
import { AbletonConfigurationKey, KeyArgument } from 'src/types/config'
import {
  fetchSnapshot,
  toAbletonProject,
  toLiveTracks,
  type LiveTrack,
  type ProjectSnapshot,
  type SelectionPayload
} from './bridge'

// ============================================================================
// Ableton Store Interface
// ============================================================================

type AbletonProjectBuffer = Record<string, string>

/**
 * Map a "Show in Lily" push onto the Workspace's click-selection state so the
 * pushed object also becomes active in the connection/info pane. Returns null
 * when the project isn't loaded yet (refresh re-applies it afterwards).
 */
function selectionToPick(
  sel: SelectionPayload,
  project: AbletonProject | Record<string, never>
): Partial<AbletonState> | null {
  const tracks = (project as AbletonProject).track_data_arr
  if (!tracks?.length) return null
  const ti = sel.trackPath.match(/^live_set tracks (\d+)/)
  const track = ti ? tracks[Number(ti[1])] : undefined
  if (!track) return null

  if (sel.type === 'clip' && !sel.inArrangement) {
    const si = sel.maxPath.match(/clip_slots (\d+) clip$/)
    const slot = si ? (track.clip_slots_data?.[Number(si[1])] ?? null) : null
    return {
      selectedTrack: track,
      selectedClipSlot: slot,
      selectedDevice: null,
      selectedParam: null
    }
  }

  if (sel.type === 'device') {
    const di = sel.maxPath.match(/devices (\d+)$/)
    const device = di ? (track.device_data?.[Number(di[1])] ?? null) : null
    return {
      selectedTrack: track,
      selectedClipSlot: null,
      selectedDevice: device,
      selectedParam: null
    }
  }

  // track push (or arrangement clip falling back to its track)
  return { selectedTrack: track, selectedClipSlot: null, selectedDevice: null, selectedParam: null }
}

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

  // Workspace draft state — persisted across view switches
  pendingKeywords: string[]
  keywordInputValue: string
  poemText: string
  keywordInputExpanded: boolean
  connectionDraft: { ableton: AbletonConfigurationKey; args: Record<string, KeyArgument> } | null
  setPendingKeywords: (keywords: string[]) => void
  setKeywordInputValue: (value: string) => void
  setPoemText: (text: string) => void
  setKeywordInputExpanded: (expanded: boolean) => void
  setConnectionDraft: (
    draft: { ableton: AbletonConfigurationKey; args: Record<string, KeyArgument> } | null
  ) => void

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

    // Workspace draft state
    pendingKeywords: [],
    keywordInputValue: '',
    poemText: '',
    keywordInputExpanded: false,
    connectionDraft: null,
    setPendingKeywords: (pendingKeywords) => set({ pendingKeywords }),
    setKeywordInputValue: (keywordInputValue) => set({ keywordInputValue }),
    setPoemText: (poemText) => set({ poemText }),
    setKeywordInputExpanded: (keywordInputExpanded) => set({ keywordInputExpanded }),
    setConnectionDraft: (connectionDraft) => set({ connectionDraft }),

    // --- Extension-bridge slice ----------------------------------------------
    snapshot: null,
    liveTracks: [],
    refreshing: false,
    refreshError: null,
    selection: null,
    selectionSeq: 0,

    refresh: async () => {
      set({ refreshing: true, refreshError: null, isLoading: true })
      try {
        const snapshot = await fetchSnapshot()
        const abletonProject = toAbletonProject(snapshot)
        set((s) => ({
          snapshot,
          liveTracks: toLiveTracks(snapshot),
          // Same snapshot also feeds the Workspace's connection form
          abletonProject,
          refreshing: false,
          isLoading: false,
          // Re-apply a pending push selection against the fresh project (it may
          // have arrived before the project was loaded).
          ...(s.selection ? (selectionToPick(s.selection, abletonProject) ?? {}) : {})
        }))
      } catch (e) {
        // Bridge unreachable usually means Live (or the extension host) isn't running.
        set({ refreshing: false, isLoading: false, refreshError: String(e) })
      }
    },

    setSelection: (selection) =>
      set((s) => ({
        selection,
        selectionSeq: s.selectionSeq + 1,
        // A push also becomes the active object in the Workspace pane.
        ...(selection ? (selectionToPick(selection, s.abletonProject) ?? {}) : {})
      }))
  }))
}
