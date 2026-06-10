import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { Settings } from '../../types/settings'
import { DEFAULT_SETTINGS } from '../../types/settings'

/**
 * Settings Manager
 * Handles loading and saving application settings to a JSON file in userData directory
 */
export class SettingsManager {
  private settings: Settings
  private settingsPath: string

  constructor() {
    this.settings = { ...DEFAULT_SETTINGS }
    this.settingsPath = join(app.getPath('userData'), 'lily-settings.json')
  }

  /**
   * Load settings from file
   * If file doesn't exist or is corrupted, uses defaults
   */
  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.settingsPath, 'utf-8')
      const parsed = JSON.parse(data)

      // Merge with defaults to ensure all fields exist
      this.settings = {
        audio: {
          ...DEFAULT_SETTINGS.audio,
          ...parsed.audio
        },
        malletKeyboard: {
          ...DEFAULT_SETTINGS.malletKeyboard,
          ...parsed.malletKeyboard
        }
      }

      console.log('Settings loaded:', this.settings)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('Settings file not found, using defaults')
        // File doesn't exist, use defaults and create file
        await this.save()
      } else {
        console.error('Failed to load settings, using defaults:', err)
        this.settings = { ...DEFAULT_SETTINGS }
      }
    }
  }

  /**
   * Save settings to file
   */
  async save(): Promise<void> {
    try {
      await fs.writeFile(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8')
      console.log('Settings saved:', this.settings)
    } catch (err) {
      console.error('Failed to save settings:', err)
      throw err
    }
  }

  /**
   * Get current settings
   */
  get(): Settings {
    return { ...this.settings }
  }

  /**
   * Update settings
   * @param newSettings - New settings to apply
   */
  async set(newSettings: Settings): Promise<void> {
    this.settings = { ...newSettings }
    await this.save()
  }

  /**
   * Get settings file path
   */
  getPath(): string {
    return this.settingsPath
  }
}

// Singleton instance
let settingsManager: SettingsManager | null = null

/**
 * Get the settings manager instance
 */
export function getSettingsManager(): SettingsManager {
  if (!settingsManager) {
    settingsManager = new SettingsManager()
  }
  return settingsManager
}
