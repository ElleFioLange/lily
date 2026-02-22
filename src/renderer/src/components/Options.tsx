import Header from './common/Header'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'

export default function Options() {
  const { focused, getInstance } = usePluginsStore()
  const instance = focused !== null ? getInstance(focused) : null

  return (
    <div>
      <Header title="OPTIONS" />
      {instance && instance.Options ? <instance.Options instanceId={focused!} /> : null}
    </div>
  )
}
