import Panel from '../common/Panel'
import type { PanelId } from '../../stores/useFocusStore'

interface ProjectConfigProps {
  panelId?: PanelId
}

export default function ProjectConfig({ panelId }: ProjectConfigProps) {
  return (
    <Panel title="Project Config" contentClassName="flex flex-col items-end" panelId={panelId}>
      {/* Future: Project settings and configuration options */}
    </Panel>
  )
}
