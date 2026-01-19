import { create } from 'zustand'
import { Compositor } from '@renderer/graphics/Compositor'

export type BlendMode = Omit<GlobalCompositeOperation, 'copy'>

export type MixerParams = {
  alpha: number
  zIndex: number
  blendMode: BlendMode
  enabled: boolean
}

const defaultParams = {
  alpha: 1,
  zIndex: 0,
  blendMode: 'source-over' as BlendMode,
  enabled: true
}

interface GraphicsState {
  graphics: Record<string, MixerParams>
  editors: Record<string, MixerParams>
  compositorRef: Compositor | null

  updateParams: (id: string, type: 'graphics' | 'editors', updates: Partial<MixerParams>) => void
  setCompositorRef: (compositor: Compositor | null) => void
  addGraphicsSource: (source: {
    id: string
    canvas: HTMLCanvasElement | OffscreenCanvas
    initParams?: Partial<MixerParams>
  }) => void
  addEditorSource: (source: { id: string; initParams?: Partial<MixerParams> }) => void
  removeSource: (id: string) => void
  addOutput: (output: { id: string; canvas: HTMLCanvasElement; window: Window }) => void
  removeOutput: (id: string) => void
  startRenderLoop: (outputId: string) => void
  stopRenderLoop: (outputId: string) => void
}

export const useGraphicsStore = create<GraphicsState>((set, get) => ({
  graphics: {},
  editors: {},
  compositorRef: null,

  updateParams: (id, type, updates) => {
    switch (type) {
      case 'editors': {
        const { editors } = get()
        const source = editors[id]
        if (source === undefined) throw new Error('Given invalid ID for source to update')
        const newEditors = { ...editors, [id]: { ...source, ...updates } }
        set({ editors: newEditors })
        break
      }
      case 'graphics': {
        const { compositorRef, graphics } = get()
        const source = graphics[id]
        if (source === undefined) throw new Error('Given invalid ID for source to update')
        const newGraphics = { ...graphics, [id]: { ...source, ...updates } }
        set({ graphics: newGraphics })
        compositorRef?.updateSource(id, updates)
        break
      }
    }
  },

  setCompositorRef: (compositorRef) => set({ compositorRef }),

  addGraphicsSource: ({ id, canvas, initParams }) => {
    const { compositorRef, graphics } = get()
    const source = {
      id,
      canvas,
      ...defaultParams,
      ...initParams
    }
    compositorRef?.addSource(source)
    const newGraphics = {
      ...graphics,
      [id]: { ...defaultParams, ...initParams }
    }
    set({ graphics: newGraphics })
  },

  addEditorSource: ({ id, initParams }) => {
    const { editors } = get()
    const newEditors = {
      ...editors,
      [id]: { ...defaultParams, ...initParams }
    }
    set({ editors: newEditors })
  },

  removeSource: (id) => {
    const { compositorRef, graphics, editors } = get()
    if (graphics[id] !== undefined) {
      compositorRef?.removeSource(id)
      const newGraphics = { ...graphics }
      delete newGraphics[id]
      set({ graphics: newGraphics })
    }
    if (editors[id] !== undefined) {
      const newEditors = { ...editors }
      delete newEditors[id]
      set({ editors: newEditors })
    }
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
