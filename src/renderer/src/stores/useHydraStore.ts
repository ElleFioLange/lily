import { create } from 'zustand'
import { useConfigurationStore } from './useConfigurationStore'

interface HydraState {
  evaluationVersion: number
  lastError: string | null
  evaluateShader: () => Promise<void>
  setError: (error: string | null) => void
}

export const useHydraStore = create<HydraState>((set) => ({
  evaluationVersion: 0,
  lastError: null,

  evaluateShader: async () => {
    // Get current shader code from configuration store
    const code = useConfigurationStore.getState().hydraShader

    // Increment version to trigger re-evaluation in components
    set((state) => ({ evaluationVersion: state.evaluationVersion + 1 }))

    // Send to popup window via IPC
    await window.api.hydra.evaluate(code)
  },

  setError: (error) => set({ lastError: error })
}))
