import { removeLiveStore } from './store'

export default function cleanup(instanceId: string) {
  removeLiveStore(instanceId)
}
