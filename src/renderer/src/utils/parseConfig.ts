import { ConfigurationJSON, ConfigurationKey } from '@renderer/stores/useConfigurationStore'
import * as jsyaml from 'js-yaml'

export function validateConfig(suspect: any) {
  const entries = Object.entries(suspect)

  for (let i = 0; i < entries.length; i++) {
    const invalidProps: string[] = []

    const [key, value] = entries[i] as [string, ConfigurationKey]

    if (key.includes(' ')) invalidProps.push('key')

    const { type, path, object, present, absent, audio_reactivity } = value

    if (type !== 'track' && type !== 'clip' && type !== 'device' && type !== 'device_parameter')
      invalidProps.push('type')

    if (typeof path !== 'string') invalidProps.push('path')

    if (object !== 'active' && object !== 'value') invalidProps.push('object')

    if (typeof present !== 'boolean' && typeof present !== 'number') invalidProps.push('present')

    if (typeof absent !== 'boolean' && typeof absent !== 'number') invalidProps.push('absent')

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

    if (invalidProps.length > 0)
      throw new Error(
        `${key} has invalid properties: ${invalidProps.reduce((a, b) => a + ', ' + b)}`
      )
  }
  console.log('Config is valid')
}

export default function parseConfig(rawConfig: string): {
  parsedConfig: ConfigurationJSON
  err?: Error
} {
  try {
    const parsedConfig = jsyaml.load(rawConfig)

    validateConfig(parsedConfig)

    return { parsedConfig: parsedConfig as ConfigurationJSON }
  } catch (err) {
    console.error(err)
    return { parsedConfig: null, err: err as Error }
  }
}
