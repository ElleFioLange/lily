import { useEffect, useRef } from 'react'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin, RendererProps } from 'src/types/plugins'
import { SyphonState } from '../store'

export default function Renderer({ instanceId, ...props }: RendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<SyphonState>
  const { canvas: sourceCanvas } = instance.useStore()

  useEffect(() => {
    if (!canvasRef.current || !sourceCanvas) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 1920
    canvas.height = 1080

    let rafId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height)
      rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [sourceCanvas])

  return <canvas ref={canvasRef} className="size-full" {...props} />
}
