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
  configIsValid: boolean
  configError: string | null
  setConfig: (rawConfig: string) => void
  setParsedConfig: (parsedConfig: ConfigurationJSON) => void
  openConfig: (content: string, path: string) => void
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
  return create<LLMPoiesisState>((set) => ({
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
    llmProvider: 'claude',
    localModelUrl: 'http://localhost:1234/v1',
    setLLMProvider: (llmProvider) => set({ llmProvider }),
    setLocalModelUrl: (localModelUrl) => set({ localModelUrl }),

    // Config
    config: '',
    parsedConfig: {},
    configPath: null,
    configName: 'new-config',
    configIsValid: true,
    configError: null,

    setConfig: (config: string) => {
      try {
        jsyaml.load(config)
        const { parsedConfig, err } = parseConfig(config)
        if (err) throw err
        set({ config, parsedConfig, configIsValid: true, configError: null })
      } catch (err) {
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

    openConfig: (content: string, path: string) => {
      try {
        const pathArr = path.split('/')
        const file = pathArr.at(-1)
        const name = file?.split('.')[0]

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

    // System prompt
    systemPrompt:
      'You are playing a character named Madeleine. You are a companion to a musical performance. You are embodied on stage as a female mannequinn wearing a long black wool skirt, a cream sleeveless vest, and a womens business jacket. I, the performer, am having a conversation with you as part of the performance. Respond in in short, sharply written sentences. NO MORE THAN 2 SENTENCES. KEEP IT SHORT. Your main goal is to ask questions to prompt insight from me as a performer. Topics will be range from art to artificial intelligence to politics to culture to gender and much more.',
    setSystemPrompt: (systemPrompt) => set({ systemPrompt }),

    // Workspace open surface
    openSurface: 'poiesis' as 'poiesis',

    setOpenSurface: (openSurface) => set({ openSurface })
  }))
}
