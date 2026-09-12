import { create } from 'zustand'
import { Compositor } from '@renderer/graphics/Compositor'
import { GraphicsState, MixerParams, useGraphicsStore } from './useGraphicsStore'

type SourceType = 'graphics' | 'editors'

/**
 * Preview mode keeps a separate mix of the live sources so layer combinations can be tried
 * without touching the performance window. Field and action names mirror useGraphicsStore so
 * the same mixer UI (MixerSections) can drive either store.
 */
interface PreviewState {
  active: boolean
  compositor: Compositor

  graphics: Record<string, MixerParams>
  editors: Record<string, MixerParams>
  graphicsOrder: string[]
  editorsOrder: string[]

  toggle: () => void
  updateParams: (id: string, type: SourceType, updates: Partial<MixerParams>) => void
  reorderSource: (type: SourceType, fromIndex: number, toIndex: number) => void
  syncSources: (live: GraphicsState) => void
  copyFromLive: () => void
  sendToLive: () => void
}

const liveCanvas = (live: GraphicsState, id: string) => live.compositorRef?.getSource(id)?.canvas

const sameMembers = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id) => b.includes(id))

// Preview order for ids still live, followed by any live ids the preview doesn't know about
const mergeOrder = (preview: string[], live: string[]) => [
  ...preview.filter((id) => live.includes(id)),
  ...live.filter((id) => !preview.includes(id))
]

export const usePreviewStore = create<PreviewState>((set, get) => ({
  active: false,
  compositor: new Compositor(),

  graphics: {},
  editors: {},
  graphicsOrder: [],
  editorsOrder: [],

  toggle: () => set((state) => ({ active: !state.active })),

  updateParams: (id, type, updates) => {
    const { compositor } = get()
    const sources = get()[type]
    const source = sources[id]
    if (source === undefined) throw new Error('Given invalid ID for preview source to update')
    set({ [type]: { ...sources, [id]: { ...source, ...updates } } })
    if (type === 'graphics') compositor.updateSource(id, updates)
  },

  reorderSource: (type, fromIndex, toIndex) => {
    const { compositor } = get()
    const orderKey = type === 'graphics' ? 'graphicsOrder' : 'editorsOrder'
    const newOrder = [...get()[orderKey]]
    const [moved] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, moved)
    const newSources = { ...get()[type] }
    newOrder.forEach((id, i) => {
      newSources[id] = { ...newSources[id], zIndex: i }
      if (type === 'graphics') compositor.updateSource(id, { zIndex: i })
    })
    set({ [orderKey]: newOrder, [type]: newSources })
  },

  // Mirror sources added/removed on the live mixer. New sources inherit their live params;
  // existing ones keep their preview params.
  syncSources: (live) => {
    const { compositor, graphics, editors, graphicsOrder, editorsOrder } = get()
    // Runs on every live store change (e.g. slider moves) — only act when membership changes
    if (
      sameMembers(graphicsOrder, live.graphicsOrder) &&
      sameMembers(editorsOrder, live.editorsOrder)
    )
      return

    const newGraphics: Record<string, MixerParams> = {}
    const newGraphicsOrder = graphicsOrder.filter((id) => live.graphics[id] !== undefined)
    for (const id of live.graphicsOrder) {
      if (!newGraphicsOrder.includes(id)) {
        const canvas = liveCanvas(live, id)
        if (canvas === undefined) continue
        newGraphicsOrder.push(id)
        compositor.addSource({ id, canvas, ...live.graphics[id], zIndex: newGraphicsOrder.length })
      }
    }
    newGraphicsOrder.forEach((id, zIndex) => {
      newGraphics[id] = { ...(graphics[id] ?? live.graphics[id]), zIndex }
      compositor.updateSource(id, { zIndex })
    })
    for (const id of graphicsOrder) {
      if (live.graphics[id] === undefined) compositor.removeSource(id)
    }

    const newEditors: Record<string, MixerParams> = {}
    const newEditorsOrder = editorsOrder.filter((id) => live.editors[id] !== undefined)
    for (const id of live.editorsOrder) {
      if (!newEditorsOrder.includes(id)) newEditorsOrder.push(id)
    }
    newEditorsOrder.forEach((id, zIndex) => {
      newEditors[id] = { ...(editors[id] ?? live.editors[id]), zIndex }
    })

    set({
      graphics: newGraphics,
      editors: newEditors,
      graphicsOrder: newGraphicsOrder,
      editorsOrder: newEditorsOrder
    })
  },

  copyFromLive: () => {
    const { compositor } = get()
    const live = useGraphicsStore.getState()
    const graphicsOrder = live.graphicsOrder.filter((id) => compositor.getSource(id))
    graphicsOrder.forEach((id) => compositor.updateSource(id, live.graphics[id]))
    set({
      graphics: Object.fromEntries(graphicsOrder.map((id) => [id, live.graphics[id]])),
      editors: { ...live.editors },
      graphicsOrder,
      editorsOrder: [...live.editorsOrder]
    })
  },

  sendToLive: () => {
    const { graphics, editors, graphicsOrder, editorsOrder } = get()
    const live = useGraphicsStore.getState()
    for (const [type, sources] of [
      ['graphics', graphics],
      ['editors', editors]
    ] as const) {
      for (const [id, { alpha, enabled, blendMode }] of Object.entries(sources)) {
        if (live[type][id] !== undefined) live.updateParams(id, type, { alpha, enabled, blendMode })
      }
    }
    live.setOrder('graphics', mergeOrder(graphicsOrder, live.graphicsOrder))
    live.setOrder('editors', mergeOrder(editorsOrder, live.editorsOrder))
  }
}))

/** Keeps the preview mix in sync with the live source list. Returns an unsubscribe function. */
export function setupPreviewSync() {
  const { syncSources } = usePreviewStore.getState()
  syncSources(useGraphicsStore.getState())
  return useGraphicsStore.subscribe(syncSources)
}
