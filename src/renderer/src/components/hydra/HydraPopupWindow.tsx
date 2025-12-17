import { useEffect } from 'react'
import { useHydraPopupStore } from '@renderer/stores/useHydraPopupStore'
import { AudioManager } from '@renderer/audio/AudioManager'
import { KeywordShaderManager } from '@renderer/webgl/KeywordShaderManager'
import { setupHydraPopupListeners } from '@renderer/hooks/useHydraPopupListeners'
import HydraCanvas from './HydraCanvas'
import CameraFrame from './CameraFrame'
import TextOverlay from './TextOverlay'

export default function HydraPopupWindow() {
  const { setAudioManager, setShaderManager, cleanup } = useHydraPopupStore()

  // Initialize systems
  useEffect(() => {
    let audioManager: AudioManager | null = null
    let shaderManager: KeywordShaderManager | null = null

    async function initializeSystems() {
      // Initialize audio system
      try {
        // Load settings to get selected audio device
        const settings = await window.api.settings.get()
        const deviceId = settings.audio.autoDetect
          ? undefined
          : settings.audio.deviceId || undefined

        audioManager = new AudioManager()
        await audioManager.initialize(deviceId)
        setAudioManager(audioManager)
        console.log('Audio system initialized')
      } catch (err) {
        console.error('Failed to initialize audio:', err)
        console.warn('Continuing without audio - shaders will receive zero values')
      }

      // Initialize shader manager (depends on audio)
      if (audioManager) {
        shaderManager = new KeywordShaderManager(audioManager)
        shaderManager.startRenderLoop()
        setShaderManager(shaderManager)
        console.log('Shader manager initialized')
      } else {
        console.warn('Shader manager not initialized due to audio failure')
      }

      // Setup IPC listeners
      setupHydraPopupListeners()

      // Request initial data from main window
      window.api.hydra.requestShader()
      window.api.hydra.requestConfig()
      console.log('Requested initial shader and config from main window')
    }

    initializeSystems()

    // Cleanup on unmount
    return () => {
      cleanup()
    }
  }, [setAudioManager, setShaderManager, cleanup])

  return (
    <>
      <HydraCanvas />
      <CameraFrame />
      <TextOverlay />
    </>
  )
}
