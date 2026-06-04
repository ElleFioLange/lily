import { webaudioRepl } from '@strudel/webaudio'
import { transpiler } from '@strudel/transpiler'
import { defaultPrebake } from '@strudel/web'
import { getSharedAudioContext } from './audioContext'

type StrudelRepl = ReturnType<typeof webaudioRepl>

const repls = new Map<string, StrudelRepl>()
let prebakePromise: Promise<void | null> | null = null

export async function ensurePrebaked(): Promise<void | null> {
  if (!prebakePromise) {
    prebakePromise = defaultPrebake()
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
