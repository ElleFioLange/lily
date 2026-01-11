import { create } from 'zustand'
import { Compositor, CompositorSource } from '../lib/Compositor'

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

  // Compositor management
  addSource: (source: CompositorSource) => void
  removeSource: (id: string) => void
  addOutput: (output: { id: string; canvas: HTMLCanvasElement }) => void
  removeOutput: (id: string) => void
  setSourceAlpha: (id: string, alpha: number) => void
  setSourceEnabled: (id: string, enabled: boolean) => void
}

export const usePerformanceStore = create<PerformanceState>((set, get) => ({
  isOpen: false,
  windowRef: null,
  compositorRef: null,

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
    const { compositorRef } = get()
    if (windowRef !== null) compositorRef?.attachWindow(windowRef)
    else compositorRef?.detachWindow()
    set({ windowRef })
  },

  setCompositorRef: (compositorRef) => set({ compositorRef }),

  addSource: (source) => {
    const { compositorRef } = get()
    compositorRef?.addSource(source)
  },

  removeSource: (id) => {
    const { compositorRef } = get()
    compositorRef?.removeSource(id)
  },

  addOutput: (output) => {
    const { compositorRef } = get()
    compositorRef?.addOutput(output)
  },

  removeOutput: (id) => {
    const { compositorRef } = get()
    compositorRef?.removeOutput(id)
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
