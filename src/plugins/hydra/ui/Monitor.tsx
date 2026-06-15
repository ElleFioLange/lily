import Hydra from 'hydra-synth'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin, UIProps } from 'src/types/plugins'
import { HydraState } from '../store'
import { evalPatch } from '../process'
import { useEffect, useRef } from 'react'

const MONITOR_WIDTH = 1920
const MONITOR_HEIGHT = 1080

// Output → quadrant of the 4-up render() canvas. The hydra renderAll shader lays
// the outputs out column-major (quad = 2*floor(x) + floor(y)), so:
//   o0 = top-left, o1 = bottom-left, o2 = top-right, o3 = bottom-right.
// Origins are normalized; each quadrant is half the width and half the height.
const QUADRANTS = [
  { sx: 0, sy: 0 }, // o0
  { sx: 0, sy: 0.5 }, // o1
  { sx: 0.5, sy: 0 }, // o2
  { sx: 0.5, sy: 0.5 } // o3
]

export default function Monitor({ instanceId, ...props }: UIProps) {
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<HydraState>
  const useStore = instance.useStore
  const { monitorActive, toggleMonitor } = useStore()

  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])

  // Monitor lifecycle: a second hydra instance that renders the live patch with
  // `render()` appended (a 4-up split of o0..o3), time-synced to the main signal.
  // It is intentionally never added to the compositor, so it stays out of the
  // mixer and the performance output. Each frame we copy the four quadrants of
  // its canvas into the four monitor canvases below.
  useEffect(() => {
    if (!monitorActive) return

    const { hydra: mainHydra, shader, setMonitorHydra, setMonitorCanvas } = useStore.getState()
    if (!mainHydra) return

    const canvas = document.createElement('canvas')
    canvas.width = MONITOR_WIDTH
    canvas.height = MONITOR_HEIGHT
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

      QUADRANTS.forEach(({ sx, sy }, i) => {
        const out = canvasRefs.current[i]
        const ctx = out?.getContext('2d')
        if (!out || !ctx) return
        ctx.clearRect(0, 0, out.width, out.height)
        ctx.drawImage(
          canvas,
          sx * MONITOR_WIDTH,
          sy * MONITOR_HEIGHT,
          MONITOR_WIDTH / 2,
          MONITOR_HEIGHT / 2,
          0,
          0,
          out.width,
          out.height
        )
      })

      rafId = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      cancelAnimationFrame(rafId)
      setMonitorHydra(null)
      setMonitorCanvas(null)
    }
  }, [monitorActive, useStore])

  return (
    <div className="size-full flex flex-col" {...props}>
      <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-800">
        <label className="text-xs text-stone-400 flex items-center gap-2 cursor-pointer select-none">
          <div
            className={`w-8 h-4 rounded-full relative transition-colors ${monitorActive ? 'bg-stone-400' : 'bg-stone-700'}`}
            onClick={toggleMonitor}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-stone-100 transition-transform ${monitorActive ? 'translate-x-4' : 'translate-x-0.5'}`}
            />
          </div>
          monitor (o0–o3) · ⌘⇧M
        </label>
      </div>
      {monitorActive && (
        <div className="flex-1 flex gap-4 p-8 overflow-auto">
          {QUADRANTS.map((_, i) => (
            <canvas
              key={i}
              ref={(el) => {
                canvasRefs.current[i] = el
              }}
              width={MONITOR_WIDTH / 2}
              height={MONITOR_HEIGHT / 2}
              className="flex-1 min-w-0 self-start aspect-video bg-black"
            />
          ))}
        </div>
      )}
    </div>
  )
}
