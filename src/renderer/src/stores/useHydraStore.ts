import { create } from 'zustand'
import { useConfigurationStore } from './useConfigurationStore'

interface HydraState {
  evaluationVersion: number
  lastError: string | null
  evaluateShader: (override?: string) => Promise<void>
  setError: (error: string | null) => void
}

export const useHydraStore = create<HydraState>((set) => ({
  evaluationVersion: 0,
  lastError: null,

  // TODO fix bug with arrow functions not updating smoothly and instead being evaluated statically
  evaluateShader: async (override?: string) => {
    // Get current shader code from configuration store
    const code = override ? override : useConfigurationStore.getState().hydraShader

    // Increment version to trigger re-evaluation in components
    set((state) => ({ evaluationVersion: state.evaluationVersion + 1 }))

    // Send to popup window via IPC
    await window.api.hydra.evaluate(code)
  },

  setError: (error) => set({ lastError: error })
}))
