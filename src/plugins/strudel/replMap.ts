import { webaudioRepl, registerSynthSounds } from '@strudel/webaudio'
import { transpiler } from '@strudel/transpiler'
import { evalScope } from '@strudel/core'
import { getSharedAudioContext } from './audioContext'
import { sliderWithID } from './sliderValues'

type StrudelRepl = ReturnType<typeof webaudioRepl>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pattern = any

export type SliderWidget = {
  id: string
  from: number
  to: number
  value: string
  min: number
  max: number
  step?: number
  type: 'slider'
}

const repls = new Map<string, StrudelRepl>()
const patterns = new Map<string, Pattern>()
const widgetCallbacks = new Map<string, (widgets: SliderWidget[]) => void>()
let prebakePromise: Promise<void> | null = null

export async function ensurePrebaked(): Promise<void> {
  if (!prebakePromise) {
    prebakePromise = (async () => {
      registerSynthSounds()
      await evalScope(
        import('@strudel/core'),
        import('@strudel/mini'),
        import('@strudel/tonal'),
        import('@strudel/webaudio'),
        { sliderWithID }
      )
    })()
  }
  return prebakePromise
}

export function createRepl(
  instanceId: string,
  onWidgets?: (widgets: SliderWidget[]) => void
): StrudelRepl {
  if (onWidgets) widgetCallbacks.set(instanceId, onWidgets)

  const audioContext = getSharedAudioContext() ?? undefined
  const r = webaudioRepl({
    transpiler,
    audioContext,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUpdateState: (state: any) => {
      if (state.pattern && !state.pending && !state.evalError) {
        patterns.set(instanceId, state.pattern)
      }
      if (state.widgets && !state.pending && !state.evalError) {
        widgetCallbacks.get(instanceId)?.(state.widgets as SliderWidget[])
      }
    }
  })
  repls.set(instanceId, r)
  return r
}

export function getRepl(instanceId: string): StrudelRepl | undefined {
  return repls.get(instanceId)
}

export function getPattern(instanceId: string): Pattern | undefined {
  return patterns.get(instanceId)
}

export function removeRepl(instanceId: string): void {
  repls.delete(instanceId)
  patterns.delete(instanceId)
  widgetCallbacks.delete(instanceId)
}
