import { useGraphicsStore } from '@renderer/stores/useGraphicsStore'
import { createLLMPoiesisStore } from './store'

export default function init(instanceId: string) {
  const usePoiesisStore = createLLMPoiesisStore(instanceId)
  const { addEditorSource, addGraphicsSource } = useGraphicsStore.getState()

  addEditorSource({ id: instanceId })

  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = 1920
  maskCanvas.height = 1080

  addGraphicsSource({ id: instanceId, canvas: maskCanvas })
  usePoiesisStore.getState().setMaskCanvas(maskCanvas)

  return usePoiesisStore
}
