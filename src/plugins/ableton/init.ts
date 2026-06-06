import { getLiveStore } from './store'

export default function init(instanceId: string) {
  window.api.osc.onMessage((message) => {
    if (message.address !== '/send/state') return

    const useStore = getLiveStore(instanceId)
    if (!useStore) return

    const payload = message.args[0] as string
    const spaceIdx = payload.indexOf(' ')
    const [msgIdx, total] = payload.slice(0, spaceIdx).split('/')
    const data = payload.slice(spaceIdx + 1)

    const { liveProjectBuffer, setLiveProjectBuffer, setLiveProject } = useStore.getState()
    const newBuffer = { ...liveProjectBuffer, [msgIdx]: data }
    setLiveProjectBuffer(newBuffer)

    if (msgIdx === total) {
      const chunks = Object.values(newBuffer)
      if (chunks.length !== Number(total)) chunks.push(data)
      setLiveProject(JSON.parse(chunks.join('')))
      setLiveProjectBuffer({})
    }
  })
}
