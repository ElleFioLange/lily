import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin, UIProps } from 'src/types/plugins'
import { OperatorState } from '../store'

export default function Options({ instanceId }: UIProps) {
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<OperatorState>
  const {
    servers,
    connectedServerUUID,
    frameWidth,
    frameHeight,
    settings,
    controlStatus,
    controlError,
    lastAck
  } = instance.useStore()

  const connectedServer = servers.find((s) => s.uuid === connectedServerUUID)

  return (
    <div className="flex flex-col gap-4 p-4 text-sm text-stone-300">
      <div className="flex flex-col gap-1">
        <span className="text-stone-400 text-xs uppercase tracking-wider">Video (Syphon)</span>
        <div className="flex gap-2 items-center">
          <div
            className={`w-2 h-2 rounded-full ${connectedServerUUID ? 'bg-green-400' : 'bg-stone-600'}`}
          />
          <span>
            {connectedServer
              ? `${connectedServer.name || '(unnamed)'} — ${connectedServer.appName}`
              : 'Not connected'}
          </span>
        </div>
        {frameWidth > 0 && (
          <span className="text-stone-500 text-xs">
            {frameWidth} × {frameHeight}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-stone-400 text-xs uppercase tracking-wider">Control (WebSocket)</span>
        <div className="flex gap-2 items-center">
          <div
            className={`w-2 h-2 rounded-full ${
              controlStatus === 'connected' ? 'bg-green-400' : 'bg-stone-600'
            }`}
          />
          <span className="capitalize">{controlStatus}</span>
        </div>
        <span className="text-stone-500 text-xs">
          ws://{settings.host}:{settings.port}
        </span>
        {controlError && <span className="text-stone-500 text-xs">{controlError}</span>}
        {lastAck && <span className="text-stone-500 text-xs">Last: {lastAck}</span>}
      </div>
    </div>
  )
}
