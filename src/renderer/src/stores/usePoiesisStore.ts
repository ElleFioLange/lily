import { create } from 'zustand'
// import { useHydraStore } from './useHydraStore'
// import parseInput, { ParseAbletonResult } from '@renderer/utils/parseInput'

interface PoiesisState {
  poiesis: string
  setPoiesis: (input: string) => void
  evaluateInput: () => void
}

export const usePoiesisStore = create<PoiesisState>((set, get) => ({
  poiesis: '',
  setPoiesis: (poiesis) => {
    set({ poiesis })
  },
  evaluateInput: () => {
    console.log('Evaluate the input')
    // useHydraStore.getState().evaluateShader()
    // const { input } = get()
    // const messages = parseInput(input, 'ableton') as any as ParseAbletonResult
    // messages.forEach(({ address, args }) => {
    //   window.api.osc.send(address, args)
    // })
  }
}))
