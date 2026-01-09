import Hydra from 'hydra-synth'
import { useHydraStore } from './store'

export default function init() {
  const canvas = document.createElement('canvas')
  canvas.width = 1920
  canvas.height = 1080

  const hydra = new Hydra({
    detectAudio: false,
    canvas: canvas,
    makeGlobal: false,
    autoLoop: true
  })

  const store = useHydraStore.getState()

  store.setHydra(hydra)
  store.setCanvas(canvas)
}
