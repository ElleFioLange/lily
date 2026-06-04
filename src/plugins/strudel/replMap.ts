import { webaudioRepl, registerSynthSounds } from '@strudel/webaudio'
import { transpiler } from '@strudel/transpiler'
import { evalScope } from '@strudel/core'
import { getSharedAudioContext } from './audioContext'

type StrudelRepl = ReturnType<typeof webaudioRepl>

const repls = new Map<string, StrudelRepl>()
let prebakePromise: Promise<void> | null = null

export async function ensurePrebaked(): Promise<void> {
  if (!prebakePromise) {
    prebakePromise = (async () => {
      // Register built-in synth sounds (sine, square, sawtooth, triangle, etc.)
      // and load all strudel modules into globalThis so user code can call note(), sound(), etc.
      // Importing directly (not via defaultPrebake) avoids potential Vite module duplication.
      registerSynthSounds()
      await evalScope(
        import('@strudel/core'),
        import('@strudel/mini'),
        import('@strudel/tonal'),
        import('@strudel/webaudio')
      )
    })()
  }
  return prebakePromise
}

export function createRepl(instanceId: string): StrudelRepl {
  const audioContext = getSharedAudioContext() ?? undefined
  const r = webaudioRepl({ transpiler, audioContext })
  repls.set(instanceId, r)
  return r
}

export function getRepl(instanceId: string): StrudelRepl | undefined {
  return repls.get(instanceId)
}

export function removeRepl(instanceId: string): void {
  repls.delete(instanceId)
}
