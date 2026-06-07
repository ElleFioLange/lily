import { PluginDefinition } from '@plugins/utils'

export const keyRegex = (key: string) => new RegExp(`\\b${key}\\(([^\\)]*)\\)`, 'g')

const process: PluginDefinition['process'] = (_instanceId, inputs) => {
  for (const { poiesis, config } of inputs) {
    if (config === null) throw new Error('Cannot parse input with invalid config')

    Object.entries(config).forEach(([key, params]) => {
      const regex = keyRegex(key)
      const instances = Array.from(poiesis.matchAll(regex))
      const isPresent = instances.length > 0

      const { ableton, args } = params
      if (!ableton) return

      const { type, path: rawPath, object, present, absent } = ableton

      if (type === 'clip' || type === 'track' || type === 'device') {
        // Resolve path substitutions from args
        let path = rawPath
        if (args) {
          Object.entries(args).forEach(
            ([arg, { ableton: argAbleton, default_value, presets }], index) => {
              if (!argAbleton || default_value.ableton === undefined) return
              if (argAbleton.acts_on !== 'path') return
              let argValue: number | boolean = default_value.ableton
              const match = instances[0][index + 1]
              if (match) {
                if (presets && isPresent) {
                  if (match && presets[match]?.ableton !== undefined)
                    argValue = presets[match].ableton!
                } else {
                  const matchParse = JSON.parse(match)
                  if (matchParse !== undefined && typeof matchParse === typeof argValue)
                    argValue = JSON.parse(match)
                }
              }
              path =
                path.slice(0, path.indexOf('_' + arg)) +
                argValue +
                path.slice(path.indexOf('_' + arg) + arg.length + 1)
            }
          )
        }
        const action = isPresent ? 'active' : 'inactive'
        window.api.osc.send('/control', [type, action, path])
      } else if (type === 'device_parameter') {
        // Resolve value — args with acts_on: 'value' can override present/absent
        let value: number | boolean = isPresent ? present : absent
        if (args && isPresent) {
          Object.entries(args).forEach(
            ([_arg, { ableton: argAbleton, default_value, presets }], index) => {
              if (!argAbleton || default_value.ableton === undefined) return
              if (argAbleton.acts_on !== 'value') return
              let argValue: number | boolean = default_value.ableton
              if (presets) {
                const match = instances[0][index + 1]
                if (match && presets[match]?.ableton !== undefined)
                  argValue = presets[match].ableton!
              }
              value = argValue
            }
          )
        }
        window.api.osc.send('/control', [type, object, rawPath, value])
      }
    })
  }
}

export default process
