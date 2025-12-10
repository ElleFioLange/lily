/**
 * Audio settings for the application
 */
export interface AudioSettings {
  /** Audio device ID to use, or null for auto-detect */
  deviceId: string | null
  /** Whether to auto-detect BlackHole device */
  autoDetect: boolean
}

/**
 * Application settings
 */
export interface Settings {
  audio: AudioSettings
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: Settings = {
  audio: {
    deviceId: null,
    autoDetect: true
  }
}
