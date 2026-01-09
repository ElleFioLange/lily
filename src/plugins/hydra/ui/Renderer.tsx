import { HTMLProps, useEffect, useRef } from 'react'
import { useHydraStore } from '../store'

export default function Renderer(props: HTMLProps<HTMLCanvasElement>) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hydraCanvas = useHydraStore((state) => state.canvas)

  useEffect(() => {
    if (!canvasRef.current || !hydraCanvas) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    canvas.width = 1920
    canvas.height = 1080

    const animate = () => {
      ctx?.drawImage(hydraCanvas, 0, 0)
      const rafId = requestAnimationFrame(animate)
      return rafId
    }

    const rafId = animate()
    return () => cancelAnimationFrame(rafId)
  }, [hydraCanvas])

  return <canvas ref={canvasRef} className="size-full" {...props} />
}
