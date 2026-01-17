import { useConfigurationStore } from '@renderer/stores/useConfigStore'
import { OSCMessage } from 'src/types/osc-messages'

// TODO need to handle stuff like skeleton(() correctly
export const keyRegex = (key) => new RegExp(`\\b${key}\\(([^\\)]*)\\)`, 'g')

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

export type ParseHydraResult = ReturnType<typeof parseHydra>

function parseAbleton(input: string) {
  const { parsedConfig: config } = useConfigurationStore.getState()

  if (config === null) throw new Error('Cannot parse input with invalid config')

  const keys = Object.entries(config)
  const messages: OSCMessage[] = []

  keys.forEach(([key, params]) => {
    // The actual regex has single backslashes after escaping is done
    const regex = keyRegex(key)
    const matches = input.matchAll(regex)
    const instances = Array.from(matches)
    const isPresent = instances.length > 0
    const { ableton, args } = params

    if (!ableton) return

    const { type, path: rawPath, object, present, absent } = ableton
    let value = isPresent ? present : absent

    if (type === 'clip' || type === 'track') {
      let path = rawPath
      if (args) {
        Object.entries(args).forEach(([arg, { ableton, default_value, presets }], index) => {
          if (ableton === undefined || default_value.ableton === undefined) return

          let value = default_value.ableton
          const { acts_on } = ableton
          if (acts_on === 'path') {
            if (presets !== undefined && isPresent) {
              const preset = instances[0][index + 1]
              if (preset) {
                const argPreset = presets[preset]
                if (argPreset.ableton) value = argPreset.ableton
              }
            }
            const indexOfArg = path.indexOf('_' + arg)
            console.log(key, value)
            path = path.slice(0, indexOfArg) + value + path.slice(indexOfArg + arg.length + 1)
          }
        })
      }
      const message = {
        address: `/set/${type}/${value ? 'active' : 'inactive'}`,
        args: [path]
      }
      messages.push(message)
    } else {
      const message = {
        address: `/set/${type}/${object}`,
        args: [rawPath, value]
      }
      messages.push(message)
    }
  })

  return messages
}

export type ParseAbletonResult = ReturnType<typeof parseAbleton>

export default function parseInput(input: string, surface: 'ableton' | 'hydra') {
  let result: ParseAbletonResult | ParseHydraResult
  switch (surface) {
    case 'ableton': {
      result = parseAbleton(input)
      break
    }
    case 'hydra': {
      result = parseHydra(input)
      break
    }
  }

  return result
}
