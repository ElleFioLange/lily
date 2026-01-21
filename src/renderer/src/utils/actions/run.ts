import { usePluginsStore } from "@renderer/stores/usePluginsStore";

export default function run() {
  const { active, focused: instanceId, poiesisRef, configRef } = usePluginsStore.getState()
  if (instanceId === null) return

  const plugin = active[instanceId]
  if (!plugin) throw new Error('Unable to find plugin with instance id: ' + instanceId)

  const poiesis = poiesisRef?.useStore?

  // plugin.process(instanceId, )
}
