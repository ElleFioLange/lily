import Hydra from 'hydra-synth'
import { HydraState } from './store'
import { evalPatch } from './process'
import { isContextLost, releaseContext } from '@renderer/utils/webgl'

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
 * A small hidden Hydra instance for the file browser's hover previews, created when the browser
 * first opens and kept (like the other instances) so its audio input isn't set up again each
 * time. It's never added to the compositor and only renders while a preview is showing. If its
 * WebGL context was lost (see utils/webgl), it's made again on the next hover.
 *
 * A patch can also fail while drawing, for example by giving a uniform `undefined`. Hydra catches
 * that inside tick() and carries on, but regl is left with a framebuffer bound, so every later
 * frame, whatever patch, comes out black. So each frame is checked: when a draw fails, the preview
 * stops, the error goes to the card, and the instance is thrown away and made fresh next hover.
 */
/** Sets up the instance ahead of the first hover (the file browser calls this when it opens). */
export function prepareHoverPreview(): void {
  ensureHydra()
}

function ensureHydra(): { hydra: HydraInstance; canvas: HTMLCanvasElement } {
  if (hydra && canvas && !isContextLost(canvas)) return { hydra, canvas }
  discardHydra()
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

/** Drops the instance (after a failed draw, or a lost context) so the next hover makes a new one. */
function discardHydra(): void {
  cancelAnimationFrame(rafId)
  if (hydra) {
    hydra.synth.fps = Number.MIN_VALUE
    ;(hydra as unknown as { detectAudio: boolean }).detectAudio = false
  }
  releaseContext(canvas)
  hydra = null
  canvas = null
}

/**
 * Draws one frame. Returns the error message if drawing failed: Hydra reports that with
 * console.warn and leaves a framebuffer bound, so both are checked.
 */
function tickChecked(
  instance: HydraInstance,
  output: HTMLCanvasElement,
  dt: number
): string | null {
  let failure: string | null = null
  const warn = console.warn
  console.warn = (...args: unknown[]) => {
    if (args[0] === 'Error during tick():') {
      const error = args[1]
      // regl's message ends with the bundle's file path, which means nothing on the card
      failure = (error instanceof Error ? error.message : String(error))
        .replace(/^\(regl\)\s*/, '')
        .replace(/\s+in command\b[\s\S]*$/, '')
        .replace(/\s+/g, ' ')
    }
    warn.apply(console, args)
  }
  try {
    instance.tick(dt)
  } finally {
    console.warn = warn
  }
  if (failure !== null) return failure
  const gl = output.getContext('webgl')
  if (gl && !gl.isContextLost() && gl.getParameter(gl.FRAMEBUFFER_BINDING) !== null)
    return 'The patch stopped drawing'
  return null
}

function startLoop(
  instance: HydraInstance,
  output: HTMLCanvasElement,
  mine: number,
  onError: (error: string) => void
) {
  cancelAnimationFrame(rafId)
  last = performance.now()
  const loop = (now: number) => {
    const error = tickChecked(instance, output, now - last)
    last = now
    if (error !== null) {
      discardHydra()
      if (mine === token) onError(error)
      return
    }
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)
}

export type HoverPreviewResult =
  | { status: 'shown'; canvas: HTMLCanvasElement }
  | { status: 'error'; error: string }
  | { status: 'stale' }

/**
 * Reads a patch file and runs it, from scratch, in the hover preview instance. The first frame is
 * drawn before this returns, so a patch that fails to draw comes back as an error; `onError` is
 * called if a later frame fails.
 */
export async function showHoverPreview(
  path: string,
  onError: (error: string) => void
): Promise<HoverPreviewResult> {
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
  const drawError = tickChecked(instance, output, 0)
  if (drawError !== null) {
    discardHydra()
    return { status: 'error', error: drawError }
  }
  startLoop(instance, output, mine, onError)
  return { status: 'shown', canvas: output }
}

/** Stops rendering the hover preview. */
export function hideHoverPreview(): void {
  token++
  cancelAnimationFrame(rafId)
  hydra?.synth.hush()
}
