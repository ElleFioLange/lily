import { useGraphicsStore } from '@renderer/stores/useGraphicsStore'
import { createPoiesisStore } from './store'

export default function init(instanceId) {
  const usePoiesisStore = createPoiesisStore(instanceId)
  const { addEditorSource } = useGraphicsStore.getState()

  addEditorSource({ id: instanceId })

  return usePoiesisStore
}
