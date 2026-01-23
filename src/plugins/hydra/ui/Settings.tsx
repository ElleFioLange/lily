import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin, UIProps } from 'src/types/plugins'
import { HydraState } from '../store'

export default function Settings({ instanceId }: UIProps) {
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<HydraState>
  return (
    <div>
      HYDRA SETTINGS GO HERE
      <button onClick={() => instance.process(instanceId)}>process</button>
    </div>
  )
}
