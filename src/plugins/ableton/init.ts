import { createAbletonStore } from './store'
import { fetchSelection, onShowInLily } from './bridge'

export default function init(instanceId: string) {
  const useAbletonStore = createAbletonStore(instanceId)

  // The extension bridge is the single read path — refresh() derives both the
  // Monitor view and the Workspace's abletonProject from one /snapshot fetch.
  // (The old M4L /get-state packet stream is retired; M4L is control-only.)
  //
  // Live "Show in Lily" pushes → selection. A push also implies Live is up,
  // so grab a snapshot if we don't have one yet. (The preload OSC API has no
  // unsubscribe, so these listeners outlive the instance; they only set state
  // on this store, which is harmless after unload.)
  onShowInLily((sel) => {
    const state = useAbletonStore.getState()
    state.setSelection(sel)
    if (!state.snapshot && !state.refreshing) void state.refresh()
  })

  // Best-effort initial load: current set + any selection made before launch.
  void useAbletonStore.getState().refresh()
  fetchSelection()
    .then((sel) => {
      if (sel) useAbletonStore.getState().setSelection(sel)
    })
    .catch(() => {
      /* bridge not up — fine */
    })

  return useAbletonStore
}
