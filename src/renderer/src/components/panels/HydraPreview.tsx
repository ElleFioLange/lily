import Panel from '../common/Panel'
import type { PanelId } from '../../stores/useFocusStore'

interface HydraPreviewProps {
  panelId?: PanelId
}

export default function HydraPreview({ panelId }: HydraPreviewProps) {
  return (
    <Panel title="Hydra preview" collapsible contentClassName="flex flex-col" panelId={panelId}>
      {/* Top section - expandable */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-stone-100 font-light">Hydra preview</div>
      </div>
    </Panel>
  )
}
