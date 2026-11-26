import Hydra from 'hydra-synth'
import { HydraState } from './store'
import { evalPatch } from './process'

const WIDTH = 640
const HEIGHT = 360

type HydraInstance = HydraState['hydra']

let hydra: HydraInstance | null = null
let canvas: HTMLCanvasElement | null = null
let rafId = 0
let last = 0
// Bumped on every show/hide, so a slow file read can't show a patch you've moved off
let token = 0

/**
 * A small hidden Hydra instance for the file browser's hover previews, created on the first
 * hover and kept (like the other instances) so its audio input isn't set up again each time.
 * It's never added to the compositor and only renders while a preview is showing.
 */
/** Sets up the instance ahead of the first hover (the file browser calls this when it opens). */
export function prepareHoverPreview(): void {
  ensureHydra()
}

function ensureHydra(): { hydra: HydraInstance; canvas: HTMLCanvasElement } {
  if (hydra && canvas) return { hydra, canvas }
  canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  canvas.getContext('webgl', { preserveDrawingBuffer: true })
  // Required for hydra's audio detection to work
  document.createElement('div').appendChild(canvas)
  hydra = new Hydra({
    detectAudio: true,
    canvas,
    makeGlobal: false,
    precision: 'mediump',
    autoLoop: false
  })
  return { hydra, canvas }
}

function startLoop(instance: HydraInstance) {
  cancelAnimationFrame(rafId)
  last = performance.now()
  const loop = (now: number) => {
    instance.tick(now - last)
    last = now
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)
}

export type HoverPreviewResult =
  | { status: 'shown'; canvas: HTMLCanvasElement }
  | { status: 'error'; error: string }
  | { status: 'stale' }

/** Reads a patch file and runs it, from scratch, in the hover preview instance. */
export async function showHoverPreview(path: string): Promise<HoverPreviewResult> {
  const mine = ++token
  const { success, content, error } = await window.api.hydraFile.read(path)
  if (mine !== token) return { status: 'stale' }
  if (!success || content === undefined)
    return { status: 'error', error: error ?? 'Could not read the file' }

  const { hydra: instance, canvas: output } = ensureHydra()
  try {
    instance.synth.hush()
    instance.synth.time = 0
    await evalPatch(instance.synth, content)
  } catch (e) {
    if (mine === token) cancelAnimationFrame(rafId)
    return { status: 'error', error: e instanceof Error ? e.message : String(e) }
  }
  if (mine !== token) return { status: 'stale' }
  startLoop(instance)
  return { status: 'shown', canvas: output }
}

/** Stops rendering the hover preview. */
export function hideHoverPreview(): void {
  token++
  cancelAnimationFrame(rafId)
  hydra?.synth.hush()
}
