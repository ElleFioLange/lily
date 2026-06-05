import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin, UIProps } from 'src/types/plugins'
import { SyphonState } from '../store'

export default function Options({ instanceId }: UIProps) {
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<SyphonState>
  const { servers, connectedServerUUID, frameWidth, frameHeight } = instance.useStore()

  const connectedServer = servers.find((s) => s.uuid === connectedServerUUID)

  return (
    <div className="flex flex-col gap-4 p-4 text-sm text-stone-300">
      <div className="flex flex-col gap-1">
        <span className="text-stone-400 text-xs uppercase tracking-wider">Connection</span>
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
        {connectedServerUUID && (
          <span className="text-stone-500 text-xs break-all">{connectedServerUUID}</span>
        )}
      </div>

      {frameWidth > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-stone-400 text-xs uppercase tracking-wider">Frame Info</span>
          <span>
            {frameWidth} × {frameHeight}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-stone-400 text-xs uppercase tracking-wider">
          Available Servers ({servers.length})
        </span>
        {servers.length === 0 ? (
          <span className="text-stone-500 italic text-xs">None detected</span>
        ) : (
          servers.map((s) => (
            <div key={s.uuid} className="text-xs text-stone-400">
              {s.name || '(unnamed)'} — {s.appName}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
