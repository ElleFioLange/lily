import { useState } from 'react'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin, WorkspaceProps } from 'src/types/plugins'
import { OperatorState } from '../store'
import { getControlClient } from '../ws'
import Panel from '@renderer/components/common/Panel'

export default function Workspace({ instanceId }: WorkspaceProps) {
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<OperatorState>
  const {
    servers,
    connectedServerUUID,
    frameWidth,
    frameHeight,
    settings,
    setSettings,
    controlStatus,
    controlError,
    lastAck
  } = instance.useStore()

  const [host, setHost] = useState(settings.host)
  const [port, setPort] = useState(String(settings.port))
  const [token, setToken] = useState(settings.token)

  const connectedServer = servers.find((s) => s.uuid === connectedServerUUID)
  const client = getControlClient(instanceId)

  const handleConnect = () => {
    setSettings({ host: host.trim(), port: Number(port) || 9700, token: token.trim() })
    client?.disconnect()
    client?.connect()
  }

  const handleDisconnect = () => {
    client?.disconnect()
  }

  const statusColor =
    controlStatus === 'connected'
      ? 'bg-green-400'
      : controlStatus === 'connecting'
        ? 'bg-yellow-400'
        : controlStatus === 'error'
          ? 'bg-red-400'
          : 'bg-stone-600'

  return (
    <Panel title="Operator" className="size-full" contentClassName="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-2">
        <span className="text-stone-400 text-xs uppercase tracking-wider">Video (Syphon)</span>
        <div className="flex gap-2 items-center text-sm text-stone-300">
          <div
            className={`w-2 h-2 rounded-full ${connectedServerUUID ? 'bg-green-400' : 'bg-stone-600'}`}
          />
          <span>
            {connectedServer
              ? `${connectedServer.name || '(unnamed)'} — ${connectedServer.appName}` +
                (frameWidth > 0 ? ` (${frameWidth}×${frameHeight})` : '')
              : 'Waiting for the Operator Syphon server… (enable Toggle Syphon Output in Operator)'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-stone-400 text-xs uppercase tracking-wider">Control (WebSocket)</span>
        <div className="flex gap-2 items-center text-sm text-stone-300">
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className="capitalize">{controlStatus}</span>
          {controlError && <span className="text-stone-500 text-xs">{controlError}</span>}
        </div>

        <div className="flex flex-col gap-2 max-w-md">
          <label className="flex items-center gap-2 text-xs text-stone-400">
            <span className="w-12">Host</span>
            <input
              className="flex-1 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-200"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="127.0.0.1"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-stone-400">
            <span className="w-12">Port</span>
            <input
              className="flex-1 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-200"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="9700"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-stone-400">
            <span className="w-12">Token</span>
            <input
              className="flex-1 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-200"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="from Operator's Lily Control dialog"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleConnect}
              className="text-xs px-3 py-1 rounded bg-stone-600 hover:bg-stone-500 text-stone-200"
            >
              Connect
            </button>
            {controlStatus !== 'disconnected' && (
              <button
                onClick={handleDisconnect}
                className="text-xs px-3 py-1 rounded bg-stone-700 hover:bg-stone-600 text-stone-300"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {lastAck && (
          <div className="text-xs text-stone-500">
            Last variable: <span className="text-stone-300">{lastAck}</span>
          </div>
        )}
      </div>

      <div className="text-xs text-stone-500 max-w-md">
        Map poiesis keywords to patch variables in the config, e.g.{' '}
        <code className="text-stone-400">
          {'{"storm": {"operator": {"name": "cutoff", "present": 1200, "absent": 200}}}'}
        </code>
        . Operator needs a matching <code className="text-stone-400">let cutoff: any</code>{' '}
        declaration in the running patch.
      </div>
    </Panel>
  )
}
