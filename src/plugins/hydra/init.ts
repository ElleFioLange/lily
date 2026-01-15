import Hydra from 'hydra-synth'
import { useHydraStore } from './store'
import { useGraphicsStore } from '@renderer/stores/useGraphicsStore'

export default function init() {
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

  console.log('hydra plugin init')
  console.log(compositorRef)
  console.log(compositorRef?.getSources())
}
