import { createPoiesisStore } from './store'

export default function init(instanceId) {
  const usePoiesisStore = createPoiesisStore(instanceId)

  return usePoiesisStore
}
