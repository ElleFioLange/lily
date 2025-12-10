import { create } from 'zustand'
import * as jsyaml from 'js-yaml'
import parseConfig from '@renderer/utils/parseConfig'

// Default Hydra shader template
const DEFAULT_HYDRA_SHADER = `voronoi(1)
	.modulatePixelate(voronoi(100))
	.color([0, 1].smooth().fast(0.5), [1, 0].smooth().fast(0.3))
	.modulatePixelate(osc(3)
		.modulateScale(src(o0))
		.rotate())
	.out()

src(o0)
	.hue([0, Math.PI * 2].smooth().fast(0.1))
	.add(src(o0)
		.repeat(3)
		.modulateRotate(src(o0))
		.modulateScale(src(o1)), 2)
	.mult(noise(4, 1).brightness(0.5))
	.out(o1)

src(o2).brightness(-0.1).add(src(o1), 0.2).modulateScale(src(o1), -0.05).modulateRotate(src(o0)).out(o2)

render(o2)`

export type ArgPreset = {
  ableton?: number | boolean
  hydra?: number | string | boolean
}

export type KeyArgument = {
  ableton?: {
    acts_on: 'path'
    type: 'number' | 'string' | 'boolean'
  }
  default_value: ArgPreset
  presets?: { [preset: string]: ArgPreset }
}

export type AbletonConfigurationKey = {
  type: 'track' | 'clip' | 'device' | 'device_parameter'
  path: string
  object: 'active' | 'value'
  present: boolean | number
  absent: boolean | number
}

export type HydraConfigurationKey = {
  name: string
  present: number | string | boolean
  absent: number | string | boolean
}

export type AudioReactivityConfig = {
  audioChannel: number // 0-15 (BlackHole channel index)
  visualEffect: string // Effect preset name (e.g., 'kaleidoscope')
  beatDetection?: boolean // Optional: enable beat detection
}

export type ConfigurationKey = {
  ableton?: AbletonConfigurationKey
  hydra?: HydraConfigurationKey
  args?: { [arg: string]: KeyArgument }
  audio_reactivity?: AudioReactivityConfig // NEW: Optional audio-reactive shader config
}

export type ConfigurationJSON = {
  [keyword: string]: ConfigurationKey
} | null

interface ConfigurationState {
  config: string
  parsedConfig: ConfigurationJSON | null
  configPath: string | null
  configName: string | null
  isValid: boolean
  error: string | null
  // TODO should be moved to the hydra store
  hydraShader: string
  setConfig: (rawConfig: string) => void
  setParsedConfig: (parsedConfig: ConfigurationJSON) => void
  saveConfig: () => Promise<void>
  openConfig: () => Promise<void>
  saveConfigAs: () => Promise<void>
  newConfig: () => void
  setConfigPath: (path: string | null) => void
  setConfigName: (name: string | null) => void
  setHydraShader: (shader: string) => void
  resetHydraShader: () => void
}

export const useConfigurationStore = create<ConfigurationState>((set, get) => ({
  config: '',
  parsedConfig: null,
  configPath: null,
  configName: 'new-config',
  isValid: true,
  error: null,
  hydraShader: DEFAULT_HYDRA_SHADER,

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
        console.log(result.path)
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

  setConfigName: (configName) => set({ configName }),

  setHydraShader: (shader: string) => {
    set({ hydraShader: shader })
  },

  resetHydraShader: () => {
    set({ hydraShader: DEFAULT_HYDRA_SHADER })
  }
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
