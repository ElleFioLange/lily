import { createLiveStore } from './store'
import { fetchSelection, onShowInLily } from './bridge'

export default function init(instanceId: string) {
  const useStore = createLiveStore(instanceId)

  // Live "Show in Lily" pushes → selection. (The preload OSC API has no
  // unsubscribe, so this listener outlives the instance; it only sets state
  // on this store, which is harmless after unload.)
  onShowInLily((sel) => useStore.getState().setSelection(sel))

  // Best-effort initial load: current set + any selection made before launch.
  void useStore.getState().refresh()
  fetchSelection()
    .then((sel) => {
      if (sel) useStore.getState().setSelection(sel)
    })
    .catch(() => {
      /* bridge not up — fine */
    })

  return useStore
}
