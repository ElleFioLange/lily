import Hydra from 'hydra-synth'
import { create } from 'zustand'
import loadScript from '@renderer/utils/loadScript'
import { isContextLost } from '@renderer/utils/webgl'
import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { ActiveSource } from '@renderer/sources/types'
import { HydraState } from './store'
import { evalPatch } from './process'
import { syntaxError } from './format'

type HydraInstance = HydraState['hydra']

/**
 * Checks, as you type, whether a Hydra patch would run: the code is parsed, then evaluated in a
 * tiny hidden Hydra instance that never draws. Results land on the layer's store (isValid,
 * error) for the editor's indicator. The check instance doesn't open cameras, screens, images
 * or videos, and each script it loads is only loaded once, so typing doesn't repeat them.
 */

const DEBOUNCE_MS = 250

let hydra: HydraInstance | null = null
let canvas: HTMLCanvasElement | null = null
const loaded = new Set<string>()
const timers = new Map<string, number>()
const tokens = new Map<string, number>()

/** The editor's indicator stands out for a while after you evaluate code that won't run. */
export const useValidationFlash = create<{ instanceId: string | null; at: number }>(() => ({
  instanceId: null,
  at: 0
}))

function checker(): HydraInstance {
  if (hydra && !isContextLost(canvas)) return hydra
  canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 36
  canvas.getContext('webgl', { preserveDrawingBuffer: false })
  // Required for hydra's audio detection, so patches using `a` check like they run
  document.createElement('div').appendChild(canvas)
  hydra = new Hydra({
    detectAudio: true,
    canvas,
    makeGlobal: false,
    precision: 'lowp',
    autoLoop: false
  })
  // No cameras, screens or media from the checker
  const noop = () => {}
  for (const source of (hydra as unknown as { s: Record<string, unknown>[] }).s) {
    for (const init of ['initCam', 'initImage', 'initVideo', 'initScreen', 'initStream']) {
      source[init] = noop
    }
  }
  return hydra
}

const loadOnce = (url: string): Promise<unknown> => {
  if (loaded.has(url)) return Promise.resolve()
  loaded.add(url)
  return loadScript(url).catch((error) => {
    loaded.delete(url)
    throw new Error(`Couldn't load ${url}`, { cause: error })
  })
}

function layer(instanceId: string): ActiveSource<HydraState> | undefined {
  const source = useSourcesStore.getState().active[instanceId]
  return source?.manifest.id === 'hydra' ? (source as ActiveSource<HydraState>) : undefined
}

/** Returns the reason the code won't run, or null if it runs. */
export async function checkPatch(code: string): Promise<string | null> {
  if (!code.trim()) return null
  const syntax = await syntaxError(code)
  if (syntax) return syntax
  const instance = checker()
  try {
    instance.synth.hush()
    await evalPatch(instance.synth, code, loadOnce)
    return null
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

/** Checks a layer's code now and records the result on the layer. */
export async function validateLayer(instanceId: string): Promise<boolean> {
  window.clearTimeout(timers.get(instanceId))
  const source = layer(instanceId)
  if (!source) return true
  const token = (tokens.get(instanceId) ?? 0) + 1
  tokens.set(instanceId, token)
  const code = source.useStore.getState().shader
  const error = await checkPatch(code)
  // A newer check for this layer has started, or the code changed meanwhile
  if (tokens.get(instanceId) !== token || source.useStore.getState().shader !== code) {
    return error === null
  }
  const { setIsValid, setError } = source.useStore.getState()
  setIsValid(error === null)
  setError(error)
  return error === null
}

/** Checks a layer's code once typing pauses. */
export function scheduleValidation(instanceId: string): void {
  window.clearTimeout(timers.get(instanceId))
  timers.set(
    instanceId,
    window.setTimeout(() => void validateLayer(instanceId), DEBOUNCE_MS)
  )
}

/**
 * Before a preview or run: check the layer's code and, if it won't run, make the indicator
 * stand out. The evaluation still goes ahead, as before.
 */
export async function flagIfInvalid(instanceId: string): Promise<void> {
  if (!layer(instanceId)) return
  if (!(await validateLayer(instanceId)))
    useValidationFlash.setState({ instanceId, at: Date.now() })
}
