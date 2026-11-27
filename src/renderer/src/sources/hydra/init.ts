import Hydra from 'hydra-synth'
import { createHydraStore } from './store'
import { useGraphicsStore } from '@renderer/stores/useGraphicsStore'
import { ensurePatchPreview } from './patchPreview'
import { resolveSourceUrls } from '@renderer/utils/fileUrl'
import { guardUniforms } from './uniformGuard'

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
  // s0.initImage('reds.svg') and the like load from Lily's file server
  resolveSourceUrls(hydra as unknown as { s: object[] })
  // A patch's missing values can't freeze the layer
  guardUniforms(hydra as unknown as { o: object[] })

  const store = useHydraStore.getState()

  store.setHydra(hydra)
  store.setCanvas(canvas)

  const { addGraphicsSource, addEditorSource } = useGraphicsStore.getState()

  addGraphicsSource({ id: instanceId, canvas })
  addEditorSource({ id: instanceId })

  // The hidden instance Cmd+Enter previews patches in, shared by every layer
  ensurePatchPreview()

  console.log('hydra initialized')

  return useHydraStore
}
