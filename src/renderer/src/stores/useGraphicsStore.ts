import { create } from 'zustand'
import { Compositor } from '@renderer/graphics/Compositor'

type MixerParams = {
  alpha: number
  zIndex: number
  blendMode: GlobalCompositeOperation
  enabled: boolean
}

const defaultParams = {
  alpha: 1,
  zIndex: 0,
  blendMode: 'destination-over' as GlobalCompositeOperation,
  enabled: true
}

interface GraphicsState {
  params: Record<string, MixerParams>
  compositorRef: Compositor | null

  updateParams: (id: string, updates: Partial<MixerParams>) => void
  setCompositorRef: (compositor: Compositor | null) => void
  addSource: (source: {
    id: string
    canvas: HTMLCanvasElement | OffscreenCanvas
    initParams?: Partial<MixerParams>
  }) => void
  removeSource: (id: string) => void
  addOutput: (output: { id: string; canvas: HTMLCanvasElement; window: Window }) => void
  removeOutput: (id: string) => void
  startRenderLoop: (outputId: string) => void
  stopRenderLoop: (outputId: string) => void
}

export const useGraphicsStore = create<GraphicsState>((set, get) => ({
  params: {},
  compositorRef: null,

  updateParams: (id, updates) => {
    const { compositorRef, params } = get()
    const source = params[id]
    if (source === undefined) throw new Error('Given invalid ID for source to update')
    const newParams = { ...params, [id]: { ...source, ...updates } }
    set({ params: newParams })
    compositorRef?.updateSource(id, updates)
  },

  setCompositorRef: (compositorRef) => set({ compositorRef }),

  addSource: ({ id, canvas, initParams }) => {
    const { compositorRef, params } = get()
    const source = {
      id,
      canvas,
      ...defaultParams,
      ...initParams
    }
    compositorRef?.addSource(source)
    const newParams = { ...params, [source.id]: { ...defaultParams, ...initParams } }
    set({ params: newParams })
  },

  removeSource: (id) => {
    const { compositorRef, params } = get()
    compositorRef?.removeSource(id)
    const newParams = { ...params }
    delete newParams[id]
    set({ params: newParams })
  },

  addOutput: (output) => {
    const { compositorRef } = get()
    compositorRef?.addOutput(output)
  },

  removeOutput: (id) => {
    const { compositorRef } = get()
    compositorRef?.removeOutput(id)
  },

  startRenderLoop: (outputId) => {
    const { compositorRef } = get()
    compositorRef?.startRenderLoop(outputId)
  },

  stopRenderLoop: (outputId) => {
    const { compositorRef } = get()
    compositorRef?.stopRenderLoop(outputId)
  }
}))
