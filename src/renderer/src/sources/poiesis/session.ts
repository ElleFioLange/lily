import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { ActiveSource } from '@renderer/sources/types'
import { baseName, isRecord, str } from '@renderer/sources/session'
import { PoiesisState } from './store'

const getStore = (instanceId: string) =>
  (useSourcesStore.getState().getInstance(instanceId) as ActiveSource<PoiesisState> | undefined)
    ?.useStore

/** The Poiesis layer in a .lly file: its text, its keyword config and where that config lives. */
export function serialize(instanceId: string) {
  const state = getStore(instanceId)?.getState()
  if (!state) return undefined
  const { poiesis, config, configPath } = state
  return { poiesis, config, configPath }
}

export function restore(instanceId: string, data: unknown): void {
  const useStore = getStore(instanceId)
  if (!useStore || !isRecord(data)) return
  const { setPoiesis, setConfig, setConfigPath, setConfigName } = useStore.getState()
  const poiesis = str(data.poiesis)
  if (poiesis !== undefined) setPoiesis(poiesis)
  const config = str(data.config)
  if (config !== undefined) setConfig(config)
  const configPath = str(data.configPath) ?? null
  setConfigPath(configPath)
  setConfigName(configPath ? baseName(configPath) : 'new-config')
}
