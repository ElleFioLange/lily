import { useEffect, useRef, useState } from 'react'
import { usePerformanceStore } from '@renderer/stores/usePerformanceStore'
import { MixerParams } from '@renderer/stores/useGraphicsStore'
import { Compositor } from '@renderer/graphics/Compositor'
import { UIProps } from '@renderer/sources/types'
import EditorOverlays from './EditorOverlays'

const DEFAULT_STAGE = { width: 1920, height: 1080 }

type StageProps = {
  compositor: Compositor | null
  outputId: string
  editors: Record<string, MixerParams>
  editorsOrder: string[]
  environment: NonNullable<UIProps['environment']>
}

/**
 * Scaled replica of the performance window for a given mix. The stage is laid out at the
 * performance window's real size and CSS-scaled to fit its container, so text sizes and
 * positions match exactly. Fills the nearest positioned ancestor.
 */
export default function Stage({
  compositor,
  outputId,
  editors,
  editorsOrder,
  environment
}: StageProps) {
  const windowRef = usePerformanceStore((state) => state.windowRef)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stage, setStage] = useState(DEFAULT_STAGE)
  const [container, setContainer] = useState({ width: 0, height: 0 })

  // Match the performance window's size when it's open
  useEffect(() => {
    if (!windowRef) {
      setStage(DEFAULT_STAGE)
      return
    }
    const handleResize = () =>
      setStage({ width: windowRef.innerWidth, height: windowRef.innerHeight })
    handleResize()
    windowRef.addEventListener('resize', handleResize)
    return () => windowRef.removeEventListener('resize', handleResize)
  }, [windowRef])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setContainer({ width, height })
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!canvasRef.current || !compositor) return
    compositor.addOutput({ id: outputId, canvas: canvasRef.current, window })
    compositor.startRenderLoop(outputId)
    return () => {
      compositor.stopRenderLoop(outputId)
      compositor.removeOutput(outputId)
    }
  }, [compositor, outputId])

  const scale = Math.min(container.width / stage.width, container.height / stage.height) || 0
  const dpr = window.devicePixelRatio || 1

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-stone-950">
      <div
        className="absolute bg-black overflow-hidden pointer-events-none"
        style={{
          width: stage.width,
          height: stage.height,
          left: (container.width - stage.width * scale) / 2,
          top: (container.height - stage.height * scale) / 2,
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
      >
        {/* Composite at displayed resolution rather than full stage size */}
        <canvas
          ref={canvasRef}
          className="size-full block absolute"
          width={Math.max(1, Math.round(stage.width * scale * dpr))}
          height={Math.max(1, Math.round(stage.height * scale * dpr))}
        />
        <EditorOverlays editors={editors} editorsOrder={editorsOrder} environment={environment} />
      </div>
    </div>
  )
}
