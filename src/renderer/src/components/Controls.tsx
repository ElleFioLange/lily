import Header from './common/Header'
import { useSourcesStore } from '@renderer/stores/useSourcesStore'

export default function Controls() {
  const { focused, getInstance } = useSourcesStore()
  const instance = focused !== null ? getInstance(focused) : null

  return (
    <div className="flex flex-col h-full">
      <Header title="CONTROLS">
        <span className="text-xs text-stone-400 self-center truncate">{instance?.name}</span>
      </Header>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {instance && instance.Controls ? <instance.Controls instanceId={focused!} /> : null}
      </div>
    </div>
  )
}
