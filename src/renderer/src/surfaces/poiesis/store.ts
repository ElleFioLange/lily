import { AudioManager } from '@renderer/audio/AudioManager'
import parseConfig from '@renderer/utils/parseConfig'
import jsyaml from 'js-yaml'
import { ConfigurationJSON } from 'src/types/config'
import { PluginState } from 'src/types/plugins'
import { create } from 'zustand'
import { KeywordShaderManager } from './lib/KeywordShaderManager'
// import { useHydraStore } from './useHydraStore'
// import parseInput, { ParseAbletonResult } from '@renderer/utils/parseInput'

export interface PoiesisState extends PluginState {
  // Poiesis
  poiesis: string
  triggerAnimationFlag: boolean
  lastRunValue: string
  scrollPercentage: number
  audioManager: AudioManager | null
  shaderManager: KeywordShaderManager | null
  setPoiesis: (input: string) => void
  setTriggerAnimationFlag: (triggerAnimationFlag: boolean) => void
  setScrollPercentage: (scrollPercentage: number) => void
  setAudioManager: (audioManager: AudioManager | null) => void
  setShaderManager: (shaderManager: KeywordShaderManager | null) => void

  // Config
  config: string
  parsedConfig: ConfigurationJSON | null
  configPath: string | null
  configName: string | null
  configIsValid: boolean
  configError: string | null
  setConfig: (rawConfig: string) => void
  setParsedConfig: (parsedConfig: ConfigurationJSON) => void
  openConfig: (content: string, path: string) => void
  newConfig: () => void
  setConfigPath: (path: string | null) => void
  setConfigName: (name: string | null) => void

  // Workspace open surface
  openSurface: 'poiesis' | 'config'
  setOpenSurface: (openSurface: 'poiesis' | 'config') => void
}

export const createPoiesisStore = (instanceId: string) => {
  return create<PoiesisState>((set) => ({
    // Plugin UIProps
    instanceId,

    // Poiesis
    poiesis: '',
    triggerAnimationFlag: false,
    lastRunValue: '',
    scrollPercentage: 0,
    audioManager: null,
    shaderManager: null,

    setPoiesis: (poiesis) => set({ poiesis }),

    setTriggerAnimationFlag: (triggerAnimationFlag) => set({ triggerAnimationFlag }),

    setScrollPercentage: (scrollPercentage) => set({ scrollPercentage }),

    setAudioManager: (audioManager) => set({ audioManager }),

    setShaderManager: (shaderManager) => set({ shaderManager }),

    // Config
    config: '',
    parsedConfig: {},
    configPath: null,
    configName: 'new-config',
    configIsValid: true,
    configError: null,

    setConfig: (config: string) => {
      // Validate YAML
      try {
        jsyaml.load(config)
        const { parsedConfig, err } = parseConfig(config)
        if (err) throw err
        set({ config, parsedConfig, configIsValid: true, configError: null })
      } catch (err) {
        // TODO Make error handling more forgiving (don't set parsedConfig to null over a typo)
        set({
          config,
          parsedConfig: null,
          configIsValid: false,
          configError: err instanceof Error ? err.message : 'Invalid YAML'
        })
      }
    },

    setParsedConfig: (parsedConfig: ConfigurationJSON) => {
      set({ parsedConfig })
    },

    // saveConfig: async () => {
    //   const state = get()
    //   if (!state.configIsValid) {
    //     set({ configError: 'Cannot save invalid YAML' })
    //     return
    //   }

    //   if (state.configPath === null) {
    //     set({ configError: 'Cannot save with null file path' })
    //     return
    //   }

    //   try {
    //     const result = await window.api.config.save(state.config, state.configPath)
    //     if (result.success) {
    //       set({ configPath: result.path || null, configError: null })
    //     } else if (result.error) {
    //       set({ configError: result.error })
    //     }
    //   } catch (err) {
    //     set({ configError: err instanceof Error ? err.message : 'Failed to save configuration' })
    //   }
    // },

    openConfig: (content: string, path: string) => {
      try {
        // TODO double check if this works on windows? maybe need backslashes?
        const pathArr = path.split('/')
        const file = pathArr.at(-1)
        const name = file?.split('.')[0] // strip .yaml

        // Parse and validate loaded content
        const { parsedConfig, err } = parseConfig(content)
        if (err) throw err

        set({
          config: content,
          parsedConfig,
          configPath: path,
          configName: name,
          configIsValid: true,
          configError: null
        })
      } catch (err) {
        set({
          configError: err instanceof Error ? err.message : 'Failed to open config file',
          configIsValid: false
        })
      }
    },

    // saveConfigAs: async () => {
    //   const state = get()
    //   if (!state.configIsValid) {
    //     set({ configError: 'Cannot save invalid YAML' })
    //     return
    //   }

    //   try {
    //     const result = await window.api.config.saveAs(state.config)
    //     if (result.success) {
    //       set({ configPath: result.path || null, configError: null })
    //     } else if (result.error) {
    //       // Don't set error for cancellation
    //       if (result.error !== 'No file selected') {
    //         set({ configError: result.error })
    //       }
    //     }
    //   } catch (err) {
    //     set({ configError: err instanceof Error ? err.message : 'Failed to save file' })
    //   }
    // },

    newConfig: () => {
      set({
        config: '',
        parsedConfig: {},
        configPath: null,
        configName: 'new-config',
        configIsValid: true,
        configError: null
      })
    },

    setConfigPath: (configPath) => set({ configPath }),

    setConfigName: (configName) => set({ configName }),

    // Workspace open surface
    openSurface: 'poiesis' as 'poiesis', // Holy shit what the hell

    setOpenSurface: (openSurface) => set({ openSurface })
  }))
}
