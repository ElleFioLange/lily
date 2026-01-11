import { create } from 'zustand'
import type { Compositor, CompositorSource } from '../lib/Compositor'

interface PerformanceState {
  // Window state
  isOpen: boolean
  windowRef: Window | null
  compositorRef: Compositor | null

  // Actions
  openWindow: () => void
  closeWindow: () => void
  toggleWindow: () => void
  setWindowRef: (win: Window | null) => void
  setCompositorRef: (compositor: Compositor | null) => void

  // Source management (delegates to compositor)
  addSource: (source: CompositorSource) => void
  removeSource: (id: string) => void
  setSourceAlpha: (id: string, alpha: number) => void
  setSourceEnabled: (id: string, enabled: boolean) => void
}

export const usePerformanceStore = create<PerformanceState>((set, get) => ({
  isOpen: false,
  windowRef: null,
  compositorRef: null,

  openWindow: () => set({ isOpen: true }),

  closeWindow: () => set({ isOpen: false, windowRef: null, compositorRef: null }),

  toggleWindow: () => {
    const { isOpen } = get()
    if (isOpen) {
      get().closeWindow()
    } else {
      get().openWindow()
    }
  },

  setWindowRef: (windowRef) => set({ windowRef }),

  setCompositorRef: (compositorRef) => set({ compositorRef }),

  addSource: (source) => {
    const { compositorRef } = get()
    compositorRef?.addSource(source)
  },

  removeSource: (id) => {
    const { compositorRef } = get()
    compositorRef?.removeSource(id)
  },

  setSourceAlpha: (id, alpha) => {
    const { compositorRef } = get()
    compositorRef?.setSourceAlpha(id, alpha)
  },

  setSourceEnabled: (id, enabled) => {
    const { compositorRef } = get()
    compositorRef?.setSourceEnabled(id, enabled)
  }
}))
