import { create } from 'zustand'

interface InputState {
  input: string
  setInput: (input: string) => void
}

export const useInputStore = create<InputState>((set) => ({
  input: '',
  setInput: (input) => {
    set({ input })
  }
}))
