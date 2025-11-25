import { ConfigurationJSON } from '@renderer/stores/useConfigurationStore'
import * as jsyaml from 'js-yaml'

export function validateConfig(suspect: any) {
  const values = Object.values(suspect)

  for (let i = 0; i < values.length; i++) {
    const { type, path, object, present, absent } = values[i] as any
    const invalidProps: string[] = []

    if (type !== 'track' && type !== 'clip' && type !== 'device' && type !== 'device_parameter')
      invalidProps.push('type')

    if (typeof path !== 'string') invalidProps.push('path')

    if (object !== 'active' && object !== 'value') invalidProps.push('object')

    if (typeof present !== 'boolean' && typeof present !== 'number') invalidProps.push('present')

    if (typeof absent !== 'boolean' && typeof absent !== 'number') invalidProps.push('absent')

    if (invalidProps.length > 0)
      throw new Error(`Invalid props: ${invalidProps.reduce((a, b) => a + ', ' + b)}`)
  }
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
