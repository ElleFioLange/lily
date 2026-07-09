import { PluginDefinition } from '@plugins/utils'
import { getControlClient } from './ws'

const keyRegex = (key: string) => new RegExp(`\\b${key}\\(([^\\)]*)\\)`, 'g')

/** Parse a literal keyword arg: number, boolean, else the raw string. */
function parseArg(raw: string): number | string | boolean {
  const n = Number(raw)
  if (!Number.isNaN(n) && raw.trim() !== '') return n
  if (raw === 'true') return true
  if (raw === 'false') return false
  return raw
}

// Last value sent per instance+variable. Every setVar edits Operator's buffer
// and re-runs the patch, so only send when the value actually changed.
const lastSent = new Map<string, string>()

const process: PluginDefinition['process'] = (instanceId, inputs) => {
  const client = getControlClient(instanceId)
  if (!client) return

  for (const { poiesis, config } of inputs) {
    if (config === null) throw new Error('Cannot parse input with invalid config')

    Object.entries(config).forEach(([key, params]) => {
      const { operator } = params
      if (!operator) return

      const instances = Array.from(poiesis.matchAll(keyRegex(key)))
      const isPresent = instances.length > 0

      let value: number | string | boolean = isPresent ? operator.present : operator.absent
      // A literal first arg overrides the configured `present` value,
      // e.g. `cutoff(880)` sends 880
      if (isPresent) {
        const firstArg = instances[0][1].split(',')[0]?.trim()
        if (firstArg) value = parseArg(firstArg)
      }

      const stateKey = `${instanceId}:${operator.name}`
      const encoded = JSON.stringify(value)
      if (lastSent.get(stateKey) === encoded) return

      if (client.setVar(operator.name, value)) {
        lastSent.set(stateKey, encoded)
      }
    })
  }
}

export default process
