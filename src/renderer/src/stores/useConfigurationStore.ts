import { create } from 'zustand'
import * as jsyaml from 'js-yaml'
import parseConfig from '@renderer/utils/parseConfig'

// Default configuration template
const DEFAULT_CONFIG = `foundry:
  type: clip
  path: live_set tracks 0 clip_slots 0 clip
  object: active
  present: true
  absent: false
  # audio_reactivity:
  #   audioChannel: 0
  #   visualEffect: kaleidoscope
  #   beatDetection: false

fabric:
  type: clip
  path: live_set tracks 1 clip_slots 0 clip
  object: active
  present: true
  absent: false
  audio_reactivity:
    audioChannel: 1
    visualEffect: voltage

skeleton:
  type: clip
  path: live_set tracks 2 clip_slots _clip clip
  args:
    clip:
      acts_on: path
      type: number
      default_value: 0
      presets:
        sparse: 0
        slight: 1
        some: 2
        dense: 3
        packed: 4
  object: active
  present: true
  absent: false
  audio_reactivity:
    audioChannel: 0
    visualEffect: voltage

sparring_bells:
  type: clip
  path: live_set tracks 3 clip_slots 0 clip
  object: active
  present: true
  absent: false
  # audio_reactivity:
  #   audioChannel: 3
  #   visualEffect: wave-distortion

brine:
  type: clip
  path: live_set tracks 4 clip_slots _clip clip
  args:
    clip:
      acts_on: path
      type: number
      default_value: 0
      presets:
        salty: 0
        foamy: 1
  object: active
  present: true
  absent: false
  # audio_reactivity:
  #   audioChannel: 4
  #   visualEffect: pixelate

wings:
  type: clip
  path: live_set tracks 5 clip_slots 0 clip
  object: active
  present: true
  absent: false

muscle:
  type: clip
  path: live_set tracks 6 clip_slots 0 clip
  object: active
  present: true
  absent: false
  audio_reactivity:
    audioChannel: 1
    visualEffect: voltage

sinking_souls:
  type: clip
  path: live_set tracks 7 clip_slots 0 clip
  object: active
  present: true
  absent: false

single_volt:
  type: clip
  path: live_set tracks 8 clip_slots 0 clip
  object: active
  present: true
  absent: false
`

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

export type KeyArgument = {
  acts_on: 'path'
  type: 'number' | 'string' | 'boolean'
  presets?: { [preset: string]: number | string | boolean }
  default_value: number | string | boolean
}

export type AudioReactivityConfig = {
  audioChannel: number // 0-15 (BlackHole channel index)
  visualEffect: string // Effect preset name (e.g., 'kaleidoscope')
  beatDetection?: boolean // Optional: enable beat detection
}

export type ConfigurationKey = {
  type: 'track' | 'clip' | 'device' | 'device_parameter'
  path: string
  args?: { [arg: string]: KeyArgument }
  object: 'active' | 'value'
  present: boolean | number
  absent: boolean | number
  audio_reactivity?: AudioReactivityConfig // NEW: Optional audio-reactive shader config
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
  openConfigFile: () => Promise<void>
  saveConfigFileAs: () => Promise<void>
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
        // Parse and validate loaded content
        const { parsedConfig, err } = parseConfig(result.content)
        if (err) throw err
        set({
          rawConfig: result.content,
          parsedConfig,
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

  openConfigFile: async () => {
    try {
      const result = await window.api.config.openFile()
      if (result.success && result.content) {
        // Parse and validate loaded content
        const { parsedConfig, err } = parseConfig(result.content)
        if (err) throw err
        set({
          rawConfig: result.content,
          parsedConfig,
          configPath: result.path || null,
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

  saveConfigFileAs: async () => {
    const state = get()
    if (!state.isValid) {
      set({ error: 'Cannot save invalid YAML' })
      return
    }

    try {
      const result = await window.api.config.saveFileAs(state.rawConfig)
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
