import { useGraphicsStore } from '@renderer/stores/useGraphicsStore'

export default function cleanup(instanceId: string) {
  const { removeSource } = useGraphicsStore.getState()
  removeSource(`${instanceId}-mask`)
}
