import { create } from 'zustand'

export type PanelId =
  | 'live-preview'
  | 'ableton-monitor'
  | 'hydra-preview'
  | 'video-controls'
  | 'hydra-patches'
  | 'project-config'
  | null

export type ProjectConfigTab = 'config' | 'hydra'

interface FocusState {
  focusedPanel: PanelId
  activeProjectConfigTab: ProjectConfigTab
  setFocusedPanel: (panelId: PanelId) => void
  setActiveProjectConfigTab: (tab: ProjectConfigTab) => void
}

export const useFocusStore = create<FocusState>((set) => ({
  focusedPanel: null,
  activeProjectConfigTab: 'config',
  setFocusedPanel: (panelId) => set({ focusedPanel: panelId }),
  setActiveProjectConfigTab: (tab) => set({ activeProjectConfigTab: tab })
}))
