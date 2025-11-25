import { create } from 'zustand'

// Default configuration template
const DEFAULT_CONFIG = {
  _comment_project: 'Project metadata and settings',
  project: {
    name: 'Lily Project',
    version: '1.0.0',
    author: ''
  },

  _comment_osc: 'Open Sound Control configuration',
  osc: {
    outputPort: 5459,
    inputPort: 5460,
    targetHost: 'localhost'
  },

  _comment_ui: 'User interface settings',
  ui: {
    theme: 'dark',
    defaultLayout: 'performance',
    panelSizes: {}
  },

  _comment_custom: 'Add your own configuration here',
  custom: {}
}

interface ConfigurationState {
  config: string
  configPath: string | null
  isValid: boolean
  error: string | null
  setConfig: (config: string) => void
  loadConfig: () => Promise<void>
  saveConfig: () => Promise<void>
  resetConfig: () => void
  setConfigPath: (path: string | null) => void
}

export const useConfigurationStore = create<ConfigurationState>((set, get) => ({
  config: JSON.stringify(DEFAULT_CONFIG, null, 2),
  configPath: null,
  isValid: true,
  error: null,

  setConfig: (config: string) => {
    // Validate JSON
    try {
      JSON.parse(config)
      set({ config, isValid: true, error: null })
    } catch (err) {
      set({
        config,
        isValid: false,
        error: err instanceof Error ? err.message : 'Invalid JSON'
      })
    }
  },

  loadConfig: async () => {
    try {
      const result = await window.api.config.load()
      if (result.success && result.content) {
        // Validate loaded content
        JSON.parse(result.content)
        set({
          config: result.content,
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

  saveConfig: async () => {
    const state = get()
    if (!state.isValid) {
      set({ error: 'Cannot save invalid JSON' })
      return
    }

    try {
      const result = await window.api.config.save(state.config)
      if (result.success) {
        set({ configPath: result.path || null, error: null })
      } else if (result.error) {
        set({ error: result.error })
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to save configuration' })
    }
  },

  resetConfig: () => {
    set({
      config: JSON.stringify(DEFAULT_CONFIG, null, 2),
      isValid: true,
      error: null
    })
  },

  setConfigPath: (path) => set({ configPath: path })
}))

// Initialize config path on app start
export async function initializeConfigStore(): Promise<void> {
  try {
    const path = await window.api.config.getPath()
    useConfigurationStore.getState().setConfigPath(path)
  } catch (err) {
    console.error('Failed to initialize config path:', err)
  }
}
