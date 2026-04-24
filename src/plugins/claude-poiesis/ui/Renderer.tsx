import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { useEffect, useRef } from 'react'
import { ActivePlugin, RendererProps } from 'src/types/plugins'
import { ClaudePoiesisState } from '../store'

function drawMask(canvas: HTMLCanvasElement, word: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (!word) return

  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Scale font so text spans full canvas width
  const baseFontSize = 200
  ctx.font = `bold ${baseFontSize}px sans-serif`
  const metrics = ctx.measureText(word)
  const fontSize = Math.floor((baseFontSize * canvas.width) / metrics.width)

  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'

  // Punch transparent holes where text glyphs are
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = 'rgba(255, 255, 255, 1)'
  ctx.fillText(word, 0, canvas.height / 2)

  ctx.globalCompositeOperation = 'source-over'
}

export default function Renderer({ instanceId, ...props }: RendererProps) {
  const previewRef = useRef<HTMLCanvasElement>(null)
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<ClaudePoiesisState>
  const { maskCanvas, maskWord } = instance.useStore()

  // Redraw mask canvas whenever the displayed word changes
  useEffect(() => {
    if (!maskCanvas) return
    drawMask(maskCanvas, maskWord)
  }, [maskWord, maskCanvas])

  // Mirror mask canvas to the preview element via RAF
  useEffect(() => {
    if (!previewRef.current || !maskCanvas) return

    const canvas = previewRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = maskCanvas.width
    canvas.height = maskCanvas.height

    let rafId: number
    const animate = () => {
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      ctx?.drawImage(maskCanvas, 0, 0)
      rafId = requestAnimationFrame(animate)
    }
    animate()

    return () => cancelAnimationFrame(rafId)
  }, [maskCanvas])

  return <canvas ref={previewRef} className="size-full" {...props} />
}
