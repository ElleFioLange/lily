import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { useWorkingDirectoryStore } from '@renderer/stores/useWorkingDirectoryStore'
import { ActiveSource } from '@renderer/sources/types'
import { HydraState } from '@renderer/sources/hydra/store'

/** The focused layer, when it's a Hydra layer */
export function focusedHydra(): ActiveSource<HydraState> | undefined {
  const { active, focused } = useSourcesStore.getState()
  const source = focused ? active[focused] : undefined
  return source?.manifest.id === 'hydra' ? (source as ActiveSource<HydraState>) : undefined
}

/** Reads a .js file into the focused Hydra layer. Returns whether it opened. */
export async function openPatchFile(path: string): Promise<boolean> {
  const instance = focusedHydra()
  if (!instance) return false
  const { success, content, error } = await window.api.hydraFile.read(path)
  if (success && content !== undefined) {
    instance.useStore.getState().openShader(content, path)
    return true
  }
  console.error(error)
  void useWorkingDirectoryStore.getState().refresh()
  return false
}
