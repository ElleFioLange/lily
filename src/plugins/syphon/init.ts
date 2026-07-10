import { createSyphonStore } from './store'
import { useGraphicsStore } from '@renderer/stores/useGraphicsStore'

export default function init(instanceId: string) {
  const useStore = createSyphonStore(instanceId)

  const canvas = document.createElement('canvas')
  canvas.width = 1920
  canvas.height = 1080
  canvas.getContext('2d')

  useStore.getState().setCanvas(canvas)

  const { addGraphicsSource } = useGraphicsStore.getState()
  addGraphicsSource({ id: instanceId, canvas })

  // Syphon frames arrive with OpenGL's bottom-up row order, so they must be
  // flipped vertically. putImageData ignores canvas transforms, so stage the
  // raw frame here first, then drawImage it with a Y-flip.
  const scratch = document.createElement('canvas')

  // Listen for frames from main process
  const handleFrame = (
    _: unknown,
    payload: { instanceId: string; buffer: ArrayBuffer; width: number; height: number }
  ) => {
    if (payload.instanceId !== instanceId) return

    const store = useStore.getState()
    const ctx = store.canvas?.getContext('2d')
    if (!ctx || !store.canvas) return

    const { buffer, width, height } = payload

    // Resize canvas if dimensions changed
    if (store.canvas.width !== width || store.canvas.height !== height) {
      store.canvas.width = width
      store.canvas.height = height
      store.setFrameDimensions(width, height)
    }

    if (scratch.width !== width || scratch.height !== height) {
      scratch.width = width
      scratch.height = height
    }

    const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height)
    const scratchCtx = scratch.getContext('2d')
    if (!scratchCtx) return
    scratchCtx.putImageData(imageData, 0, 0)

    ctx.save()
    ctx.translate(0, height)
    ctx.scale(1, -1)
    ctx.drawImage(scratch, 0, 0)
    ctx.restore()
    store.incrementFrameCount()
  }

  window.api.syphon.onFrame(handleFrame)

  // Fetch initial server list
  window.api.syphon.listServers().then((servers) => {
    useStore.getState().setServers(servers)
  })

  // Listen for server list changes
  window.api.syphon.onServersChanged((servers) => {
    useStore.getState().setServers(servers)
  })

  console.log('[Syphon] plugin initialized:', instanceId)
  return useStore
}
