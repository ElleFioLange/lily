import { create } from 'zustand'

interface BrowserState {
  /** The file browser shows over the focused Hydra patch */
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

export const useBrowserStore = create<BrowserState>((set) => ({
  open: true,
  setOpen: (open) => set({ open }),
  toggle: () => set((state) => ({ open: !state.open }))
}))
