import { ConfigurationJSON } from 'src/types/config'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin } from '@plugins/utils'
import { StrudelState } from './store'

export default function process(
  instanceId: string,
  inputs: { poiesis: string; config: ConfigurationJSON }[]
) {
  if (inputs.length === 0) return

  const { getInstance } = usePluginsStore.getState()
  const instance = getInstance(instanceId) as ActivePlugin<StrudelState>
  if (!instance) return

  instance.useStore.getState().setPoiesis(inputs[0].poiesis)
}
