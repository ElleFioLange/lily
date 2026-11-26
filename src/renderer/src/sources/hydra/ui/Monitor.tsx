import Hydra from 'hydra-synth'
import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { ActiveSource, UIProps } from '@renderer/sources/types'
import { HydraState } from '../store'
import { evalPatch } from '../process'
import { useEffect, useRef } from 'react'
import { MonitorRow, TILE_CLASS, Tile } from '@renderer/components/common/MonitorTile'

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
  const { getInstance } = useSourcesStore()
  const instance = getInstance(instanceId) as ActiveSource<HydraState>
  const useStore = instance.useStore

  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])

  // Monitor lifecycle: a second hydra instance that renders the live patch with
  // `render()` appended (a 4-up split of o0..o3), time-synced to the main signal.
  // It is intentionally never added to the compositor, so it stays out of the
  // mixer and the performance output. Each frame we copy the four quadrants of
  // its canvas into the four monitor canvases below.
  useEffect(() => {
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
  }, [useStore])

  return (
    <MonitorRow>
      {QUADRANTS.map((_, i) => (
        <Tile key={i} caption={`o${i}`}>
          <canvas
            ref={(el) => {
              canvasRefs.current[i] = el
            }}
            width={MONITOR_WIDTH / 4}
            height={MONITOR_HEIGHT / 4}
            className={TILE_CLASS}
            {...props}
          />
        </Tile>
      ))}
    </MonitorRow>
  )
}
