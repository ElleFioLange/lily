import { acquireAudioContext } from './audioContext'
import { createStrudelStore } from './store'
import { createRepl } from './replMap'

export default function init(instanceId: string) {
  acquireAudioContext()
  const useStore = createStrudelStore(instanceId)
  createRepl(instanceId, (widgets) => useStore.getState().setWidgets(widgets))
  return useStore
}
