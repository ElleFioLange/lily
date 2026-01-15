import { create } from 'zustand'

interface PerformanceState {
  // Window state
  isOpen: boolean
  windowRef: Window | null

  // Actions
  openWindow: () => void
  closeWindow: () => void
  toggleWindow: () => void
  setWindowRef: (win: Window | null) => void
}

export const usePerformanceStore = create<PerformanceState>((set, get) => ({
  isOpen: false,
  windowRef: null,

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
  }
}))
