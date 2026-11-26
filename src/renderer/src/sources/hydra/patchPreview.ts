import Hydra from 'hydra-synth'
import { create } from 'zustand'
import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { ActiveSource } from '@renderer/sources/types'
import { HydraState } from './store'
import { evalPatch } from './process'

const WIDTH = 1920
const HEIGHT = 1080

type HydraInstance = HydraState['hydra']

interface PatchPreviewState {
  /** The hidden Hydra instance that previews patches. Created with the first Hydra layer. */
  hydra: HydraInstance | null
  canvas: HTMLCanvasElement | null
  /** The layer whose edited patch the preview is showing, if any */
  instanceId: string | null
  /** Error from the last preview evaluation, shown in the editor */
  error: string | null
  setPreviewing: (instanceId: string | null) => void
  setError: (error: string | null) => void
}

export const usePatchPreviewStore = create<PatchPreviewState>((set) => ({
  hydra: null,
  canvas: null,
  instanceId: null,
  error: null,
  setPreviewing: (instanceId) => set({ instanceId, error: null }),
  setError: (error) => set({ error })
}))

function hydraLayer(instanceId: string | null): ActiveSource<HydraState> | undefined {
  if (!instanceId) return undefined
  const source = useSourcesStore.getState().active[instanceId]
  return source?.manifest.id === 'hydra' ? (source as ActiveSource<HydraState>) : undefined
}

/**
 * Creates the hidden preview instance once. It is never added to the compositor, so it stays
 * out of the mixer, the monitors and the performance output. While a layer is being
 * previewed, a rAF loop drives it on the layer's own clock (time and speed), so the preview
 * lines up with what the layer is playing.
 */
export function ensurePatchPreview(): void {
  if (usePatchPreviewStore.getState().hydra) return

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  canvas.getContext('webgl', { preserveDrawingBuffer: true })

  // Required for hydra's audio detection to work
  const parent = document.createElement('div')
  parent.appendChild(canvas)

  const hydra = new Hydra({
    detectAudio: true,
    canvas,
    makeGlobal: false,
    precision: 'highp',
    autoLoop: false
  })
  usePatchPreviewStore.setState({ hydra, canvas })

  const loop = () => {
    const { instanceId, setPreviewing } = usePatchPreviewStore.getState()
    if (instanceId) {
      const layer = hydraLayer(instanceId)
      const layerHydra = layer?.useStore.getState().hydra
      if (!layer || !layerHydra) {
        // The layer was closed
        setPreviewing(null)
      } else if (useSourcesStore.getState().focused === instanceId) {
        hydra.synth.time = layerHydra.synth.time
        hydra.tick(0)
      }
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}

/** Cmd+Enter: load the focused layer's edited patch into the preview instance and show it. */
export async function previewFocused(): Promise<void> {
  const { focused } = useSourcesStore.getState()
  const layer = hydraLayer(focused)
  if (!layer || !focused) return
  ensurePatchPreview()
  const { hydra, setPreviewing, setError } = usePatchPreviewStore.getState()
  const { shader, speed } = layer.useStore.getState()
  setPreviewing(focused)
  try {
    // Start each preview from a clean slate (hush also renders o0 again), so outputs a previous
    // preview set up, maybe for another layer, don't leak in: the patch shows as it would run
    // from scratch.
    hydra.synth.hush()
    await evalPatch(hydra.synth, shader)
    // The layer's speed control wins over any `speed = ...` in the patch, as on the layer
    hydra.synth.speed = speed
  } catch (error) {
    console.error('[patch preview] evaluation failed:', error)
    setError(error instanceof Error ? error.message : String(error))
  }
}

/** Back to the layer's live output, without running anything. */
export function endPreview(instanceId?: string): void {
  const { instanceId: previewing, setPreviewing } = usePatchPreviewStore.getState()
  if (previewing && (instanceId === undefined || previewing === instanceId)) setPreviewing(null)
}
