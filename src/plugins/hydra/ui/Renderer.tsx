import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { HTMLProps, useEffect, useRef } from 'react'
import { ActivePlugin, UIProps } from 'src/types/plugins'
import { HydraState } from '../store'

type RendererProps = HTMLProps<HTMLCanvasElement> & UIProps

export default function Renderer({ instanceId, ...props }: RendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<HydraState>
  const useHydraStore = instance.useStore
  const hydraCanvas = useHydraStore((state) => state.canvas)

  useEffect(() => {
    if (!canvasRef.current || !hydraCanvas) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    canvas.width = 1920
    canvas.height = 1080

    const animate = () => {
      ctx?.clearRect(0, 0, 1920, 1080)
      ctx?.drawImage(hydraCanvas, 0, 0)
      const rafId = requestAnimationFrame(animate)
      return rafId
    }

    const rafId = animate()
    return () => cancelAnimationFrame(rafId)
  }, [hydraCanvas])

  return <canvas ref={canvasRef} className="size-full" {...props} />
}
