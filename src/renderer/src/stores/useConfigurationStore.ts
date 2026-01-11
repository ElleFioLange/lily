import { create } from 'zustand'
import * as jsyaml from 'js-yaml'
import parseConfig from '@renderer/utils/parseConfig'
import { ConfigurationJSON } from 'src/types/config'

interface ConfigurationState {
  config: string
  parsedConfig: ConfigurationJSON | null
  configPath: string | null
  configName: string | null
  isValid: boolean
  error: string | null
  setConfig: (rawConfig: string) => void
  setParsedConfig: (parsedConfig: ConfigurationJSON) => void
  saveConfig: () => Promise<void>
  openConfig: () => Promise<void>
  saveConfigAs: () => Promise<void>
  newConfig: () => void
  setConfigPath: (path: string | null) => void
  setConfigName: (name: string | null) => void
}

export const useConfigurationStore = create<ConfigurationState>((set, get) => ({
  config: '',
  parsedConfig: {},
  configPath: null,
  configName: 'new-config',
  isValid: true,
  error: null,

  setConfig: (config: string) => {
    // Validate YAML
    try {
      jsyaml.load(config)
      const { parsedConfig, err } = parseConfig(config)
      if (err) throw err
      set({ config, parsedConfig, isValid: true, error: null })
    } catch (err) {
      set({
        config,
        parsedConfig: null,
        isValid: false,
        error: err instanceof Error ? err.message : 'Invalid YAML'
      })
    }
  },

  setParsedConfig: (parsedConfig: ConfigurationJSON) => {
    set({ parsedConfig })
  },

  saveConfig: async () => {
    const state = get()
    if (!state.isValid) {
      set({ error: 'Cannot save invalid YAML' })
      return
    }

    if (state.configPath === null) {
      set({ error: 'Cannot save with null file path' })
      return
    }

    try {
      const result = await window.api.config.save(state.config, state.configPath)
      if (result.success) {
        set({ configPath: result.path || null, error: null })
      } else if (result.error) {
        set({ error: result.error })
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to save configuration' })
    }
  },

  openConfig: async () => {
    try {
      const result = await window.api.config.open()
      if (result.success && result.content && result.path) {
        // Parse and validate loaded content
        const { parsedConfig, err } = parseConfig(result.content)
        // TODO double check if this works on windows? maybe need backslashes?
        const configPath = result.path
        const configPathArr = configPath.split('/')
        const configFile = configPathArr[configPathArr.length - 1]
        const configName = configFile.slice(0, configFile.length - 5) // strip .yaml

        if (err) throw err

        set({
          config: result.content,
          parsedConfig,
          configPath,
          configName,
          isValid: true,
          error: null
        })
      } else if (result.error) {
        // Don't set error for cancellation
        if (result.error !== 'No file selected') {
          set({ error: result.error, isValid: false })
        }
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to open file',
        isValid: false
      })
    }
  },

  saveConfigAs: async () => {
    const state = get()
    if (!state.isValid) {
      set({ error: 'Cannot save invalid YAML' })
      return
    }

    try {
      const result = await window.api.config.saveAs(state.config)
      if (result.success) {
        set({ configPath: result.path || null, error: null })
      } else if (result.error) {
        // Don't set error for cancellation
        if (result.error !== 'No file selected') {
          set({ error: result.error })
        }
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to save file' })
    }
  },

  newConfig: () => {
    set({
      config: '',
      parsedConfig: {},
      configPath: null,
      configName: 'new-config',
      isValid: true,
      error: null
    })
  },

  setConfigPath: (configPath) => set({ configPath }),

  setConfigName: (configName) => set({ configName })
}))

// Initialize config path on app start
// export async function initializeConfigStore(): Promise<void> {
//   try {
//     const path = await window.api.config.
//     useConfigurationStore.getState().setRawConfigPath(path)
//   } catch (err) {
//     console.error('Failed to initialize config path:', err)
//   }
// }
