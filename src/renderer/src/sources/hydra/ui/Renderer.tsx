import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { useEffect, useRef } from 'react'
import { ActiveSource, RendererProps } from '@renderer/sources/types'
import { HydraState } from '../store'

export default function Renderer({ instanceId, ...props }: RendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { getInstance } = useSourcesStore()
  const instance = getInstance(instanceId) as ActiveSource<HydraState>
  const { canvas: sourceCanvas } = instance.useStore()

  useEffect(() => {
    if (!canvasRef.current || !sourceCanvas) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    canvas.width = 1920
    canvas.height = 1080

    const animate = () => {
      ctx?.clearRect(0, 0, 1920, 1080)
      ctx?.drawImage(sourceCanvas, 0, 0)
      const rafId = requestAnimationFrame(animate)
      return rafId
    }

    const rafId = animate()
    return () => cancelAnimationFrame(rafId)
  }, [sourceCanvas])

  return <canvas ref={canvasRef} className="size-full" {...props} />
}
