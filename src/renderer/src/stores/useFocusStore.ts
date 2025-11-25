import { create } from 'zustand'

export type PanelId =
  | 'live-preview'
  | 'ableton-monitor'
  | 'hydra-preview'
  | 'video-controls'
  | 'hydra-patches'
  | 'project-config'
  | null

interface FocusState {
  focusedPanel: PanelId
  setFocusedPanel: (panelId: PanelId) => void
}

export const useFocusStore = create<FocusState>((set) => ({
  focusedPanel: null,
  setFocusedPanel: (panelId) => set({ focusedPanel: panelId })
}))
