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
  blendMode: 'source-over' as BlendMode
}

const graphicsDefaultParams = {
  ...defaultParams,
  enabled: true
}

const editorDefaultParams = {
  ...defaultParams,
  enabled: false
}

export interface GraphicsState {
  graphics: Record<string, MixerParams>
  editors: Record<string, MixerParams>
  graphicsOrder: string[]
  editorsOrder: string[]
  compositorRef: Compositor | null

  updateParams: (id: string, type: 'graphics' | 'editors', updates: Partial<MixerParams>) => void
  reorderSource: (type: 'graphics' | 'editors', fromIndex: number, toIndex: number) => void
  setOrder: (type: 'graphics' | 'editors', ids: string[]) => void
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
  graphicsOrder: [],
  editorsOrder: [],
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

  reorderSource: (type, fromIndex, toIndex) => {
    const newOrder = [...get()[type === 'graphics' ? 'graphicsOrder' : 'editorsOrder']]
    const [moved] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, moved)
    get().setOrder(type, newOrder)
  },

  setOrder: (type, ids) => {
    const { compositorRef, graphics, editors } = get()
    if (type === 'graphics') {
      const newGraphics = { ...graphics }
      ids.forEach((id, i) => {
        newGraphics[id] = { ...newGraphics[id], zIndex: i }
        compositorRef?.updateSource(id, { zIndex: i })
      })
      set({ graphicsOrder: ids, graphics: newGraphics })
    } else {
      const newEditors = { ...editors }
      ids.forEach((id, i) => {
        newEditors[id] = { ...newEditors[id], zIndex: i }
      })
      set({ editorsOrder: ids, editors: newEditors })
    }
  },

  setCompositorRef: (compositorRef) => set({ compositorRef }),

  addGraphicsSource: ({ id, canvas, initParams }) => {
    const { compositorRef, graphics, graphicsOrder } = get()
    const zIndex = graphicsOrder.length
    const params = { ...graphicsDefaultParams, zIndex, ...initParams }
    compositorRef?.addSource({ id, canvas, ...params })
    set({
      graphics: { ...graphics, [id]: params },
      graphicsOrder: [...graphicsOrder, id]
    })
  },

  addEditorSource: ({ id, initParams }) => {
    const { editors, editorsOrder } = get()
    const zIndex = editorsOrder.length
    const params = { ...editorDefaultParams, zIndex, ...initParams }
    set({
      editors: { ...editors, [id]: params },
      editorsOrder: [...editorsOrder, id]
    })
  },

  removeSource: (id) => {
    const { compositorRef, graphics, graphicsOrder, editors, editorsOrder } = get()
    if (graphics[id] !== undefined) {
      compositorRef?.removeSource(id)
      const newGraphics = { ...graphics }
      delete newGraphics[id]
      set({ graphics: newGraphics, graphicsOrder: graphicsOrder.filter((x) => x !== id) })
    }
    if (editors[id] !== undefined) {
      const newEditors = { ...editors }
      delete newEditors[id]
      set({ editors: newEditors, editorsOrder: editorsOrder.filter((x) => x !== id) })
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
