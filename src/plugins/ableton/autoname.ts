import type { ConfigurationJSON } from 'src/types/config'

/**
 * Derive clip-rename targets from the Poiesis config: every keyword whose
 * ableton connection targets a clip names that clip after itself.
 *
 * Path args (acts_on: 'path', e.g. `… clip_slots _clip_index clip`) resolve:
 *   - all-defaults  → named `keyword`
 *   - each preset   → named `keyword (preset)` (other args at their defaults)
 *
 * A path is skipped (no-op) when a needed ableton value is undefined — e.g.
 * an arg with no ableton default and no ableton presets. Empty slots are the
 * extension's no-op, reported back per item.
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

    const basePath = resolve(defaults)
    if (basePath) items.push({ path: basePath, name: keyword })
    else skipped++

    for (const [arg, a] of pathArgs) {
      for (const [presetName, preset] of Object.entries(a.presets ?? {})) {
        if (preset.ableton === undefined) {
          skipped++
          continue
        }
        const presetPath = resolve({ ...defaults, [arg]: preset.ableton })
        if (presetPath) items.push({ path: presetPath, name: `${keyword} (${presetName})` })
        else skipped++
      }
    }
  }

  // Two keywords pointing at the same clip: first one wins, rest are skips.
  const seen = new Set<string>()
  const deduped = items.filter((i) => (seen.has(i.path) ? false : (seen.add(i.path), true)))
  return { items: deduped, skipped: skipped + (items.length - deduped.length) }
}
