import { create } from 'zustand'

interface PerformanceState {
  // Window state
  isOpen: boolean
  windowRef: Window | null
  /** The control center shows the performance output full-window instead of its panels */
  fullPreview: boolean

  // Actions
  openWindow: () => void
  closeWindow: () => void
  toggleWindow: () => void
  setWindowRef: (win: Window | null) => void
  toggleFullPreview: () => void
  setFullPreview: (fullPreview: boolean) => void
}

export const usePerformanceStore = create<PerformanceState>((set, get) => ({
  isOpen: false,
  windowRef: null,
  fullPreview: false,

  openWindow: () => set({ isOpen: true }),

  closeWindow: () => set({ isOpen: false, windowRef: null }),

  toggleWindow: () => {
    const { isOpen } = get()
    if (isOpen) {
      get().closeWindow()
    } else {
      get().openWindow()
    }
  },

  setWindowRef: (windowRef) => {
    set({ windowRef })
  },

  toggleFullPreview: () => set((state) => ({ fullPreview: !state.fullPreview })),

  setFullPreview: (fullPreview) => set({ fullPreview })
}))
