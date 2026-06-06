// import { useConfigStore } from '@renderer/stores/useConfigStore'
import { PluginDefinition } from '@plugins/utils'
import { ConfigurationJSON } from 'src/types/config'
import { OSCMessage } from 'src/types/osc-messages'

// TODO need to handle stuff like skeleton(() correctly
export const keyRegex = (key) => new RegExp(`\\b${key}\\(([^\\)]*)\\)`, 'g')

const process: PluginDefinition['process'] = (_instanceId, inputs) => {
  for (const { poiesis, config } of inputs) {
    console.log(config)
    if (config === null) throw new Error('Cannot parse input with invalid config')
    const keys = Object.entries(config)
    const messages: OSCMessage[] = []
    keys.forEach(([key, params]) => {
      // The actual regex has single backslashes after escaping is done
      const regex = keyRegex(key)
      const matches = poiesis.matchAll(regex)
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
        window.api.osc.send('/control', [type, value ? 'active' : 'inactive', path])
      } else {
        window.api.osc.send('/control', [type, object, rawPath, value])
      }
    })
    // return messages
  }
}

export default process

// export type ParseAbletonResult = ReturnType<typeof parseAbleton>
