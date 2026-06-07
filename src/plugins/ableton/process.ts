import { PluginDefinition } from '@plugins/utils'
import { ConfigFlags } from 'src/types/config'

export const keyRegex = (key: string) => new RegExp(`\\b${key}\\(([^\\)]*)\\)`, 'g')

const MODIFIER_CHARS: Record<string, { open: string; close: string; sendOffset: number }> = {
  '!': { open: '!', close: '!', sendOffset: 0 }, // distortion
  '[': { open: '[', close: ']', sendOffset: 1 }, // reverb
  '{': { open: '{', close: '}', sendOffset: 2 } // delay
}

/** Check for punctuation wrappers around a keyword match and send mixer sends. */
function processPunctuationModifiers(
  poiesis: string,
  match: RegExpMatchArray,
  trackPath: string,
  flags: ConfigFlags
) {
  const modFlag = flags['ableton-punctuation-modifiers']
  if (!modFlag) return

  const returnIndices = modFlag.split(',').map(Number)
  if (returnIndices.length < 3) return

  // Extract track index from the path
  const trackMatch = trackPath.match(/tracks (\d+)/)
  if (!trackMatch) return
  const trackIndex = trackMatch[1]

  const start = match.index!
  const end = start + match[0].length

  // Scan backwards/forwards through consecutive modifier chars to detect all active wrappers
  // e.g. {!keyword()!} activates both ! and {} modifiers simultaneously
  const modifierOpenChars = new Set(Object.values(MODIFIER_CHARS).map((m) => m.open))
  const modifierCloseChars = new Set(Object.values(MODIFIER_CHARS).map((m) => m.close))

  const opensBefore = new Set<string>()
  for (let i = start - 1; i >= 0; i--) {
    if (modifierOpenChars.has(poiesis[i])) opensBefore.add(poiesis[i])
    else break
  }

  const closesAfter = new Set<string>()
  for (let i = end; i < poiesis.length; i++) {
    if (modifierCloseChars.has(poiesis[i])) closesAfter.add(poiesis[i])
    else break
  }

  for (const [, { open, close, sendOffset }] of Object.entries(MODIFIER_CHARS)) {
    const sendValue = opensBefore.has(open) && closesAfter.has(close) ? 1 : 0
    const sendIndex = returnIndices[sendOffset]
    const sendPath = `live_set tracks ${trackIndex} mixer_device sends ${sendIndex}`
    window.api.osc.send('/control', ['send', sendPath, sendValue])
  }
}

const process: PluginDefinition['process'] = (_instanceId, inputs) => {
  for (const { poiesis, config, flags } of inputs) {
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

        // Punctuation modifiers — send to return tracks based on wrappers
        if (isPresent && flags) {
          for (const m of instances) {
            processPunctuationModifiers(poiesis, m, rawPath, flags)
          }
        }
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
