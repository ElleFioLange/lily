import { useEffect, useRef } from 'react'
import { TILE_CLASS } from './MonitorTile'

const WIDTH = 480
const HEIGHT = 270

type CanvasMirrorProps = {
  source: HTMLCanvasElement | null
  title?: string
  onClick?: () => void
  /** Sizing classes; a monitor tile by default */
  className?: string
}

/** Copies a source canvas into a small tile every frame. */
export default function CanvasMirror({
  source,
  title,
  onClick,
  className = TILE_CLASS
}: CanvasMirrorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !source) return
    let rafId = 0
    const loop = () => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT)
      ctx.drawImage(source, 0, 0, WIDTH, HEIGHT)
      rafId = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(rafId)
  }, [source])

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      title={title}
      onClick={onClick}
      className={`${className} ${onClick ? 'cursor-pointer hover:outline hover:outline-stone-500' : ''}`}
    />
  )
}
