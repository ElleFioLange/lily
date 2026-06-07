import parseConfig from '@renderer/utils/parseConfig'
import jsyaml from 'js-yaml'
import { ConfigurationJSON } from 'src/types/config'
import { PluginState } from 'src/types/plugins'
import { create } from 'zustand'

export type LLMPoiesisMessage = {
  speaker: 'artist' | 'response'
  content: string
  timestamp: Date
}

export type LLMProvider = 'claude' | 'local'

export interface LLMPoiesisState extends PluginState {
  // Poiesis
  draft: string
  conversation: LLMPoiesisMessage[]
  triggerAnimationFlag: boolean
  lastRunValue: string
  scrollPercentage: number
  setDraft: (draft: string) => void
  setConversation: (conversation: LLMPoiesisMessage[]) => void
  setTriggerAnimationFlag: (triggerAnimationFlag: boolean) => void
  setScrollPercentage: (scrollPercentage: number) => void

  // Mask renderer
  maskCanvas: HTMLCanvasElement | null
  maskWord: string
  maskFont: string
  isWaitingForResponse: boolean
  setMaskCanvas: (canvas: HTMLCanvasElement) => void
  setMaskWord: (word: string) => void
  setMaskFont: (font: string) => void
  setIsWaitingForResponse: (waiting: boolean) => void

  // Fonts
  artistFont: string
  responseFont: string
  setArtistFont: (font: string) => void
  setResponseFont: (font: string) => void

  // LLM provider
  llmProvider: LLMProvider
  localModelUrl: string
  setLLMProvider: (provider: LLMProvider) => void
  setLocalModelUrl: (url: string) => void

  // Config
  config: string
  parsedConfig: ConfigurationJSON | null
  configPath: string | null
  configName: string | null
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

  // System prompt
  systemPrompt: string
  setSystemPrompt: (prompt: string) => void

  // Workspace open surface
  openSurface: 'poiesis' | 'config'
  setOpenSurface: (openSurface: 'poiesis' | 'config') => void
}

export const createLLMPoiesisStore = (instanceId: string) => {
  return create<LLMPoiesisState>((set, get) => ({
    // Plugin UIProps
    instanceId,

    // Poiesis
    draft: '',
    conversation: [],
    triggerAnimationFlag: false,
    lastRunValue: '',
    scrollPercentage: 0,

    setDraft: (draft) => set({ draft }),
    setConversation: (conversation) => set({ conversation }),
    setTriggerAnimationFlag: (triggerAnimationFlag) => set({ triggerAnimationFlag }),
    setScrollPercentage: (scrollPercentage) => set({ scrollPercentage }),

    // Mask renderer
    maskCanvas: null,
    maskWord: '',
    maskFont: 'sans-serif',
    isWaitingForResponse: false,
    setMaskCanvas: (maskCanvas) => set({ maskCanvas }),
    setMaskWord: (maskWord) => set({ maskWord }),
    setMaskFont: (maskFont) => set({ maskFont }),
    setIsWaitingForResponse: (isWaitingForResponse) => set({ isWaitingForResponse }),

    // Fonts
    artistFont: 'sans-serif',
    responseFont: 'sans-serif',
    setArtistFont: (artistFont) => set({ artistFont }),
    setResponseFont: (responseFont) => set({ responseFont }),

    // LLM provider
    llmProvider: 'local',
    localModelUrl: 'http://localhost:1234/v1',
    setLLMProvider: (llmProvider) => set({ llmProvider }),
    setLocalModelUrl: (localModelUrl) => set({ localModelUrl }),

    // Config
    config: '',
    parsedConfig: {},
    configPath: null,
    configName: 'new-config',
    isValid: true,
    error: null,

    setConfig: (config: string) => {
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
          const name = result.path?.split('/').at(-1)?.replace(/\.[^.]+$/, '') ?? null
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
        const name = result.path.split('/').at(-1)?.replace(/\.[^.]+$/, '') ?? null
        const { parsedConfig, err } = parseConfig(result.content)
        if (err) throw err
        set({
          config: result.content,
          parsedConfig,
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
        configPath: null,
        configName: 'new-config',
        isValid: true,
        error: null
      })
    },

    setConfigPath: (configPath) => set({ configPath }),
    setConfigName: (configName) => set({ configName }),

    // System prompt
    systemPrompt:
      'You are playing a character named Madeleine. You are a companion to a musical performance. You are embodied on stage as a female mannequinn wearing a long black wool skirt, a cream sleeveless vest, and a womens business jacket. I, the performer, am having a conversation with you as part of the performance. Respond in in short, sharply written sentences. NO MORE THAN 2 SENTENCES. KEEP IT SHORT. Your main goal is to ask questions to prompt insight from me as a performer. Topics will be range from art to artificial intelligence to politics to culture to gender and much more.',
    setSystemPrompt: (systemPrompt) => set({ systemPrompt }),

    // Workspace open surface
    openSurface: 'poiesis' as 'poiesis',

    setOpenSurface: (openSurface) => set({ openSurface })
  }))
}
