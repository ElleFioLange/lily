import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { useEffect, useRef } from 'react'
import { ActiveSource, RendererProps } from '@renderer/sources/types'
import { HydraState } from '../store'
import { usePatchPreviewStore } from '../patchPreview'

const WIDTH = 1920
const HEIGHT = 1080

/**
 * The visuals behind the editor: the layer's live output, or, while this layer is being
 * previewed (Cmd+Enter), the hidden preview instance. The live output then shows in the
 * corner picture-in-picture instead.
 */
export default function Renderer({ instanceId, ...props }: RendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { getInstance } = useSourcesStore()
  const instance = getInstance(instanceId) as ActiveSource<HydraState>
  const { canvas: layerCanvas } = instance.useStore()
  const previewCanvas = usePatchPreviewStore((state) =>
    state.instanceId === instanceId ? state.canvas : null
  )
  const sourceCanvas = previewCanvas ?? layerCanvas

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sourceCanvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = WIDTH
    canvas.height = HEIGHT

    let rafId = 0
    const animate = () => {
      ctx?.clearRect(0, 0, WIDTH, HEIGHT)
      ctx?.drawImage(sourceCanvas, 0, 0)
      rafId = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(rafId)
  }, [sourceCanvas])

  return <canvas ref={canvasRef} className="size-full" {...props} />
}
