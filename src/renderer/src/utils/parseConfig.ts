import * as jsyaml from 'js-yaml'
import { ConfigFlags, ConfigurationJSON, ConfigurationKey } from 'src/types/config'
import { extractFlags } from './configFlags'

export function validateConfig(suspect: any) {
  const entries = Object.entries(suspect)

  for (let i = 0; i < entries.length; i++) {
    const invalidProps: string[] = []

    const [key, value] = entries[i] as [string, ConfigurationKey]

    if (key.includes(' ')) invalidProps.push('key')

    const { ableton, hydra, audio_reactivity, args } = value

    if (ableton === undefined && hydra === undefined) invalidProps.push('missing_surface')

    if (ableton !== undefined) {
      const { type, path, object, present, absent } = ableton

      switch (type) {
        case 'track':
        case 'clip':
        case 'device':
        case 'device_parameter':
          break
        default:
          invalidProps.push('ableton-type')
      }

      if (typeof path !== 'string') invalidProps.push('ableton-path')

      switch (object) {
        case 'active':
        case 'value':
          break
        default:
          invalidProps.push('ableton-object')
      }

      switch (typeof present) {
        case 'boolean':
        case 'number':
          break
        default:
          invalidProps.push('ableton-present')
      }

      switch (typeof absent) {
        case 'boolean':
        case 'number':
          break
        default:
          invalidProps.push('ableton-absent')
      }
    }

    if (hydra) {
      const { name, present, absent } = hydra

      if (typeof name !== 'string') invalidProps.push('hydra-name')

      switch (typeof present) {
        case 'boolean':
        case 'number':
        case 'string':
          break
        default:
          invalidProps.push('ableton-present')
      }

      switch (typeof absent) {
        case 'boolean':
        case 'number':
        case 'string':
          break
        default:
          invalidProps.push('ableton-absent')
      }
    }

    // Validate audio_reactivity if present
    if (audio_reactivity) {
      const { audioChannel, visualEffect, beatDetection } = audio_reactivity

      if (typeof audioChannel !== 'number' || audioChannel < 0 || audioChannel > 15) {
        invalidProps.push('audio_reactivity.audioChannel (must be 0-15)')
      }

      if (typeof visualEffect !== 'string' || visualEffect.length === 0) {
        invalidProps.push('audio_reactivity.visualEffect (must be non-empty string)')
      }

      if (beatDetection !== undefined && typeof beatDetection !== 'boolean') {
        invalidProps.push('audio_reactivity.beatDetection (must be boolean)')
      }
    }

    if (args !== undefined) {
      Object.entries(args).forEach(([arg, { ableton, presets }]) => {
        if (ableton !== undefined) {
          const { acts_on, type } = ableton

          if (acts_on !== 'path' && acts_on !== 'value')
            invalidProps.push(`args-${arg}-ableton-acts_on`)

          switch (typeof type) {
            case 'string':
            case 'number':
            case 'boolean':
              break
            default:
              invalidProps.push(`args-${arg}-ableton-type`)
          }
        }

        if (presets !== undefined) {
          Object.entries(presets).forEach(([preset, { ableton, hydra }]) => {
            if (ableton === undefined && hydra === undefined)
              invalidProps.push(`args-${arg}-presets-${preset}-missing_surface`)

            if (ableton !== undefined) {
              switch (typeof ableton) {
                case 'number':
                case 'boolean':
                  break
                default:
                  invalidProps.push(`args-${arg}-presets-${preset}-ableton`)
              }
            }

            if (hydra !== undefined) {
              switch (typeof hydra) {
                case 'string':
                case 'number':
                case 'boolean':
                  break
                default:
                  invalidProps.push(`args-${arg}-presets-${preset}-hydra`)
              }
            }
          })
        }
      })
    }

    if (invalidProps.length > 0)
      throw new Error(
        `${key} has invalid properties: ${invalidProps.reduce((a, b) => a + ', ' + b)}`
      )
  }
  console.log('Config is valid')
}

export default function parseConfig(config: string): {
  parsedConfig: ConfigurationJSON
  flags: ConfigFlags
  err?: Error
} {
  try {
    const flags = extractFlags(config)
    const parsedConfig = jsyaml.load(config)

    validateConfig(parsedConfig)

    return { parsedConfig: parsedConfig as ConfigurationJSON, flags }
  } catch (err) {
    console.error(err)
    return { parsedConfig: null, flags: {}, err: err as Error }
  }
}
