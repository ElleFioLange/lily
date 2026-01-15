import { ConfigurationJSON } from 'src/types/config'
import { useHydraStore } from './store'
import loadScript from '@renderer/utils/loadScript'
import { useConfigurationStore } from '@renderer/config/store'
import { keyRegex } from '@renderer/utils/parseInput'

function parseHydra(input: string) {
  const { parsedConfig: config } = useConfigurationStore.getState()

  if (config === null) throw new Error('Cannot parse input with invalid config')

  const keys = Object.entries(config)
  const hydraParams: { name: string; value: number | string | boolean }[] = []

  keys.forEach(([key, params]) => {
    const regex = keyRegex(key)
    const matches = input.matchAll(regex)
    const instances = Array.from(matches)
    const isPresent = instances.length > 0
    const { hydra, args } = params

    if (!hydra) return

    const { name, present, absent } = hydra
    let value = isPresent ? present : absent

    if (args) {
      Object.entries(args).forEach(([arg, { presets }], index) => {
        if (arg !== name) return
        if (presets !== undefined && isPresent) {
          // TODO make this more readable
          const preset = instances[0][index + 1]
          if (preset) {
            const presetValue = presets[preset].hydra
            if (presetValue) value = presetValue
          }
        }
      })
    }

    console.log({ name, value })
    hydraParams.push({ name, value })
  })

  return hydraParams
}

export default async function process(_poiesis: string, _config: ConfigurationJSON) {
  const store = useHydraStore.getState()

  const shader = store.shader
  const hydra = store.hydra
  const synth = hydra.synth

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

  // Create function with all Hydra methods in scope
  const evalFunc = new AsyncFunction(...Object.keys(synth), 'synth', 'loadScript', shader)
  evalFunc(...Object.values(synth), synth, loadScript)
  console.log('Shader evaluated successfully')
}
