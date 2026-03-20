import { ActivePlugin } from '@plugins/utils'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { PoiesisState } from '../store'
import { WorkspaceProps } from 'src/types/plugins'
import PoiesisEditor from './components/poiesis/Editor'
import ConfigEditor from './components/config/Editor'

export default function PoiesisWorkspace({ instanceId, environment, ...props }: WorkspaceProps) {
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<PoiesisState>
  const { openSurface } = instance.useStore()

  if (!environment) return <div />

  return (
    <div className="size-full" {...props}>
      {openSurface === 'poiesis' ? (
        <PoiesisEditor instanceId={instanceId} environment={environment} />
      ) : (
        <ConfigEditor instanceId={instanceId} />
      )}
    </div>
  )
}
