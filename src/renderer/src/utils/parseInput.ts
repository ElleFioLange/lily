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
    const { type, path, args, object, present, absent } = params
    const value = isPresent ? present : absent
    if (type === 'clip' || type === 'track') {
      let _path = path
      if (args) {
        Object.entries(args).forEach(([arg, { acts_on, presets, default_value }], index) => {
          if (acts_on === 'path') {
            let value
            if (presets !== undefined && isPresent) {
              const preset = instances[0][index + 1]
              value = preset ? presets[preset] : default_value
            } else {
              value = default_value
            }
            const indexOfArg = _path.indexOf('_' + arg)
            _path = _path.slice(0, indexOfArg) + value + _path.slice(indexOfArg + arg.length + 1)
          }
        })
      }
      console.log(_path)
      const message = {
        address: `/set/${type}/${value ? 'active' : 'inactive'}`,
        args: [_path]
      }
      messages.push(message)
    } else {
      const message = {
        address: `/set/${type}/${object}`,
        args: [path, value]
      }
      messages.push(message)
    }
  })

  return messages
}
