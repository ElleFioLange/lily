import Panel from '../common/Panel'
import type { PanelId } from '../../stores/useFocusStore'

interface LivePreviewProps {
  panelId?: PanelId
}

export default function LivePreview({ panelId }: LivePreviewProps) {
  return (
    <Panel
      title="Live preview"
      contentClassName="flex items-center justify-center"
      panelId={panelId}
    >
      {/* Future: Video feed or camera input */}
    </Panel>
  )
}
