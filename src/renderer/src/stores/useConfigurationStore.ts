import { create } from 'zustand'
import * as jsyaml from 'js-yaml'
import parseConfig from '@renderer/utils/parseConfig'

// Default configuration template
const DEFAULT_CONFIG = `whir_and_hum:
  type: clip
  path: live_set tracks 0 clip_slots 0 clip
  object: active
  present: true
  absent: false

base:
  type: device_parameter
  path: live_set tracks 0 devices 0 parameters 1
  object: value
  present: -12
  absent: 0

kick:
  type: clip
  path: live_set tracks 1 clip_slots 0 clip
  object: active
  present: true
  absent: false

vase:
  type: clip
  path: live_set tracks 0 devices 0 parameters 1
  object: active
  present: true
  absent: false

chaos:
  type: track
  path: live_set return_tracks 0
  object: active
  present: true
  absent: false
`

// Default Hydra shader template
const DEFAULT_HYDRA_SHADER = 'osc().out()'

export type ConfigurationKey = {
  type: 'track' | 'clip' | 'device' | 'device_parameter'
  path: string
  object: 'active' | 'value'
  present: boolean | number
  absent: boolean | number
}

export type ConfigurationJSON = {
  [keyword: string]: ConfigurationKey
} | null

interface ConfigurationState {
  rawConfig: string
  parsedConfig: ConfigurationJSON | null
  configPath: string | null
  isValid: boolean
  error: string | null
  hydraShader: string
  setRawConfig: (rawConfig: string) => void
  setParsedConfig: (parsedConfig: ConfigurationJSON) => void
  loadRawConfig: () => Promise<void>
  saveRawConfig: () => Promise<void>
  resetRawConfig: () => void
  setRawConfigPath: (path: string | null) => void
  setHydraShader: (shader: string) => void
  resetHydraShader: () => void
}

export const useConfigurationStore = create<ConfigurationState>((set, get) => ({
  rawConfig: DEFAULT_CONFIG,
  parsedConfig: parseConfig(DEFAULT_CONFIG).parsedConfig,
  configPath: null,
  isValid: true,
  error: null,
  hydraShader: DEFAULT_HYDRA_SHADER,

  setRawConfig: (rawConfig: string) => {
    // Validate YAML
    try {
      jsyaml.load(rawConfig)
      const { parsedConfig, err } = parseConfig(rawConfig)
      if (err) throw err
      set({ rawConfig, parsedConfig, isValid: true, error: null })
    } catch (err) {
      set({
        rawConfig,
        parsedConfig: null,
        isValid: false,
        error: err instanceof Error ? err.message : 'Invalid YAML'
      })
    }
  },

  setParsedConfig: (parsedConfig: ConfigurationJSON) => {
    set({ parsedConfig })
  },

  loadRawConfig: async () => {
    try {
      const result = await window.api.config.load()
      if (result.success && result.content) {
        // Validate loaded content
        jsyaml.load(result.content)
        set({
          rawConfig: result.content,
          configPath: result.path || null,
          isValid: true,
          error: null
        })
      } else if (result.error) {
        set({ error: result.error, isValid: false })
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load configuration',
        isValid: false
      })
    }
  },

  saveRawConfig: async () => {
    const state = get()
    if (!state.isValid) {
      set({ error: 'Cannot save invalid YAML' })
      return
    }

    try {
      const result = await window.api.config.save(state.rawConfig)
      if (result.success) {
        set({ configPath: result.path || null, error: null })
      } else if (result.error) {
        set({ error: result.error })
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to save configuration' })
    }
  },

  resetRawConfig: () => {
    set({
      rawConfig: DEFAULT_CONFIG,
      parsedConfig: parseConfig(DEFAULT_CONFIG).parsedConfig,
      isValid: true,
      error: null
    })
  },

  setRawConfigPath: (path) => set({ configPath: path }),

  setHydraShader: (shader: string) => {
    set({ hydraShader: shader })
  },

  resetHydraShader: () => {
    set({ hydraShader: DEFAULT_HYDRA_SHADER })
  }
}))

// Initialize config path on app start
export async function initializeConfigStore(): Promise<void> {
  try {
    const path = await window.api.config.getPath()
    useConfigurationStore.getState().setRawConfigPath(path)
  } catch (err) {
    console.error('Failed to initialize config path:', err)
  }
}
