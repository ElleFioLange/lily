import Header from './common/Header'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'

export default function Settings() {
  const { focused, getInstance } = usePluginsStore()
  const instance = focused !== null ? getInstance(focused) : null

  return (
    <div>
      <Header title="SETTINGS" />
      {instance && instance.Settings ? <instance.Settings instanceId={focused!} /> : null}
    </div>
  )
}
