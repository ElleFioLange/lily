import { PluginDefinition, ActivePlugin } from '@plugins/helpers'
import { create } from 'zustand'
import { v4 as uuid } from 'uuid'

interface PluginsManagerStore {
  registered: Record<string, PluginDefinition>
  active: Record<string, ActivePlugin>
  focused: string | null

  registerPlugin: (plugin: PluginDefinition) => void
  loadPlugin: (pluginId: string) => void
  unloadPlugin: (instanceId: string) => void
  getInstance: (instanceId: string) => ActivePlugin
  setFocused: (focused: string | null) => void
}

export const usePluginsStore = create<PluginsManagerStore>((set, get) => ({
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

    const newActive = { ...active, [instanceId]: { ...plugin, useStore, instanceId } }

    set({ active: newActive })

    // TODO Try to consolidate render processing of multiple instances of the same plugin maybe?
    // Check for other instances of the same plugin
    // const currentInstances = Object.keys(registered).filter(
    //   (key) => key.slice(0, pluginId.length) === pluginId
    // )
  },

  unloadPlugin: (instanceId) => {
    const { active } = get()
    const instance = active[instanceId]
    instance.cleanup(instanceId)
    const newActive = { ...active }
    delete newActive[instanceId]
    set({ active: newActive })
  },

  getInstance: (instanceId) => {
    const { active } = get()
    const plugin = active[instanceId]
    if (plugin === undefined) throw new Error('No plugin instance found with id ' + instanceId)
    return plugin
  },

  setFocused: (focused) => set({ focused })
}))
