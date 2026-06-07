export type ArgPreset = {
  ableton?: number | boolean
  hydra?: number | string | boolean
}

export type KeyArgument = {
  ableton?: {
    acts_on: 'path' | 'value'
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
