import Hydra from 'hydra-synth'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { useEffect, useRef } from 'react'
import { ActivePlugin, RendererProps } from 'src/types/plugins'
import { HydraState } from '../store'
import { evalPatch } from '../process'

export default function Renderer({ instanceId, ...props }: RendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<HydraState>
  const useStore = instance.useStore
  const { canvas: sourceCanvas, monitorActive } = useStore()

  // Display loop: copy whichever source is active (main signal or monitor) into
  // the visible canvas. The source is read from the store each frame so toggling
  // the monitor swaps the view without tearing down the loop.
  useEffect(() => {
    if (!canvasRef.current || !sourceCanvas) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    canvas.width = 1920
    canvas.height = 1080

    let rafId = 0
    const animate = () => {
      const { monitorActive, monitorCanvas } = useStore.getState()
      const source = monitorActive && monitorCanvas ? monitorCanvas : sourceCanvas
      ctx?.clearRect(0, 0, 1920, 1080)
      ctx?.drawImage(source, 0, 0)
      rafId = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(rafId)
  }, [sourceCanvas, useStore])

  // Monitor lifecycle: a second hydra instance that renders the live patch with
  // `render()` appended (a 4-up split of o0..o3), time-synced to the main signal.
  // It is intentionally never added to the compositor, so it stays out of the
  // mixer and the performance output.
  useEffect(() => {
    if (!monitorActive) return

    const { hydra: mainHydra, shader, setMonitorHydra, setMonitorCanvas } = useStore.getState()
    if (!mainHydra) return

    const canvas = document.createElement('canvas')
    canvas.width = 1920
    canvas.height = 1080
    canvas.getContext('webgl', { preserveDrawingBuffer: true })

    // This is required for hydra's audio detection to work
    const parent = document.createElement('div')
    parent.appendChild(canvas)

    const monitorHydra = new Hydra({
      detectAudio: true,
      canvas,
      makeGlobal: false,
      precision: 'highp',
      autoLoop: false
    })

    setMonitorHydra(monitorHydra)
    setMonitorCanvas(canvas)

    // Show the current patch immediately, without waiting for the next Run.
    evalPatch(monitorHydra.synth, `${shader}\nrender()`).catch((e) =>
      console.error('Monitor patch evaluation failed:', e)
    )

    // Drive the monitor ourselves (autoLoop is off) so its time tracks the main
    // signal exactly: copy the main's time in, then tick with dt=0 so the value
    // we set is the value rendered.
    let rafId = 0
    const loop = () => {
      monitorHydra.synth.time = mainHydra.synth.time
      monitorHydra.tick(0)
      rafId = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      cancelAnimationFrame(rafId)
      setMonitorHydra(null)
      setMonitorCanvas(null)
    }
  }, [monitorActive, useStore])

  return <canvas ref={canvasRef} className="size-full" {...props} />
}
