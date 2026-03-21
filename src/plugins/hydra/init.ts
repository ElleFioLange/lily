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

  // This is required for hydra's audio detection to work
  const parent = document.createElement('div')
  parent.appendChild(canvas)

  const hydra = new Hydra({
    detectAudio: true,
    canvas: canvas,
    makeGlobal: false,
    precision: 'highp',
    autoLoop: true
  })

  const store = useHydraStore.getState()

  store.setHydra(hydra)
  store.setCanvas(canvas)

  const { addGraphicsSource, addEditorSource } = useGraphicsStore.getState()

  addGraphicsSource({ id: instanceId, canvas })
  addEditorSource({ id: instanceId })

  console.log('hydra initialized')

  return useHydraStore
}
