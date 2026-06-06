import { createAbletonStore } from './store'
import { fetchSelection, onShowInLily } from './bridge'

export default function init(instanceId: string) {
  const useAbletonStore = createAbletonStore(instanceId)

  // --- M4L get-state read path (powers the Workspace) -----------------------
  useAbletonStore.getState().setIsLoading(true)
  window.api.osc.send('/get-state', [])

  window.api.osc.onMessage((message) => {
    if (message.address !== '/send/state') return

    const payload = message.args[0] as string
    const spaceIdx = payload.indexOf(' ')
    const [msgIdx, total] = payload.slice(0, spaceIdx).split('/')
    const data = payload.slice(spaceIdx + 1)

    const { abletonProjectBuffer, setAbletonProjectBuffer, setAbletonProject } =
      useAbletonStore.getState()
    const newBuffer = { ...abletonProjectBuffer, [msgIdx]: data }
    setAbletonProjectBuffer(newBuffer)

    if (msgIdx === total) {
      const chunks = Object.values(newBuffer)
      if (chunks.length !== Number(total)) chunks.push(data)
      setAbletonProject(JSON.parse(chunks.join(''))) // also clears isLoading
      setAbletonProjectBuffer({})
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
