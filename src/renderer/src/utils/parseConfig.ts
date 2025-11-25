import { ConfigurationJSON, ConfigurationKey } from '@renderer/stores/useConfigurationStore'
import * as jsyaml from 'js-yaml'

export function validateConfig(suspect: any) {
  const entries = Object.entries(suspect)

  for (let i = 0; i < entries.length; i++) {
    const invalidProps: string[] = []

    const [key, value] = entries[i] as [string, ConfigurationKey]

    if (key.includes(' ')) invalidProps.push('key')

    const { type, path, object, present, absent } = value

    if (type !== 'track' && type !== 'clip' && type !== 'device' && type !== 'device_parameter')
      invalidProps.push('type')

    if (typeof path !== 'string') invalidProps.push('path')

    if (object !== 'active' && object !== 'value') invalidProps.push('object')

    if (typeof present !== 'boolean' && typeof present !== 'number') invalidProps.push('present')

    if (typeof absent !== 'boolean' && typeof absent !== 'number') invalidProps.push('absent')

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
