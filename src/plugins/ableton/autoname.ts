import type { ConfigurationJSON } from 'src/types/config'

/**
 * Derive rename targets from the Poiesis config so Live's names mirror the
 * keyword grammar (`bass(verse)` ↔ track "bass", clip "verse"):
 *   - a keyword WITH ableton presets names its TRACK after the keyword and
 *     each preset's resolved clip after the PRESET
 *   - a keyword with no presets targets one specific clip — only that clip is
 *     named after the keyword; its track is left alone
 *
 * Path args (acts_on: 'path', e.g. `… clip_slots _clip_index clip`) resolve
 * at their ableton defaults / per-preset values. A path is skipped (no-op)
 * when a needed ableton value is undefined — e.g. an arg with no ableton
 * default and no ableton presets. Empty slots are the extension's no-op,
 * reported back per item.
 */

export interface AutonameItem {
  path: string
  name: string
}

export interface AutonameDerivation {
  items: AutonameItem[]
  /** connections that couldn't resolve to a concrete path */
  skipped: number
}

type ArgValue = number | boolean | string | undefined

export function deriveAutonameItems(config: ConfigurationJSON): AutonameDerivation {
  const items: AutonameItem[] = []
  let skipped = 0
  if (!config) return { items, skipped }

  for (const [keyword, entry] of Object.entries(config)) {
    const ableton = entry.ableton
    if (!ableton || ableton.type !== 'clip') continue

    const pathArgs = Object.entries(entry.args ?? {}).filter(
      ([, a]) => a.ableton?.acts_on === 'path'
    )

    // Substitute every path arg (same `_arg` convention as process.ts);
    // null when any needed value is undefined.
    const resolve = (values: Record<string, ArgValue>): string | null => {
      let path = ableton.path
      for (const [arg] of pathArgs) {
        const value = values[arg]
        if (value === undefined) return null
        path = path.replace('_' + arg, String(value))
      }
      return path
    }

    const defaults: Record<string, ArgValue> = {}
    for (const [arg, a] of pathArgs) defaults[arg] = a.default_value?.ableton

    const presetItems: AutonameItem[] = []
    for (const [arg, a] of pathArgs) {
      for (const [presetName, preset] of Object.entries(a.presets ?? {})) {
        if (preset.ableton === undefined) {
          skipped++
          continue
        }
        const presetPath = resolve({ ...defaults, [arg]: preset.ableton })
        if (presetPath) presetItems.push({ path: presetPath, name: presetName })
        else skipped++
      }
    }

    if (presetItems.length > 0) {
      // Preset grammar: track carries the keyword, clips carry preset names.
      const trackMatch = ableton.path.match(/^live_set tracks (\d+)/)
      if (trackMatch) items.push({ path: `live_set tracks ${trackMatch[1]}`, name: keyword })
      items.push(...presetItems)
    } else {
      // A specific clip: name it after the keyword, leave the track alone.
      const basePath = resolve(defaults)
      if (basePath) items.push({ path: basePath, name: keyword })
      else skipped++
    }
  }

  // Two keywords pointing at the same clip: first one wins, rest are skips.
  const seen = new Set<string>()
  const deduped = items.filter((i) => (seen.has(i.path) ? false : (seen.add(i.path), true)))
  return { items: deduped, skipped: skipped + (items.length - deduped.length) }
}
