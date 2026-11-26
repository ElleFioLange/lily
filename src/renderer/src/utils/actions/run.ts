import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { ActiveSource } from '@renderer/sources/types'
import { endPreview, previewFocused } from '@renderer/sources/hydra/patchPreview'

// The editor handles these shortcuts itself (so CodeMirror doesn't also act on them, e.g.
// Cmd+Enter inserting a blank line), and the app menu may fire for the same key press.
// Whichever comes second within this window is skipped.
const SAME_PRESS_MS = 150
const lastCall: Record<string, number> = {}
function once(action: string): boolean {
  const now = performance.now()
  if (now - (lastCall[action] ?? -Infinity) < SAME_PRESS_MS) return false
  lastCall[action] = now
  return true
}

function evaluate(source: ActiveSource) {
  Promise.resolve(source.process(source.instanceId)).catch((error) =>
    console.error(`[run] ${source.name} failed:`, error)
  )
}

/** Run All Layers (Cmd/Ctrl+Alt+Enter): re-evaluate every active source, e.g. each Hydra layer's patch. */
export default function run() {
  if (!once('runAll')) return
  const { active } = useSourcesStore.getState()
  for (const source of Object.values(active)) evaluate(source)
  endPreview()
}

/** Run (Cmd/Ctrl+Shift+Enter and the play button): re-evaluate only the focused layer's patch. */
export function runFocused() {
  if (!once('runFocused')) return
  const { active, focused } = useSourcesStore.getState()
  const source = focused ? active[focused] : undefined
  if (!source) return
  evaluate(source)
  endPreview(source.instanceId)
}

/** Preview (Cmd/Ctrl+Enter): show the focused Hydra layer's edits without running them on the layer. */
export function previewPatch() {
  if (!once('preview')) return
  void previewFocused()
}
