// Ableton Live Project Store
//
// Live-set data is read from the extension bridge (extensions/lily —
// http://127.0.0.1:7879), replacing the old Max-for-Live get-state packet
// path. The M4L device remains the *control* side only (firing clips via
// /set/... OSC); the SDK extension is the *read* side.
import { create } from 'zustand'
import {
  fetchSnapshot,
  toLiveTracks,
  type LiveTrack,
  type ProjectSnapshot,
  type SelectionPayload
} from './bridge'

// ============================================================================
// Live Store Interface
// ============================================================================

export interface LiveState {
  instanceId: string

  // Live set (from GET /snapshot)
  snapshot: ProjectSnapshot | null
  /** Filetree-shaped view of snapshot.tracks (maxPath as every node id) */
  liveTracks: LiveTrack[]
  refreshing: boolean
  refreshError: string | null

  // Last "Show in Lily" push from the extension (/lily/select)
  selection: SelectionPayload | null

  // Actions
  refresh: () => Promise<void>
  setSelection: (selection: SelectionPayload | null) => void
}

// ============================================================================
// Live Store Implementation
// ============================================================================

export const createLiveStore = (instanceId: string) => {
  return create<LiveState>((set) => ({
    instanceId,
    snapshot: null,
    liveTracks: [],
    refreshing: false,
    refreshError: null,
    selection: null,

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

    setSelection: (selection) => set({ selection })
  }))
}
