import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { useEffect, useRef } from 'react'
import { ActivePlugin, RendererProps } from 'src/types/plugins'
import { HydraState } from '../store'

export default function Renderer({ instanceId, ...props }: RendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<HydraState>
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
