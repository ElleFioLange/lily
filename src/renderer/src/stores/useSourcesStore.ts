import { SourceDefinition, ActiveSource } from '@renderer/sources/types'
import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import { useGraphicsStore } from './useGraphicsStore'
import { useBrowserStore } from './useBrowserStore'

interface SourcesState {
  registered: Record<string, SourceDefinition>
  active: Record<string, ActiveSource>
  focused: string | null
  /** The Hydra layer focused most recently, to return to when leaving Poiesis */
  lastLayer: string | null

  registerSource: (source: SourceDefinition) => void
  /** Creates an instance of a source and focuses it. Returns its instanceId. */
  loadSource: (sourceId: string) => string | null
  /** Adds a new, empty Hydra layer and shows the file browser to pick its patch. */
  addLayer: () => string | null
  /** Creates the session's default layers (pinned sources, then one Hydra layer) if none exist. */
  startSession: () => void
  unloadSource: (instanceId: string) => void
  /** Renames a layer. Blank names are ignored. */
  renameLayer: (instanceId: string, name: string) => void
  getInstance: (instanceId: string) => ActiveSource | undefined
  setFocused: (focused: string | null) => void
  /** Switches to the Poiesis layer, or back to the last Hydra layer when Poiesis is showing. */
  togglePoiesis: () => void
}

const LAYER_NAME = /^Layer (\d+)$/

/** Pinned sources keep their own name; layers count up from the highest "Layer N" still open. */
function defaultName(source: SourceDefinition, active: Record<string, ActiveSource>): string {
  if (source.manifest.pinned) return source.manifest.name
  const highest = Object.values(active).reduce((max, { name }) => {
    const match = LAYER_NAME.exec(name)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `Layer ${highest + 1}`
}

export const useSourcesStore = create<SourcesState>((set, get) => ({
  registered: {},
  active: {},
  focused: null,
  lastLayer: null,

  registerSource: (source) => {
    const { registered } = get()

    // Prevent duplicate registration
    if (registered[source.manifest.id]) {
      console.warn(`[SourcesStore] Source "${source.manifest.id}" already registered, skipping`)
      return
    }

    const newRegistered = { ...registered, [source.manifest.id]: source }
    set({ registered: newRegistered })
    console.log(`[SourcesStore] Registered: ${source.manifest.name}`)
  },

  loadSource: (sourceId) => {
    const { registered, active } = get()
    const source = registered[sourceId]
    if (source === undefined) throw new Error('No source registered with id ' + sourceId)

    if (!source.manifest.allowMultiple) {
      const alreadyActive = Object.values(active).some((p) => p.manifest.id === sourceId)
      if (alreadyActive) {
        console.warn(`[SourcesStore] Source "${sourceId}" does not allow multiple instances`)
        return null
      }
    }

    const instanceId = uuid()
    const useStore = source.init(instanceId)

    const activeSource = { ...source, useStore, instanceId, name: defaultName(source, active) }

    const newActive = { ...active, [instanceId]: activeSource }

    set({
      active: newActive,
      focused: instanceId,
      ...(!source.manifest.pinned && { lastLayer: instanceId })
    })
    return instanceId
  },

  addLayer: () => {
    const instanceId = get().loadSource('hydra')
    if (instanceId) useBrowserStore.getState().setOpen(true)
    return instanceId
  },

  startSession: () => {
    const { registered, active, loadSource, setFocused } = get()
    // Idempotent so React StrictMode's double effect doesn't create duplicate layers
    if (Object.keys(active).length > 0) return
    Object.values(registered)
      .filter((source) => source.manifest.pinned)
      .forEach((source) => loadSource(source.manifest.id))
    const firstLayer = get().addLayer()
    if (firstLayer) setFocused(firstLayer)
  },

  unloadSource: (instanceId) => {
    const { active, focused } = get()
    const instance = active[instanceId]
    if (!instance || instance.manifest.pinned) return
    instance.cleanup(instanceId)
    useGraphicsStore.getState().removeSource(instanceId)
    const newActive = { ...active }
    delete newActive[instanceId]

    // Fall back to the newest remaining Hydra layer, or Poiesis if none are left
    const layers = Object.values(newActive).filter(({ manifest }) => !manifest.pinned)
    const fallback =
      layers.at(-1)?.instanceId ?? Object.values(newActive).at(-1)?.instanceId ?? null
    const lastLayer = get().lastLayer
    set({
      active: newActive,
      focused: focused === instanceId ? fallback : focused,
      lastLayer: lastLayer === instanceId ? (layers.at(-1)?.instanceId ?? null) : lastLayer
    })
  },

  renameLayer: (instanceId, name) => {
    const { active } = get()
    const instance = active[instanceId]
    const trimmed = name.trim()
    if (!instance || trimmed === '' || trimmed === instance.name) return
    set({ active: { ...active, [instanceId]: { ...instance, name: trimmed } } })
  },

  getInstance: (instanceId) => {
    const { active } = get()
    return active[instanceId]
  },

  setFocused: (focused) => {
    const instance = focused ? get().active[focused] : undefined
    set({ focused, ...(instance && !instance.manifest.pinned && { lastLayer: focused }) })
  },

  togglePoiesis: () => {
    const { active, focused, lastLayer, setFocused } = get()
    const poiesis = Object.values(active).find(({ manifest }) => manifest.id === 'poiesis')
    if (!poiesis) return
    if (focused !== poiesis.instanceId) return setFocused(poiesis.instanceId)
    const back =
      (lastLayer && active[lastLayer] ? lastLayer : undefined) ??
      Object.values(active).find(({ manifest }) => !manifest.pinned)?.instanceId
    if (back) setFocused(back)
  }
}))
