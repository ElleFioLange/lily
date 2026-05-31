import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import Header from './common/Header'

export default function Monitors() {
  const { focused, getInstance } = usePluginsStore()
  const instance = focused !== null ? getInstance(focused) : null
  return (
    <div className="flex flex-col h-full">
      <Header title="MONITORS" />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {instance && instance.Monitor ? <instance.Monitor instanceId={focused!} /> : null}
      </div>
    </div>
  )
}
