import HydraSource from './hydra'
import type { SourceDefinition } from './types'
import { POIESIS_ENABLED } from './flags'

export { POIESIS_ENABLED }

export async function loadSources(): Promise<SourceDefinition[]> {
  const sources: SourceDefinition[] = [HydraSource as unknown as SourceDefinition]

  if (POIESIS_ENABLED) {
    const { default: PoiesisSource } = await import('./poiesis')
    sources.push(PoiesisSource as unknown as SourceDefinition)
  }

  return sources
}
