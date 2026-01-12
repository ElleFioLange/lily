import Panel from '../common/Panel'
import { useLiveStore } from '@plugins/ableton/store'
import type { PanelId } from '../../stores/useFocusStore'
import { CameraControls } from '../camera/CameraControls'

interface AbletonMonitorProps {
  panelId?: PanelId
}

export default function AbletonMonitor({ panelId }: AbletonMonitorProps) {
  const handleInitRequest = async () => {
    await window.api.osc.send('/request/connection/confirm', [true])
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

  const handleAudioStatus = async () => {
    const result = await window.api.audio.getStatus()
    console.log(result)
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
      <button
        onClick={handleAudioStatus}
        className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-100 rounded transition-colors"
      >
        Log audio status
      </button>
      <pre className="w-60 h-20 overflow-scroll bg-stone-800 text-xs">
        {JSON.stringify(liveProject)}
      </pre>

      {/* Camera Streaming Controls */}
      <div className="mt-6 w-full max-w-md">
        <h3 className="text-sm font-medium text-stone-100 mb-3">Camera Streaming</h3>
        <CameraControls />
      </div>

      {/* Future: Display Ableton Live state and metrics */}
    </Panel>
  )
}
