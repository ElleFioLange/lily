import { ActivePlugin } from '@plugins/utils'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { PoiesisState } from '@renderer/surfaces/poiesis/store'

export default function run() {
  console.log('running')
  const { active, focused } = usePluginsStore.getState()
  if (focused === null) return

  const plugin = active[focused]
  if (!plugin) throw new Error('Unable to find plugin with instance id: ' + focused)

  const poiesisPlugins: ActivePlugin<PoiesisState>[] = []
  const otherPlugins: ActivePlugin[] = []
  Object.values(active).forEach((plugin) => {
    const id = plugin.manifest.id
    if (id === 'poiesis') poiesisPlugins.push(plugin as ActivePlugin<PoiesisState>)
    else otherPlugins.push(plugin)
  })

  if (poiesisPlugins.length) {
    const { poiesis, parsedConfig } = poiesisPlugins[0].useStore.getState()
    for (const plugin of otherPlugins) {
      console.log('running process of ' + plugin.manifest.name)
      plugin.process(plugin.instanceId, [{ poiesis, config: parsedConfig }])
    }
  } else {
    for (const plugin of otherPlugins) {
      // plugin.process(plugin.instanceId)
    }
  }

  // TODO Implement handling for multiple poiesis instances
  // let atleastOneValidPoiesis = false

  // for (const poiesisPlugin of poiesisPlugins) {
  //   const { poiesis, lastRunValue, parsedConfig } = poiesisPlugin.useStore.getState()
  //   // If the poiesis hasn't been updated since the last run then skip it
  //   if (parsedConfig === null) continue
  //   for (const plugin of otherPlugins) {
  //   }
  // }
}
