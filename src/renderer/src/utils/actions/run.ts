import { useSourcesStore } from '@renderer/stores/useSourcesStore'

/** Run (Cmd/Ctrl+Shift+Enter): re-evaluate every active source, e.g. each Hydra layer's patch. */
export default function run() {
  const { active } = useSourcesStore.getState()
  for (const source of Object.values(active)) {
    Promise.resolve(source.process(source.instanceId)).catch((error) =>
      console.error(`[run] ${source.manifest.name} failed:`, error)
    )
  }
}
