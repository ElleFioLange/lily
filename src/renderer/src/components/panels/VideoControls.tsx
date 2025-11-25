import Panel from '../common/Panel'
import type { PanelId } from '../../stores/useFocusStore'

interface VideoControlsProps {
  panelId?: PanelId
}

export default function VideoControls({ panelId }: VideoControlsProps) {
  return (
    <Panel title="Video controls" collapsible contentClassName="flex flex-col" panelId={panelId}>
      <div className="p-4 flex items-center justify-center">
        <div className="text-stone-100 font-light">Video controls</div>
      </div>
    </Panel>
  )
}
