import Hydra from 'hydra-synth'
import { useHydraStore } from './store'
import { getCompositor } from '@plugins/helpers'

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

  const compositor = getCompositor()
  compositor?.addSource({
    id: 'hydra',
    canvas,
    alpha: 1,
    zIndex: 0,
    blendMode: 'source-over',
    enabled: true
  })
}
