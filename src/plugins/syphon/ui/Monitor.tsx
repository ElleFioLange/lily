import { useEffect, useRef } from 'react'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin, UIProps } from 'src/types/plugins'
import { SyphonState } from '../store'

export default function Monitor({ instanceId, ...props }: UIProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<SyphonState>
  const {
    canvas: sourceCanvas,
    frameWidth,
    frameHeight,
    frameCount,
    connectedServerUUID,
    servers
  } = instance.useStore()

  const connectedServer = servers.find((s) => s.uuid === connectedServerUUID)

  useEffect(() => {
    if (!canvasRef.current || !sourceCanvas) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 480
    canvas.height = 270

    let rafId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height)
      rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [sourceCanvas])

  return (
    <div className="flex flex-col gap-3 p-4 size-full" {...props}>
      <div
        className="relative bg-stone-900 rounded overflow-hidden"
        style={{ aspectRatio: '16/9', maxWidth: 480 }}
      >
        {connectedServerUUID ? (
          <canvas ref={canvasRef} className="size-full object-contain" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-stone-600 text-sm">
            No source connected
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 text-xs text-stone-400">
        <div>
          <span className="text-stone-500">Source: </span>
          {connectedServer ? (
            <span className="text-stone-300">
              {connectedServer.name || '(unnamed)'} — {connectedServer.appName}
            </span>
          ) : (
            <span className="italic">none</span>
          )}
        </div>
        {frameWidth > 0 && (
          <div>
            <span className="text-stone-500">Resolution: </span>
            <span className="text-stone-300">
              {frameWidth} × {frameHeight}
            </span>
          </div>
        )}
        <div>
          <span className="text-stone-500">Frames: </span>
          <span className="text-stone-300">{frameCount}</span>
        </div>
      </div>
    </div>
  )
}
