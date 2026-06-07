import { createAbletonStore } from './store'
import { fetchSelection, onShowInLily } from './bridge'

export default function init(instanceId: string) {
  const useAbletonStore = createAbletonStore(instanceId)

  // --- M4L get-state read path (powers the Workspace) -----------------------
  useAbletonStore.getState().setIsLoading(true)
  window.api.osc.send('/get-state', [])

  // Accumulate packets in a local buffer and write the store ONCE on
  // completion. Writing every packet into the store re-rendered every
  // subscriber per packet (hundreds of sets per refresh) and froze the UI.
  let stateBuffer: Record<string, string> = {}
  window.api.osc.onMessage((message) => {
    if (message.address !== '/send/state') return

    const payload = message.args[0] as string
    const spaceIdx = payload.indexOf(' ')
    const [msgIdx, total] = payload.slice(0, spaceIdx).split('/')
    stateBuffer[msgIdx] = payload.slice(spaceIdx + 1)

    if (msgIdx === total) {
      const chunks = Object.values(stateBuffer)
      stateBuffer = {}
      if (chunks.length !== Number(total)) {
        console.warn(`[ableton] get-state incomplete: ${chunks.length}/${total} packets`)
      }
      try {
        useAbletonStore.getState().setAbletonProject(JSON.parse(chunks.join(''))) // also clears isLoading
      } catch (e) {
        console.error('[ableton] get-state parse failed', e)
        useAbletonStore.getState().setIsLoading(false)
      }
    }
  })

  // --- Extension-bridge read path (powers the Monitor) ----------------------
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
