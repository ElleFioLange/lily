import { useEffect, useRef, type ReactNode } from 'react'
import { keyRegex } from '@renderer/utils/parseInput'
// import KeywordRenderer from './KeywordRenderer'
import { usePoiesisStore } from '@renderer/poiesis/store'
import { useConfigurationStore } from '@renderer/config/store'
import KeywordRenderer from './components/KeywordRenderer'

export default function PoiesisRenderer() {
  const overlayRef = useRef<HTMLDivElement>(null)
  const { poiesis, triggerAnimationFlag, setTriggerAnimationFlag, scrollPercentage } =
    usePoiesisStore()
  const { config } = useConfigurationStore()

  // TODO
  // Handle scroll updates
  useEffect(() => {
    if (!overlayRef.current) return
    const overlay = overlayRef.current
    const maxScroll = overlay.scrollHeight + overlay.clientHeight
    const targetScroll = maxScroll * scrollPercentage
    overlay.scrollTop = targetScroll
  }, [scrollPercentage])

  // Handle animation trigger
  useEffect(() => {
    if (!triggerAnimationFlag || !overlayRef.current) return

    const overlay = overlayRef.current
    // Reset animation
    overlay.style.animation = 'none'
    // Force reflow to restart animation
    void overlay.offsetHeight
    // Apply animation
    overlay.style.animation = '2s 0s ease-out 1 trigger'

    // Reset the flag
    setTriggerAnimationFlag(false)
  }, [setTriggerAnimationFlag, triggerAnimationFlag])

  // Parse text and render content
  const renderContent = () => {
    if (!config) {
      // No config - return plain text
      return poiesis
    }

    const keys = Object.keys(config)
    const matchedKeys: Array<{
      key: string
      match: string
      position: { start: number; end: number }
    }> = []

    // Find all keyword matches
    keys.forEach((key) => {
      console.log('matching keys')
      const regex = keyRegex(key)
      const matches = poiesis.matchAll(regex)

      Array.from(matches).forEach((instance) => {
        const match = instance[0]
        const start = instance.index!
        const end = start + match.length
        matchedKeys.push({ key, match, position: { start, end } })
      })
    })

    // Sort by position
    matchedKeys.sort((a, b) => a.position.start - b.position.start)

    // Build content with keyword components
    const elements: ReactNode[] = []
    let marker = 0

    matchedKeys.forEach(({ key, match, position }, index) => {
      const { start, end } = position

      // Add text before keyword
      if (start > marker) {
        elements.push(<span key={`text-${index}`}>{poiesis.slice(marker, start)}</span>)
      }

      // Add keyword renderer or plain keyword
      const keywordConfig = config[key]
      if (keywordConfig.audio_reactivity) {
        elements.push(
          <KeywordRenderer
            key={`keyword-${key}-${index}`}
            keyword={key}
            text={match}
            audioConfig={keywordConfig.audio_reactivity}
          />
        )
      } else {
        elements.push(
          <span key={`keyword-${key}-${index}`} id={key} className="keyword">
            {match}
          </span>
        )
      }

      marker = end
    })

    // Add remaining text
    if (marker < poiesis.length) {
      elements.push(<span key="text-end">{poiesis.slice(marker)}</span>)
    }

    console.log(elements)
    return elements
  }

  return (
    <div
      id="text-overlay-container"
      className="absolute top-0 left-0 right-0 bottom-0 flex items-center"
    >
      <div
        ref={overlayRef}
        id="text-overlay"
        className="w-full max-h-full overflow-y-auto text-stone-50 text-center text-5xl pointer-events-none z-10 p-8 wrap-break-word whitespace-pre-wrap leading-[115%]"
      >
        {renderContent()}
      </div>
    </div>
  )
}

// import { useEffect } from 'react'
// import { useHydraPopupStore } from '@renderer/stores/useHydraPopupStore'
// import { AudioManager } from '@renderer/audio/AudioManager'
// import { KeywordShaderManager } from '@renderer/webgl/KeywordShaderManager'
// import { setupHydraPopupListeners } from '@renderer/hooks/useHydraPopupListeners'
// import HydraCanvas from './HydraCanvas'
// import CameraFrame from './CameraFrame'
// import TextOverlay from './TextOverlay'

// export default function HydraPopupWindow() {
//   const { setAudioManager, setShaderManager, cleanup } = useHydraPopupStore()

//   // Initialize systems
//   useEffect(() => {
//     let audioManager: AudioManager | null = null
//     let shaderManager: KeywordShaderManager | null = null

//     async function initializeSystems() {
//       // Initialize audio system
//       try {
//         // Load settings to get selected audio device
//         const settings = await window.api.settings.get()
//         const deviceId = settings.audio.autoDetect
//           ? undefined
//           : settings.audio.deviceId || undefined

//         audioManager = new AudioManager()
//         await audioManager.initialize(deviceId)
//         setAudioManager(audioManager)
//         console.log('Audio system initialized')
//       } catch (err) {
//         console.error('Failed to initialize audio:', err)
//         console.warn('Continuing without audio - shaders will receive zero values')
//       }

//       // Initialize shader manager (depends on audio)
//       if (audioManager) {
//         shaderManager = new KeywordShaderManager(audioManager)
//         shaderManager.startRenderLoop()
//         setShaderManager(shaderManager)
//         console.log('Shader manager initialized')
//       } else {
//         console.warn('Shader manager not initialized due to audio failure')
//       }

//       // Setup IPC listeners
//       setupHydraPopupListeners()

//       // Request initial data from main window
//       window.api.hydra.requestShader()
//       window.api.hydra.requestConfig()
//       console.log('Requested initial shader and config from main window')
//     }

//     initializeSystems()

//     // Cleanup on unmount
//     return () => {
//       cleanup()
//     }
//   }, [setAudioManager, setShaderManager, cleanup])

//   return (
//     <>
//       <HydraCanvas />
//       <CameraFrame />
//       <TextOverlay />
//     </>
//   )
// }
