import { create } from 'zustand'

export type LayoutType = 'performance' | 'ableton-configuration' | 'hydra-configuration'

interface LayoutState {
  currentLayout: LayoutType
  setLayout: (layout: LayoutType) => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  currentLayout: 'performance',
  setLayout: (layout) => set({ currentLayout: layout })
}))

// Setup listener for layout changes from main process
export function setupLayoutListeners(): void {
  window.api.layout.onLayoutChange((layout: LayoutType) => {
    useLayoutStore.getState().setLayout(layout)
  })
}
