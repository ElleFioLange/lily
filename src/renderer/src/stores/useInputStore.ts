import { create } from 'zustand'
import { useHydraStore } from './useHydraStore'
import parseInput, { ParseAbletonResult } from '@renderer/utils/parseInput'

interface InputState {
  input: string
  setInput: (input: string) => void
  evaluateInput: () => void
}

export const useInputStore = create<InputState>((set, get) => ({
  input: '',
  setInput: (input) => {
    set({ input })
  },
  evaluateInput: () => {
    useHydraStore.getState().evaluateShader()
    const { input } = get()
    const messages = parseInput(input, 'ableton') as any as ParseAbletonResult
    messages.forEach(({ address, args }) => {
      window.api.osc.send(address, args)
    })
  }
}))
