import { SourceDefinition, ActiveSource } from '@renderer/sources/types'
import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import { useGraphicsStore } from './useGraphicsStore'

interface SourcesState {
  registered: Record<string, SourceDefinition>
  active: Record<string, ActiveSource>
  focused: string | null

  registerSource: (source: SourceDefinition) => void
  loadSource: (sourceId: string) => void
  unloadSource: (instanceId: string) => void
  getInstance: (instanceId: string) => ActiveSource | undefined
  setFocused: (focused: string | null) => void
}

export const useSourcesStore = create<SourcesState>((set, get) => ({
  registered: {},
  active: {},
  focused: null,

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
        return
      }
    }

    const instanceId = uuid()
    const useStore = source.init(instanceId)

    const activeSource = { ...source, useStore, instanceId }

    const newActive = { ...active, [instanceId]: activeSource }

    set({ active: newActive, focused: instanceId })

    // TODO Try to consolidate render processing of multiple instances of the same source maybe?
    // Check for other instances of the same source
    // const currentInstances = Object.keys(registered).filter(
    //   (key) => key.slice(0, sourceId.length) === sourceId
    // )
  },

  unloadSource: (instanceId) => {
    const { active, focused } = get()
    const instance = active[instanceId]
    instance.cleanup(instanceId)
    useGraphicsStore.getState().removeSource(instanceId)
    const newActive = { ...active }
    delete newActive[instanceId]

    let newFocused = focused
    if (focused === instanceId) {
      const remaining = Object.keys(newActive)
      newFocused = remaining.length > 0 ? remaining[remaining.length - 1] : null
    }

    set({ active: newActive, focused: newFocused })
  },

  getInstance: (instanceId) => {
    const { active } = get()
    return active[instanceId]
  },

  setFocused: (focused) => set({ focused })
}))
