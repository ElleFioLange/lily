import { PluginState } from 'src/types/plugins'
import { create } from 'zustand'

export interface StrudelState extends PluginState {
  code: string
  poiesis: string
  isPlaying: boolean
  bpm: number
  error: string | null
  isLoading: boolean

  setCode: (code: string) => void
  setPoiesis: (poiesis: string) => void
  setIsPlaying: (isPlaying: boolean) => void
  setBpm: (bpm: number) => void
  setError: (error: string | null) => void
  setIsLoading: (isLoading: boolean) => void
}

export const createStrudelStore = (instanceId: string) => {
  return create<StrudelState>((set) => ({
    instanceId,
    code: '',
    poiesis: '',
    isPlaying: false,
    bpm: 120,
    error: null,
    isLoading: false,

    setCode: (code) => set({ code }),
    setPoiesis: (poiesis) => set({ poiesis }),
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setBpm: (bpm) => set({ bpm }),
    setError: (error) => set({ error }),
    setIsLoading: (isLoading) => set({ isLoading })
  }))
}
