import { create } from 'zustand'
import type { AudioManager } from '../audio/AudioManager'
import type { KeywordShaderManager } from '../webgl/KeywordShaderManager'
import type { ConfigurationJSON } from 'src/types/config'

interface HydraPopupState {
  // Manager references (for cleanup)
  hydraInstance: any | null
  audioManager: AudioManager | null
  shaderManager: KeywordShaderManager | null

  // Camera
  cameraImageElement: HTMLImageElement | null
  latestFrameURL: string | null
  isCameraInitialized: boolean

  // Configuration
  config: ConfigurationJSON | null

  // Content
  currentText: string
  scrollPercentage: number
  triggerAnimationFlag: boolean
  currentShaderCode: string

  // Actions
  setHydraInstance: (instance: any) => void
  setAudioManager: (manager: AudioManager | null) => void
  setShaderManager: (manager: KeywordShaderManager | null) => void

  // Camera actions
  updateCameraFrame: (buffer: ArrayBuffer) => void
  initializeCameraSource: () => void

  // Config actions
  setConfig: (config: ConfigurationJSON) => void

  // Text actions
  setText: (text: string) => void
  setScrollPercentage: (percentage: number) => void
  triggerAnimation: () => void
  resetAnimationFlag: () => void

  // Shader actions
  evaluateShader: (code: string) => void

  // Cleanup
  cleanup: () => void
}

export const useHydraPopupStore = create<HydraPopupState>((set, get) => ({
  // Initial state
  hydraInstance: null,
  audioManager: null,
  shaderManager: null,
  cameraImageElement: null,
  latestFrameURL: null,
  isCameraInitialized: false,
  config: null,
  currentText: '',
  scrollPercentage: 0,
  triggerAnimationFlag: false,
  currentShaderCode: '',

  // Manager setters
  setHydraInstance: (instance) => set({ hydraInstance: instance }),
  setAudioManager: (manager) => set({ audioManager: manager }),
  setShaderManager: (manager) => set({ shaderManager: manager }),

  // Camera actions
  updateCameraFrame: (buffer) => {
    const { latestFrameURL } = get()

    // Revoke previous blob URL to prevent memory leak
    if (latestFrameURL) {
      URL.revokeObjectURL(latestFrameURL)
    }

    // Create new blob URL from buffer
    const blob = new Blob([buffer], { type: 'image/jpeg' })
    const url = URL.createObjectURL(blob)

    set({ latestFrameURL: url })
  },

  initializeCameraSource: () => set({ isCameraInitialized: true }),

  // Config actions
  setConfig: (config) => set({ config }),

  // Text actions
  setText: (text) => set({ currentText: text }),
  setScrollPercentage: (percentage) => set({ scrollPercentage: percentage }),
  triggerAnimation: () => set({ triggerAnimationFlag: true }),
  resetAnimationFlag: () => set({ triggerAnimationFlag: false }),

  // Shader actions
  evaluateShader: (code) => set({ currentShaderCode: code }),

  // Cleanup
  cleanup: () => {
    const { shaderManager, audioManager, latestFrameURL } = get()

    console.log('Cleaning up Hydra popup resources...')

    // Stop and destroy shader manager
    if (shaderManager) {
      shaderManager.destroy()
      console.log('Shader manager destroyed')
    }

    // Stop and destroy audio manager
    if (audioManager) {
      audioManager.destroy()
      console.log('Audio manager destroyed')
    }

    // Revoke camera blob URL
    if (latestFrameURL) {
      URL.revokeObjectURL(latestFrameURL)
      console.log('Camera blob URL revoked')
    }

    // Reset state
    set({
      hydraInstance: null,
      shaderManager: null,
      audioManager: null,
      latestFrameURL: null,
      isCameraInitialized: false,
      cameraImageElement: null
    })

    console.log('Hydra popup cleanup complete')
  }
}))
