import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { ActiveSource } from '@renderer/sources/types'
import { endPreview, previewFocused } from '@renderer/sources/hydra/patchPreview'

function evaluate(source: ActiveSource) {
  Promise.resolve(source.process(source.instanceId)).catch((error) =>
    console.error(`[run] ${source.name} failed:`, error)
  )
}

/** Run All Layers (Cmd/Ctrl+Alt+Enter): re-evaluate every active source, e.g. each Hydra layer's patch. */
export default function run() {
  const { active } = useSourcesStore.getState()
  for (const source of Object.values(active)) evaluate(source)
  endPreview()
}

/** Run (Cmd/Ctrl+Shift+Enter and the play button): re-evaluate only the focused layer's patch. */
export function runFocused() {
  const { active, focused } = useSourcesStore.getState()
  const source = focused ? active[focused] : undefined
  if (!source) return
  evaluate(source)
  endPreview(source.instanceId)
}

/** Preview (Cmd/Ctrl+Enter): show the focused Hydra layer's edits without running them on the layer. */
export function previewPatch() {
  void previewFocused()
}
