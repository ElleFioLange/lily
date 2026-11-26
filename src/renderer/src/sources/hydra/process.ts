import loadScript from '@renderer/utils/loadScript'
import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { HydraState } from './store'
import { ActiveSource } from '@renderer/sources/types'

/**
 * Evaluate a hydra patch into a given synth.
 *
 * The shader runs inside a `with (synth)` block so that live synth properties
 * (time, bpm, mouse, ...) resolve against the synth object on each access rather
 * than being captured as fixed values at eval time. This is what keeps `() => time`
 * style callbacks animating, and what lets a monitor synth read a time value we
 * overwrite every frame to stay in sync with the main signal.
 */
export async function evalPatch(
  synth: HydraState['hydra']['synth'],
  shader: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
  const evalFunc = new AsyncFunction('synth', 'loadScript', `with (synth) {\n${shader}\n}`)
  await evalFunc(synth, loadScript)
}

export default async function process(instanceId: string) {
  const { getInstance } = useSourcesStore.getState()
  const instance = getInstance(instanceId) as ActiveSource<HydraState>
  const { shader, hydra, monitorHydra, speed } = instance.useStore.getState()

  await evalPatch(hydra.synth, shader)
  // The speed control wins over any `speed = ...` in the patch
  hydra.synth.speed = speed
  console.log('Shader evaluated successfully')

  // Keep the monitor's 4-up view in sync with the live patch.
  if (monitorHydra) {
    await evalPatch(monitorHydra.synth, `${shader}\nrender()`)
  }

  document.dispatchEvent(new CustomEvent('hydra-process'))
}
