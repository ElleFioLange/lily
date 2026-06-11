import { PluginDefinition } from '@plugins/utils'
import { ConfigFlags } from 'src/types/config'

export const keyRegex = (key: string) => new RegExp(`\\b${key}\\(([^\\)]*)\\)`, 'g')

const MODIFIER_CHARS: Record<string, { open: string; close: string; sendOffset: number }> = {
  '!': { open: '!', close: '!', sendOffset: 0 }, // distortion
  '[': { open: '[', close: ']', sendOffset: 1 }, // reverb
  '{': { open: '{', close: '}', sendOffset: 2 } // delay
}

/**
 * Send mixer send values for punctuation wrappers around keyword matches.
 * Wrapper state is aggregated across all matches, so a wrapped occurrence wins
 * over an unwrapped one. Called with no matches (keyword absent), all sends
 * reset to 0.
 */
function processPunctuationModifiers(
  poiesis: string,
  matches: RegExpMatchArray[],
  trackPath: string,
  flags: ConfigFlags
) {
  const modFlag = flags['ableton-punctuation-modifiers']
  if (!modFlag) return

  const returnIndices = modFlag.split(',').map(Number)
  if (returnIndices.length < 3) return

  // Extract track index from the path (avoid matching return_tracks)
  const trackMatch = trackPath.match(/(?:^|\s)tracks (\d+)/)
  if (!trackMatch) return
  const trackIndex = trackMatch[1]

  const modifierOpenChars = new Set(Object.values(MODIFIER_CHARS).map((m) => m.open))
  const modifierCloseChars = new Set(Object.values(MODIFIER_CHARS).map((m) => m.close))

  // Scan backwards/forwards through consecutive modifier chars to detect all active wrappers
  // e.g. {!keyword()!} activates both ! and {} modifiers simultaneously
  const active = new Set<string>()
  for (const match of matches) {
    const start = match.index!
    const end = start + match[0].length

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

    for (const [char, { open, close }] of Object.entries(MODIFIER_CHARS)) {
      if (opensBefore.has(open) && closesAfter.has(close)) active.add(char)
    }
  }

  for (const [char, { sendOffset }] of Object.entries(MODIFIER_CHARS)) {
    const sendValue = active.has(char) ? 1 : 0
    const sendIndex = returnIndices[sendOffset]
    const sendPath = `live_set tracks ${trackIndex} mixer_device sends ${sendIndex}`
    window.api.osc.send('/control', ['send', sendPath, sendValue])
  }
}

/** Parse a literal arg to match the default value's type; undefined if it doesn't parse. */
function parseArgValue(raw: string, expected: 'number' | 'boolean'): number | boolean | undefined {
  if (expected === 'number') {
    const n = Number(raw)
    return Number.isNaN(n) ? undefined : n
  }
  if (raw === 'true') return true
  if (raw === 'false') return false
  return undefined
}

const process: PluginDefinition['process'] = (_instanceId, inputs) => {
  for (const { poiesis, config, flags } of inputs) {
    if (config === null) throw new Error('Cannot parse input with invalid config')

    Object.entries(config).forEach(([key, params]) => {
      const regex = keyRegex(key)
      const instances = Array.from(poiesis.matchAll(regex))
      const isPresent = instances.length > 0
      // The regex captures everything between the parens as one group — split
      // it into per-arg strings matching the config's args order
      const argStrings = isPresent
        ? instances[0][1]
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : []

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
              // Match the placeholder as a whole token so e.g. _slot doesn't hit clip_slots
              const placeholder = new RegExp(`(^|\\s)_${arg}(?=\\s|$)`)
              if (!placeholder.test(path)) return

              let argValue: number | boolean = default_value.ableton
              const raw = argStrings[index]
              if (raw) {
                if (presets?.[raw]?.ableton !== undefined) {
                  argValue = presets[raw].ableton!
                } else {
                  const parsed = parseArgValue(raw, typeof argValue as 'number' | 'boolean')
                  if (parsed !== undefined) argValue = parsed
                }
              }
              path = path.replace(placeholder, `$1${argValue}`)
            }
          )
        }
        const action = isPresent ? 'active' : 'inactive'
        window.api.osc.send('/control', [type, action, path])

        // Punctuation modifiers — send to return tracks based on wrappers,
        // resetting to 0 when the keyword is absent
        if (flags) {
          processPunctuationModifiers(poiesis, instances, path, flags)
        }
      } else if (type === 'device_parameter') {
        // Resolve value — args with acts_on: 'value' can override present/absent
        let value: number | boolean = isPresent ? present : absent
        if (args && isPresent) {
          Object.entries(args).forEach(
            ([, { ableton: argAbleton, default_value, presets }], index) => {
              if (!argAbleton || default_value.ableton === undefined) return
              if (argAbleton.acts_on !== 'value') return
              let argValue: number | boolean = default_value.ableton
              const raw = argStrings[index]
              if (raw && presets?.[raw]?.ableton !== undefined) argValue = presets[raw].ableton!
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
