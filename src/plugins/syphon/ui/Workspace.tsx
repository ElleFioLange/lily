import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin, WorkspaceProps } from 'src/types/plugins'
import { SyphonState } from '../store'
import Panel from '@renderer/components/common/Panel'

export default function Workspace({ instanceId }: WorkspaceProps) {
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<SyphonState>
  const { servers, connectedServerUUID, setConnectedServer } = instance.useStore()

  const handleConnect = async (uuid: string) => {
    const result = await window.api.syphon.connect(instanceId, uuid)
    if (result.success) {
      setConnectedServer(uuid)
    }
  }

  const handleDisconnect = async () => {
    await window.api.syphon.disconnect(instanceId)
    setConnectedServer(null)
  }

  const handleRefresh = async () => {
    const servers = await window.api.syphon.listServers()
    instance.useStore.getState().setServers(servers)
  }

  return (
    <Panel title="Syphon Input" className="size-full" contentClassName="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="text-stone-400 text-sm">Available Servers</span>
        <button
          onClick={handleRefresh}
          className="text-xs px-2 py-1 bg-stone-700 hover:bg-stone-600 rounded text-stone-300"
        >
          Refresh
        </button>
      </div>

      {servers.length === 0 ? (
        <div className="text-stone-500 text-sm italic">No Syphon servers found</div>
      ) : (
        <div className="flex flex-col gap-2">
          {servers.map((server) => {
            const isConnected = connectedServerUUID === server.uuid
            return (
              <div
                key={server.uuid}
                className={`flex items-center justify-between p-3 rounded border ${
                  isConnected
                    ? 'border-stone-400 bg-stone-700'
                    : 'border-stone-700 bg-stone-800 hover:bg-stone-700'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-stone-100 text-sm font-medium">
                    {server.name || '(unnamed)'}
                  </span>
                  <span className="text-stone-400 text-xs">{server.appName}</span>
                </div>
                <button
                  onClick={() => (isConnected ? handleDisconnect() : handleConnect(server.uuid))}
                  className={`text-xs px-3 py-1 rounded ${
                    isConnected
                      ? 'bg-stone-600 hover:bg-stone-500 text-stone-200'
                      : 'bg-stone-600 hover:bg-stone-500 text-stone-200'
                  }`}
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {connectedServerUUID && (
        <div className="mt-auto text-xs text-stone-400">
          Connected:{' '}
          {servers.find((s) => s.uuid === connectedServerUUID)?.name ?? connectedServerUUID}
        </div>
      )}
    </Panel>
  )
}
