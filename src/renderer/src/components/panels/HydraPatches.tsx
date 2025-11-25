import Panel from '../common/Panel'
import type { PanelId } from '../../stores/useFocusStore'

interface HydraPatchesProps {
  panelId?: PanelId
}

export default function HydraPatches({ panelId }: HydraPatchesProps) {
  return (
    <Panel
      title="Hydra patches"
      contentClassName="flex items-center justify-center"
      panelId={panelId}
    >
      {/* Future: Patch browser and editor */}
    </Panel>
  )
}
