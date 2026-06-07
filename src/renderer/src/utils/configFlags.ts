import { ConfigFlags } from 'src/types/config'

const FLAG_RE = /^#\s*@(\S+)\s*(.*?)\s*$/

/** Extract `# @flag-name payload` comment lines from raw YAML text. */
export function extractFlags(raw: string): ConfigFlags {
  const flags: ConfigFlags = {}
  for (const line of raw.split('\n')) {
    const m = line.match(FLAG_RE)
    if (m) flags[m[1]] = m[2]
  }
  return flags
}

/** Serialize a ConfigFlags record back to comment lines. */
export function serializeFlags(flags: ConfigFlags): string {
  return Object.entries(flags)
    .map(([k, v]) => `# @${k}${v ? ' ' + v : ''}`)
    .join('\n')
}

/** Prepend flag comments to a YAML dump string, preserving existing flags. */
export function prependFlags(yaml: string, flags: ConfigFlags): string {
  if (!Object.keys(flags).length) return yaml
  return serializeFlags(flags) + '\n' + yaml
}
