import { PluginState } from 'src/types/plugins'
import { create } from 'zustand'

type HydraInstance = any

// Layout of the shader text overlay in the performance window.
// x/y are the text box's top-left offset as a percentage of the window.
export type PerformanceText = {
  fontSize: number
  x: number
  y: number
}

export const DEFAULT_PERFORMANCE_TEXT: PerformanceText = { fontSize: 14, x: 0, y: 0 }

export interface HydraState extends PluginState {
  // Hydra objects
  hydra: HydraInstance | null
  canvas: null | HTMLCanvasElement

  // Input objects
  shader: string
  scrollPercentage: number

  // File objects
  shaderPath: string | null
  shaderName: string | null

  // Validation objects
  isValid: boolean
  error: string | null

  // Monitor (synced second hydra instance shown in the workspace)
  monitorActive: boolean
  monitorHydra: HydraInstance | null
  monitorCanvas: HTMLCanvasElement | null

  // Performance window text layout
  performanceText: PerformanceText

  // Setters
  setHydra: (hydra: HydraInstance) => void
  setCanvas: (canvas: HTMLCanvasElement) => void
  setShader: (shader: string) => void
  setScrollPercentage: (scrollPercentage: number) => void
  setShaderPath: (path: string | null) => void
  setShaderName: (name: string | null) => void
  setIsValid: (isValid: boolean) => void
  setError: (error: string | null) => void
  setMonitorHydra: (hydra: HydraInstance | null) => void
  setMonitorCanvas: (canvas: HTMLCanvasElement | null) => void
  toggleMonitor: () => void
  setPerformanceText: (updates: Partial<PerformanceText>) => void
  newShader: () => void
  openShader: (content: string, path: string) => void
}

export const createHydraStore = (instanceId: string) => {
  return create<HydraState>((set) => ({
    instanceId,
    hydra: null,
    canvas: null,
    shader: '',
    scrollPercentage: 0,
    shaderPath: null,
    shaderName: 'new-shader',
    isValid: true,
    error: null,
    monitorActive: false,
    monitorHydra: null,
    monitorCanvas: null,
    performanceText: DEFAULT_PERFORMANCE_TEXT,

    setHydra: (hydra) => set({ hydra }),

    setCanvas: (canvas) => set({ canvas }),

    setShader: (shader) => set({ shader }),

    setScrollPercentage: (scrollPercentage) => set({ scrollPercentage }),

    setShaderPath: (shaderPath) => set({ shaderPath }),

    setShaderName: (shaderName) => set({ shaderName }),

    setIsValid: (isValid) => set({ isValid }),

    newShader: () => {
      set({
        shader: '',
        shaderPath: null,
        shaderName: 'new-shader',
        isValid: true,
        error: null
      })
    },

    openShader: (content, path) => {
      const name =
        path
          .split('/')
          .at(-1)
          ?.replace(/\.[^.]+$/, '') ?? path
      set({ shader: content, shaderPath: path, shaderName: name, isValid: true, error: null })
    },

    setError: (error) => set({ error }),

    setMonitorHydra: (monitorHydra) => set({ monitorHydra }),

    setMonitorCanvas: (monitorCanvas) => set({ monitorCanvas }),

    toggleMonitor: () => set((state) => ({ monitorActive: !state.monitorActive })),

    setPerformanceText: (updates) =>
      set((state) => ({ performanceText: { ...state.performanceText, ...updates } }))
  }))
}
