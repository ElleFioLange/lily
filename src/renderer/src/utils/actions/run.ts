import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { ActiveSource } from '@renderer/sources/types'
import { endPreview, previewFocused } from '@renderer/sources/hydra/patchPreview'
import { formatFocused, formatLayer } from '@renderer/sources/hydra/format'
import { flagIfInvalid } from '@renderer/sources/hydra/validate'

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

// Hydra patches are formatted on evaluation, then run as formatted
async function evaluate(source: ActiveSource) {
  try {
    await formatLayer(source.instanceId)
    await flagIfInvalid(source.instanceId)
    await source.process(source.instanceId)
  } catch (error) {
    console.error(`[run] ${source.name} failed:`, error)
  }
}

/** Run All Layers (Cmd/Ctrl+Alt+Enter): re-evaluate every active source, e.g. each Hydra layer's patch. */
export default function run() {
  if (!once('runAll')) return
  const { active } = useSourcesStore.getState()
  for (const source of Object.values(active)) void evaluate(source)
  endPreview()
}

/** Run (Cmd/Ctrl+Shift+Enter and the play button): re-evaluate only the focused layer's patch. */
export function runFocused() {
  if (!once('runFocused')) return
  const { active, focused } = useSourcesStore.getState()
  const source = focused ? active[focused] : undefined
  if (!source) return
  void evaluate(source)
  endPreview(source.instanceId)
}

/** Preview (Cmd/Ctrl+Enter): show the focused Hydra layer's edits without running them on the layer. */
export function previewPatch() {
  if (!once('preview')) return
  const { focused } = useSourcesStore.getState()
  void formatFocused()
    .then(() => (focused ? flagIfInvalid(focused) : undefined))
    .then(previewFocused)
}

/** Format Patch (Cmd/Ctrl+F): format the focused layer's patch without running it. */
export function formatPatch() {
  if (!once('format')) return
  void formatFocused()
}
