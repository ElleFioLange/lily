import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import { GraphicsState, MixerParams, useGraphicsStore } from './useGraphicsStore'
import { usePerformanceStore } from './usePerformanceStore'

type SourceType = 'graphics' | 'editors'

/** The parts of a mixer that make up a mix. Both the live and preview stores have this shape. */
export type MixSnapshot = Pick<
  GraphicsState,
  'graphics' | 'editors' | 'graphicsOrder' | 'editorsOrder'
>

export type MixerPreset = MixSnapshot & { id: string; name: string }

export const snapshotMix = ({ graphics, editors, graphicsOrder, editorsOrder }: MixSnapshot) =>
  structuredClone({ graphics, editors, graphicsOrder, editorsOrder })

// Target order for ids that exist, followed by any existing ids the target doesn't know about
export const mergeOrder = (target: string[], existing: string[]) => [
  ...target.filter((id) => existing.includes(id)),
  ...existing.filter((id) => !target.includes(id))
]

// Layers can be unloaded mid-fade; updateParams throws for unknown ids
function updateLive(id: string, type: SourceType, updates: Partial<MixerParams>) {
  const live = useGraphicsStore.getState()
  if (live[type][id] !== undefined) live.updateParams(id, type, updates)
}

/**
 * Session-only mixer presets, shared by the live and preview mixers, plus the crossfade used to
 * move the live mix to a preset (or to the preview mix via "send to live"). Presets reference
 * layers by instance id; layers missing from a preset are left untouched.
 */
interface MixerPresetsState {
  presets: MixerPreset[]
  fadeSeconds: number
  fading: boolean
  cancelFade: () => void

  savePreset: (mix: MixSnapshot) => void
  overwritePreset: (id: string, mix: MixSnapshot) => void
  deletePreset: (id: string) => void
  setFadeSeconds: (fadeSeconds: number) => void
  fadeLiveTo: (target: MixSnapshot) => void
}

export const useMixerPresetsStore = create<MixerPresetsState>((set, get) => ({
  presets: [],
  fadeSeconds: 2,
  fading: false,
  cancelFade: () => {},

  savePreset: (mix) => {
    const { presets } = get()
    const name = `preset ${presets.length + 1}`
    set({ presets: [...presets, { id: uuid(), name, ...snapshotMix(mix) }] })
  },

  overwritePreset: (id, mix) =>
    set(({ presets }) => ({
      presets: presets.map((p) => (p.id === id ? { ...p, ...snapshotMix(mix) } : p))
    })),

  deletePreset: (id) => set(({ presets }) => ({ presets: presets.filter((p) => p.id !== id) })),

  setFadeSeconds: (fadeSeconds) => set({ fadeSeconds }),

  // Blend modes, order, and newly enabled layers switch at the start; alpha fades (a layer being
  // disabled fades to 0 and is disabled at the end).
  fadeLiveTo: (target) => {
    get().cancelFade()
    const live = useGraphicsStore.getState()

    const fades: { id: string; type: SourceType; from: number; to: number; end: MixerParams }[] = []
    for (const type of ['graphics', 'editors'] as const) {
      for (const [id, end] of Object.entries(target[type])) {
        const current = live[type][id]
        if (current === undefined) continue
        const from = current.enabled ? current.alpha : 0
        const to = end.enabled ? end.alpha : 0
        fades.push({ id, type, from, to, end })
        live.updateParams(id, type, {
          blendMode: end.blendMode,
          enabled: current.enabled || end.enabled,
          alpha: from
        })
      }
    }
    const { graphicsOrder, editorsOrder, setOrder } = useGraphicsStore.getState()
    setOrder('graphics', mergeOrder(target.graphicsOrder, graphicsOrder))
    setOrder('editors', mergeOrder(target.editorsOrder, editorsOrder))

    const finish = () => {
      fades.forEach(({ id, type, end }) =>
        updateLive(id, type, { alpha: end.alpha, enabled: end.enabled })
      )
      set({ fading: false, cancelFade: () => {} })
    }

    const duration = get().fadeSeconds * 1000
    if (duration <= 0) return finish()

    // Tick on the performance window when it's open: the main window's rAF is throttled while it
    // sits behind a full screen performance window.
    let frame: { win: Window; handle: number } | null = null
    const start = performance.now()
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / duration)
      if (t >= 1) return finish()
      fades.forEach(({ id, type, from, to }) =>
        updateLive(id, type, { alpha: from + (to - from) * t })
      )
      const perf = usePerformanceStore.getState().windowRef
      const win = perf && !perf.closed ? perf : window
      frame = { win, handle: win.requestAnimationFrame(step) }
    }

    set({
      fading: true,
      cancelFade: () => {
        if (frame && !frame.win.closed) frame.win.cancelAnimationFrame(frame.handle)
        set({ fading: false, cancelFade: () => {} })
      }
    })
    step()
  }
}))
