import { ConfigurationJSON } from '@renderer/stores/useConfigurationStore'

export default function parseInput(input: string, config: ConfigurationJSON) {
  if (config === null) throw new Error('Cannot parse input with invalid config')

  const keys = Object.keys(config)

  const presentKeysRecord: {
    [key: string]: number[]
  } = {}

  keys.forEach((key) => {
    const instances: number[] = []

    let startIndex = 0
    let allFound = false

    while (allFound === false) {
      const instance = input.indexOf(key, startIndex)
      if (instance !== -1) {
        instances.push(instance)
        startIndex += key.length
      } else {
        allFound = true
      }
    }

    if (instances.length > 0) presentKeysRecord[key] = instances
  })

  const presentKeys = Object.keys(presentKeysRecord)
}
