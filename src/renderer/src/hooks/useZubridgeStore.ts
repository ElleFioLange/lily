// Import types from renderer store files to avoid cross-tsconfig imports
// These match the types in main/stores/bridgedStores.ts
type ConfigurationState = {
  config: string
  parsedConfig: any | null
  configPath: string | null
  configName: string | null
  isValid: boolean
  error: string | null
  setConfig: (config: string) => void
  setParsedConfig: (parsedConfig: any) => void
  saveConfig: () => Promise<void>
  openConfig: () => Promise<void>
  saveConfigAs: () => Promise<void>
  newConfig: () => void
  setConfigPath: (path: string | null) => void
  setConfigName: (name: string | null) => void
}

type InputState = {
  input: string
  setInput: (input: string) => void
  evaluateInput: () => void
}

type HydraState = {
  rawShader: string
  shader: string
  evaluationVersion: number
  lastError: string | null
  setRawShader: (rawShader: string) => void
  setShader: (shader: string) => void
  setError: (error: string | null) => void
  evaluateShader: () => Promise<void>
}

type SettingsState = {
  audio: {
    deviceId: string | null
    autoDetect: boolean
  }
  setAudioDevice: (deviceId: string | null) => void
  setAutoDetect: (autoDetect: boolean) => void
  loadSettings: () => Promise<void>
  saveSettings: () => Promise<void>
}

type RootStoreState = {
  configuration: ConfigurationState
  input: InputState
  hydra: HydraState
  settings: SettingsState
}

// Create the root store hook
const useRootStore = createUseStore<RootStoreState>()

// Create selector hooks for each sub-store
export const useConfigurationStore = <T>(selector: (state: ConfigurationState) => T): T => {
  return useRootStore((state) => selector(state.configuration))
}

// Add getState method for compatibility
useConfigurationStore.getState = () => {
  return useRootStore.getState().configuration
}

export const useInputStore = <T>(selector: (state: InputState) => T): T => {
  return useRootStore((state) => selector(state.input))
}

useInputStore.getState = () => {
  return useRootStore.getState().input
}

// Add subscribe method
useInputStore.subscribe = (listener: (state: InputState) => void) => {
  return useRootStore.subscribe((state) => listener(state.input))
}

export const useHydraStore = <T>(selector: (state: HydraState) => T): T => {
  return useRootStore((state) => selector(state.hydra))
}

useHydraStore.getState = () => {
  return useRootStore.getState().hydra
}

export const useSettingsStore = <T>(selector: (state: SettingsState) => T): T => {
  return useRootStore((state) => selector(state.settings))
}

useSettingsStore.getState = () => {
  return useRootStore.getState().settings
}

// Add subscribe method for configuration store
useConfigurationStore.subscribe = (listener: (state: ConfigurationState) => void) => {
  return useRootStore.subscribe((state) => listener(state.configuration))
}
