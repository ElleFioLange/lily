import Panel from '../common/Panel'
import { useLiveStore } from '@renderer/stores/useLiveStore'
import type { PanelId } from '../../stores/useFocusStore'

interface AbletonMonitorProps {
  panelId?: PanelId
}

export default function AbletonMonitor({ panelId }: AbletonMonitorProps) {
  const handleInitRequest = async () => {
    await window.api.osc.send('/request/connection/confirm')
    window.api.osc.onMessage((msg) => {
      if (msg.address === '/send/connection/confirm') console.log('connection confirmed')
    })
  }

  const handleStateRequest = async () => {
    await window.api.osc.send('/request/state')
    // window.api.osc.onMessage((msg) => {
    //   if (msg.address === '/send/connection/confirm') console.log('connection confirmed')
    // })
  }

  const liveProject = useLiveStore((state) => state.liveProject)

  return (
    <Panel
      title="Ableton monitor"
      contentClassName="flex flex-col items-center justify-center p-4"
      panelId={panelId}
    >
      <button
        onClick={handleInitRequest}
        className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-100 rounded transition-colors"
      >
        Request Init from Max Device
      </button>
      <button
        onClick={handleStateRequest}
        className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-100 rounded transition-colors"
      >
        Request State from Max Device
      </button>
      <pre className="w-60 h-20 overflow-scroll bg-stone-800 text-xs">
        {JSON.stringify(liveProject)}
      </pre>
      {/* Future: Display Ableton Live state and metrics */}
    </Panel>
  )
}
