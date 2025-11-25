import { useConfigurationStore } from '@renderer/stores/useConfigurationStore'
import { OSCMessage } from 'src/types/osc-messages'

export default function parseInput(input: string) {
  const { parsedConfig: config } = useConfigurationStore.getState()

  if (config === null) throw new Error('Cannot parse input with invalid config')

  const keys = Object.entries(config)
  const messages: OSCMessage[] = []

  keys.forEach(([key, params]) => {
    // The actual regex has single backslashes after escaping is done
    const regex = new RegExp(`\\b${key}\\(([^\\)]*)\\)`, 'g')
    const matches = input.matchAll(regex)
    const instances = Array.from(matches)
    const isPresent = instances.length > 0
    const { type, path, object, present, absent } = params
    const value = isPresent ? present : absent
    const message = {
      address: `/set/${type}/${object}`,
      args: [path, value]
    }

    messages.push(message)
  })

  return messages
}
