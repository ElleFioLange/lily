import { usePreviewStore } from '@renderer/stores/usePreviewStore'
import Stage from './Stage'

/** The preview mix, shown in the workspace while preview mode is on. */
export default function PreviewStage() {
  const { compositor, editors, editorsOrder } = usePreviewStore()
  return (
    <Stage
      compositor={compositor}
      outputId="preview"
      editors={editors}
      editorsOrder={editorsOrder}
      environment="preview"
    />
  )
}
