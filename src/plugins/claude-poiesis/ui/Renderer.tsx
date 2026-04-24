import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { useEffect, useRef } from 'react'
import { ActivePlugin, RendererProps } from 'src/types/plugins'
import { ClaudePoiesisState } from '../store'

// Neither axis may stretch more than MAX_SCALE times the other axis's natural fill factor
const MAX_SCALE = 4

function drawMask(canvas: HTMLCanvasElement, word: string, font: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (!word) return

  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Render area inset by 4% of canvas width on all sides
  const pad = canvas.width * 0.04
  const renderW = canvas.width - pad * 2
  const renderH = canvas.height - pad * 2

  // Measure text bounding box at a fixed reference size
  const baseFontSize = 200
  ctx.font = `bold ${baseFontSize}px ${font}`
  const metrics = ctx.measureText(word)
  const textW = metrics.width
  const textH = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent

  const rawScaleX = renderW / textW
  const rawScaleY = renderH / textH

  // Cap each axis so neither can exceed MAX_SCALE times the other's natural fill factor
  const scaleX = Math.min(rawScaleX, rawScaleY * MAX_SCALE)
  const scaleY = Math.min(rawScaleY, rawScaleX * MAX_SCALE)

  // Center the scaled text box within the render area
  const tx = pad + (renderW - textW * scaleX) / 2
  const ty = pad + (renderH - textH * scaleY) / 2 + metrics.actualBoundingBoxAscent * scaleY

  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = 'rgba(255, 255, 255, 1)'
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.save()
  ctx.translate(tx, ty)
  ctx.scale(scaleX, scaleY)
  ctx.fillText(word, 0, 0)
  ctx.restore()

  ctx.globalCompositeOperation = 'source-over'
}

export default function Renderer({ instanceId, ...props }: RendererProps) {
  const previewRef = useRef<HTMLCanvasElement>(null)
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<ClaudePoiesisState>
  const { maskCanvas, maskWord, maskFont } = instance.useStore()

  // Redraw mask canvas whenever the displayed word or font changes
  useEffect(() => {
    if (!maskCanvas) return
    drawMask(maskCanvas, maskWord, maskFont)
  }, [maskWord, maskFont, maskCanvas])

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
