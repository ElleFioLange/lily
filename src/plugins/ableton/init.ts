import { createAbletonStore } from './store'

export default function init(instanceId: string) {
  const useAbletonStore = createAbletonStore(instanceId)

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
      setAbletonProject(JSON.parse(chunks.join('')))
      setAbletonProjectBuffer({})
    }
  })

  return useAbletonStore
}
