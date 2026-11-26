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

/** Renames a layer after its patch file: "tides" for .../tides.js */
export function nameLayerAfterFile(instanceId: string, path: string): void {
  const name = path
    .split(/[\\/]/)
    .at(-1)
    ?.replace(/\.[^.]+$/, '')
  if (name) useSourcesStore.getState().renameLayer(instanceId, name)
}

/** Reads a .js file into the focused Hydra layer. Returns whether it opened. */
export async function openPatchFile(path: string): Promise<boolean> {
  const instance = focusedHydra()
  if (!instance) return false
  const { success, content, error } = await window.api.hydraFile.read(path)
  if (success && content !== undefined) {
    instance.useStore.getState().openShader(content, path)
    nameLayerAfterFile(instance.instanceId, path)
    return true
  }
  console.error(error)
  void useWorkingDirectoryStore.getState().refresh()
  return false
}

/**
 * Asks for a .js file anywhere and opens it in the focused Hydra layer. A file from outside the
 * working directory is added to the browser's list for this session; the folder stays the same.
 */
export async function openPatchFromAnywhere(): Promise<boolean> {
  const instance = focusedHydra()
  if (!instance) return false
  const { success, content, path, error } = await window.api.hydraFile.open()
  if (!success || content === undefined || !path) {
    if (error) console.error(error)
    return false
  }
  instance.useStore.getState().openShader(content, path)
  nameLayerAfterFile(instance.instanceId, path)
  useWorkingDirectoryStore.getState().addExtraFile(path)
  return true
}
