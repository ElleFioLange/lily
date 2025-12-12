import { create } from 'zustand'
import { useInputStore } from './useInputStore'
import parseInput, { ParseHydraResult } from '@renderer/utils/parseInput'

// Default Hydra shader template
const DEFAULT_HYDRA_SHADER = `voronoi(1)
  .modulatePixelate(voronoi(100))
  .color([0, 1].smooth().fast(0.5), [1, 0].smooth().fast(0.3))
  .modulatePixelate(osc(3)
    .modulateScale(src(o0))
    .rotate())
  .out()

src(o0)
  .hue([0, Math.PI * 2].smooth().fast(0.1))
  .add(src(o0)
    .repeat(3)
    .modulateRotate(src(o0))
    .modulateScale(src(o1)), 2)
  .mult(noise(4, 1).brightness(0.5))
  .out(o1)

src(o2).brightness(-0.1).add(src(o1), 0.2).modulateScale(src(o1), -0.05).modulateRotate(src(o0)).out(o2)

render(o2)`

interface HydraState {
  rawShader: string
  shader: string
  evaluationVersion: number
  lastError: string | null
  setRawShader: (rawShader: string) => void
  setShader: (shader: string) => void
  setError: (error: string | null) => void
  evaluateShader: () => Promise<void>
}

export const useHydraStore = create<HydraState>((set, get) => ({
  rawShader: DEFAULT_HYDRA_SHADER,
  shader: DEFAULT_HYDRA_SHADER,
  evaluationVersion: 0,
  lastError: null,

  setRawShader: (rawShader) => set({ rawShader }),

  setShader: (shader) => set({ shader }),

  setError: (error) => set({ lastError: error }),

  evaluateShader: async () => {
    const { input } = useInputStore.getState()
    const hydraParams = parseInput(input, 'hydra') as any as ParseHydraResult
    const paramPrefix = hydraParams.reduce(
      (prev, { name, value }) => prev + `let ${name} = ${value}\n`,
      ''
    )

    const { rawShader } = get()

    // TODO this is pretty fragile, look into more robust regex
    const timedShader = rawShader.replaceAll('time', 'synth.time')

    const processedShader = paramPrefix + timedShader

    set((state) => ({ shader: processedShader, evaluationVersion: state.evaluationVersion + 1 }))

    console.log(processedShader)

    // Send to popup window via IPC
    await window.api.hydra.evaluate(processedShader)
  }
}))
