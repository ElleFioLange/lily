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
 * Mallet keyboard settings (Poiesis only) — maps MIDI channel 9 note-ons to typing
 */
export interface MalletKeyboardSettings {
  enabled: boolean
}

/**
 * Application settings
 */
export interface Settings {
  audio: AudioSettings
  malletKeyboard: MalletKeyboardSettings
  /** Folder the file browser lists .js patches from; null until one is opened */
  workingDirectory: string | null
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: Settings = {
  audio: {
    deviceId: null,
    autoDetect: true
  },
  malletKeyboard: {
    enabled: false
  },
  workingDirectory: null
}
