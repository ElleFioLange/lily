import { AudioManager } from '@renderer/audio/AudioManager'
import parseConfig from '@renderer/utils/parseConfig'
import jsyaml from 'js-yaml'
import { ConfigFlags, ConfigurationJSON } from 'src/types/config'
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
  configFlags: ConfigFlags
  isValid: boolean
  error: string | null
  setConfig: (rawConfig: string) => void
  setParsedConfig: (parsedConfig: ConfigurationJSON) => void
  saveConfig: () => Promise<void>
  saveConfigAs: () => Promise<void>
  openConfig: () => Promise<void>
  newConfig: () => void
  setConfigPath: (path: string | null) => void
  setConfigName: (name: string | null) => void

  // Workspace open surface
  openSurface: 'poiesis' | 'config'
  setOpenSurface: (openSurface: 'poiesis' | 'config') => void
}

export const createPoiesisStore = (instanceId: string) => {
  return create<PoiesisState>((set, get) => ({
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
    configFlags: {},
    isValid: true,
    error: null,

    setConfig: (config: string) => {
      // Validate YAML
      try {
        jsyaml.load(config)
        const { parsedConfig, flags, err } = parseConfig(config)
        if (err) throw err
        set({ config, parsedConfig, configFlags: flags, isValid: true, error: null })
      } catch (err) {
        // TODO Make error handling more forgiving (don't set parsedConfig to null over a typo)
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
        return get().saveConfigAs()
      }
      try {
        const result = await window.api.config.save(state.config, state.configPath)
        if (result.success) {
          set({ configPath: result.path ?? null, error: null })
        } else if (result.error) {
          set({ error: result.error })
        }
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Failed to save configuration' })
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
          const name =
            result.path
              ?.split('/')
              .at(-1)
              ?.replace(/\.[^.]+$/, '') ?? null
          set({ configPath: result.path ?? null, configName: name, error: null })
        } else if (result.error && result.error !== 'No file selected') {
          set({ error: result.error })
        }
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Failed to save file' })
      }
    },

    openConfig: async () => {
      try {
        const result = await window.api.config.open()
        if (!result.success || !result.content || !result.path) return
        const name =
          result.path
            .split('/')
            .at(-1)
            ?.replace(/\.[^.]+$/, '') ?? null
        const { parsedConfig, flags, err } = parseConfig(result.content)
        if (err) throw err
        set({
          config: result.content,
          parsedConfig,
          configFlags: flags,
          configPath: result.path,
          configName: name,
          isValid: true,
          error: null
        })
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to open config file',
          isValid: false
        })
      }
    },

    newConfig: () => {
      set({
        config: '',
        parsedConfig: {},
        configFlags: {},
        configPath: null,
        configName: 'new-config',
        isValid: true,
        error: null
      })
    },

    setConfigPath: (configPath) => set({ configPath }),

    setConfigName: (configName) => set({ configName }),

    // Workspace open surface
    openSurface: 'poiesis' as 'poiesis', // Holy shit what the hell

    setOpenSurface: (openSurface) => set({ openSurface })
  }))
}
