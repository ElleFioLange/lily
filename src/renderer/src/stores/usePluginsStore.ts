import { PluginDefinition, ActivePlugin } from '@plugins/utils'
import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import { useGraphicsStore } from './useGraphicsStore'

interface PluginsManagerState {
  registered: Record<string, PluginDefinition>
  active: Record<string, ActivePlugin>
  focused: string | null

  registerPlugin: (plugin: PluginDefinition) => void
  loadPlugin: (pluginId: string) => void
  unloadPlugin: (instanceId: string) => void
  getInstance: (instanceId: string) => ActivePlugin | undefined
  setFocused: (focused: string | null) => void
}

export const usePluginsStore = create<PluginsManagerState>((set, get) => ({
  registered: {},
  active: {},
  focused: null,

  registerPlugin: (plugin) => {
    const { registered } = get()

    // Prevent duplicate registration
    if (registered[plugin.manifest.id]) {
      console.warn(`[PluginsStore] Plugin "${plugin.manifest.id}" already registered, skipping`)
      return
    }

    const newRegistered = { ...registered, [plugin.manifest.id]: plugin }
    set({ registered: newRegistered })
    console.log(`[PluginsStore] Registered: ${plugin.manifest.name}`)
  },

  loadPlugin: (pluginId) => {
    const { registered, active } = get()
    const plugin = registered[pluginId]
    if (plugin === undefined) throw new Error('No plugin registered with id ' + pluginId)

    const instanceId = uuid()
    const useStore = plugin.init(instanceId)

    const activePlugin = { ...plugin, useStore, instanceId }

    const newActive = { ...active, [instanceId]: activePlugin }

    set({ active: newActive, focused: instanceId })

    // TODO Try to consolidate render processing of multiple instances of the same plugin maybe?
    // Check for other instances of the same plugin
    // const currentInstances = Object.keys(registered).filter(
    //   (key) => key.slice(0, pluginId.length) === pluginId
    // )
  },

  unloadPlugin: (instanceId) => {
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
