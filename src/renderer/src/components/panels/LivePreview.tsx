import Panel from '../common/Panel'
import type { PanelId } from '../../stores/useFocusStore'
import { useInputStore } from '@renderer/stores/useInputStore'

interface LivePreviewProps {
  panelId?: PanelId
}

export default function LivePreview({ panelId }: LivePreviewProps) {
  const { setInput } = useInputStore()

  return (
    <Panel
      title="Live preview"
      contentClassName="flex items-center justify-center"
      panelId={panelId}
    >
      <div
        className="w-full h-full bg-stone-900 outline-none flex justify-center items-center"
        onInput={(e) => setInput(e.currentTarget.textContent)}
        contentEditable
      />
    </Panel>
  )
}
