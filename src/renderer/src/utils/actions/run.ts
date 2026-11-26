import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { ActiveSource } from '@renderer/sources/types'

function evaluate(source: ActiveSource) {
  Promise.resolve(source.process(source.instanceId)).catch((error) =>
    console.error(`[run] ${source.name} failed:`, error)
  )
}

/** Run (Cmd/Ctrl+Shift+Enter): re-evaluate every active source, e.g. each Hydra layer's patch. */
export default function run() {
  const { active } = useSourcesStore.getState()
  for (const source of Object.values(active)) evaluate(source)
}

/** Play button: re-evaluate only the focused layer's patch. */
export function runFocused() {
  const { active, focused } = useSourcesStore.getState()
  const source = focused ? active[focused] : undefined
  if (source) evaluate(source)
}
