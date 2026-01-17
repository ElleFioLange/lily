import { create } from 'zustand'
// import { useHydraStore } from './useHydraStore'
// import parseInput, { ParseAbletonResult } from '@renderer/utils/parseInput'

export interface PoiesisState {
  poiesis: string
  triggerAnimationFlag: boolean
  scrollPercentage: number

  setPoiesis: (input: string) => void
  setTriggerAnimationFlag: (triggerAnimationFlag: boolean) => void
  setScrollPercentage: (scrollPercentage: number) => void
}

export const createPoiesisStore = (instanceId: string) => {
  return create<PoiesisState>((set) => ({
    poiesis: '',
    triggerAnimationFlag: false,
    scrollPercentage: 0,

    setPoiesis: (poiesis) => set({ poiesis }),

    setTriggerAnimationFlag: (triggerAnimationFlag) => set({ triggerAnimationFlag }),

    setScrollPercentage: (scrollPercentage) => set({ scrollPercentage })

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
