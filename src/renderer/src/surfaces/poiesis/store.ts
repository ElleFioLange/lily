import { PluginState } from 'src/types/plugins'
import { create } from 'zustand'
// import { useHydraStore } from './useHydraStore'
// import parseInput, { ParseAbletonResult } from '@renderer/utils/parseInput'

export interface PoiesisState extends PluginState {
  poiesis: string
  triggerAnimationFlag: boolean
  scrollPercentage: number

  setPoiesis: (input: string) => void
  setTriggerAnimationFlag: (triggerAnimationFlag: boolean) => void
  setScrollPercentage: (scrollPercentage: number) => void

  config: any

  setConfig: any

  openSurface: 'poiesis' | 'config'
  setOpenSurface: (openSurface: 'poiesis' | 'config') => void
}

export const createPoiesisStore = (instanceId: string) => {
  return create<PoiesisState>((set, get) => ({
    instanceId,
    poiesis: '',
    triggerAnimationFlag: false,
    scrollPercentage: 0,

    setPoiesis: (poiesis) => set({ poiesis }),

    setTriggerAnimationFlag: (triggerAnimationFlag) => set({ triggerAnimationFlag }),

    setScrollPercentage: (scrollPercentage) => set({ scrollPercentage }),

    setConfig: (config) => {
      set({ config })
    },

    config: {
      text: '',
      parsed: {},
      path: null,
      name: 'new-config',
      isValid: true,
      error: null
    },

    updateConfig: (updates) => {
      const { config } = get()
      set({ config: { ...config, updates } })
    },

    openSurface: 'poiesis' as 'poiesis', // Holy shit what the hell

    setOpenSurface: (openSurface) => set({ openSurface })

    // evaluateInput: () => {
    //   console.log('Evaluate the input')
    //   // useHydraStore.getState().evaluateShader()
    //   // const { input } = get()
    //   // const messages = parseInput(input, 'ableton') as any as ParseAbletonResult
    //   // messages.forEach(({ address, args }) => {
    //   //   window.api.osc.send(address, args)
    //   // })
    // }
  }))
}
