import Hydra from 'hydra-synth'
import { createHydraStore } from './store'
import { useGraphicsStore } from '@renderer/stores/useGraphicsStore'

export default function init(instanceId: string) {
  const useHydraStore = createHydraStore(instanceId)

  const canvas = document.createElement('canvas')
  canvas.width = 1920
  canvas.height = 1080

  // Get WebGL context with preserveDrawingBuffer for compositor reading
  canvas.getContext('webgl', { preserveDrawingBuffer: true })

  const hydra = new Hydra({
    detectAudio: false,
    canvas: canvas,
    makeGlobal: false,
    autoLoop: true
  })

  const store = useHydraStore.getState()

  store.setHydra(hydra)
  store.setCanvas(canvas)

  const { addSource, compositorRef } = useGraphicsStore.getState()

  addSource('hydra', canvas)

  return useHydraStore
}
