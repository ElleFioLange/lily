import { ActivePlugin } from '@plugins/utils'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ClaudePoiesisState } from '../store'
import { WorkspaceProps } from 'src/types/plugins'
import PoiesisEditor from './components/poiesis/Editor'
import ConfigEditor from './components/config/Editor'

export default function PoiesisWorkspace({ instanceId, ...props }: WorkspaceProps) {
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<ClaudePoiesisState>
  const { openSurface } = instance.useStore()

  return (
    <div className="size-full" {...props}>
      {openSurface === 'poiesis' ? (
        <PoiesisEditor instanceId={instanceId} />
      ) : (
        <ConfigEditor instanceId={instanceId} />
      )}
    </div>
  )
}
