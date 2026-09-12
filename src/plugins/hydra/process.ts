import { ConfigurationJSON } from 'src/types/config'
import loadScript from '@renderer/utils/loadScript'
// import { keyRegex } from '@renderer/utils/parseInput'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { HydraState } from './store'
import { ActivePlugin } from '@plugins/utils'

// function parseHydra(input: string) {
//   const { parsedConfig: config } = useConfigStore.getState()

//   if (config === null) throw new Error('Cannot parse input with invalid config')

//   const keys = Object.entries(config)
//   const hydraParams: { name: string; value: number | string | boolean }[] = []

//   keys.forEach(([key, params]) => {
//     const regex = keyRegex(key)
//     const matches = input.matchAll(regex)
//     const instances = Array.from(matches)
//     const isPresent = instances.length > 0
//     const { hydra, args } = params

//     if (!hydra) return

//     const { name, present, absent } = hydra
//     let value = isPresent ? present : absent

//     if (args) {
//       Object.entries(args).forEach(([arg, { presets }], index) => {
//         if (arg !== name) return
//         if (presets !== undefined && isPresent) {
//           // TODO make this more readable
//           const preset = instances[0][index + 1]
//           if (preset) {
//             const presetValue = presets[preset].hydra
//             if (presetValue) value = presetValue
//           }
//         }
//       })
//     }

//     console.log({ name, value })
//     hydraParams.push({ name, value })
//   })

//   return hydraParams
// }

// TODO Add poiesis interpretation for hydra

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

export default async function process(
  instanceId: string,
  _inputs: { poiesis: string; config: ConfigurationJSON }[]
) {
  const { getInstance } = usePluginsStore.getState()
  const instance = getInstance(instanceId) as ActivePlugin<HydraState>
  const { shader, hydra, monitorActive, monitorHydra, speed } = instance.useStore.getState()

  await evalPatch(hydra.synth, shader)
  // The speed control wins over any `speed = ...` in the patch
  hydra.synth.speed = speed
  console.log('Shader evaluated successfully')

  // Keep the monitor's 4-up view in sync with the live patch.
  if (monitorActive && monitorHydra) {
    await evalPatch(monitorHydra.synth, `${shader}\nrender()`)
  }

  document.dispatchEvent(new CustomEvent('hydra-process'))
}
