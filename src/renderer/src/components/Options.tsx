import Header from './common/Header'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'

export default function Options() {
  const { focused, getInstance } = usePluginsStore()
  const instance = focused !== null ? getInstance(focused) : null

  return (
    <div className="flex flex-col h-full">
      <Header title="OPTIONS" />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {instance && instance.Options ? <instance.Options instanceId={focused!} /> : null}
      </div>
    </div>
  )
}
