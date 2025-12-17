import Hydra from 'hydra-synth'
import { keyRegex } from './utils/parseInput'
import { AudioManager } from './audio/AudioManager'
import { KeywordShaderManager } from './webgl/KeywordShaderManager'
import { ConfigurationJSON } from 'src/types/config'

let hydraInstance: any = null
let audioManager: AudioManager | null = null
let shaderManager: KeywordShaderManager | null = null
let cameraImageElement: HTMLImageElement | null = null
let latestFrameURL: string | null = null
let isCameraInitialized = false
let config: ConfigurationJSON | null = null

// TODO handle rendering text input when the popup opens
// TODO refresh config when its updated for keyboard rendering

// Initialize Hydra when DOM is ready
window.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('hydra-canvas') as HTMLCanvasElement

  if (!canvas) {
    console.error('Canvas not found')
    return
  }

  // Set canvas resolution to match window size
  const setCanvasSize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }

  setCanvasSize()

  // Initialize Hydra with explicit dimensions
  hydraInstance = new Hydra({
    canvas,
    detectAudio: false,
    makeGlobal: false,
    autoLoop: true,
    width: window.innerWidth,
    height: window.innerHeight
  })

  // Initialize audio system
  try {
    // Load settings to get selected audio device
    const settings = await window.api.settings.get()
    const deviceId = settings.audio.autoDetect ? undefined : settings.audio.deviceId || undefined

    audioManager = new AudioManager()
    await audioManager.initialize(deviceId)
    console.log('Audio system initialized')
  } catch (err) {
    console.error('Failed to initialize audio:', err)
    console.warn('Continuing without audio - shaders will receive zero values')
  }

  // Initialize shader manager
  if (audioManager) {
    shaderManager = new KeywordShaderManager(audioManager)
    shaderManager.startRenderLoop()
    console.log('Shader manager initialized')
  } else {
    console.warn('Shader manager not initialized due to audio failure')
  }

  // Create hidden image element for camera stream
  cameraImageElement = document.createElement('img')
  cameraImageElement.style.display = 'none'
  document.body.appendChild(cameraImageElement)

  // Setup camera frame listener
  window.api.camera.onFrame((buffer: ArrayBuffer) => {
    updateCameraFrame(buffer)
  })

  // Handle window resize
  window.addEventListener('resize', () => {
    setCanvasSize()
    if (hydraInstance) {
      hydraInstance.setResolution(window.innerWidth, window.innerHeight)
    }
  })

  // Request initial shader code from main window
  window.api.hydra.requestShader()
  // Request config from main window
  window.api.hydra.requestConfig()
})

/**
 * Update camera frame and initialize as Hydra source if needed
 */
function updateCameraFrame(buffer: ArrayBuffer): void {
  if (!cameraImageElement || !hydraInstance) return

  // Create blob URL from frame buffer
  const blob = new Blob([buffer], { type: 'image/jpeg' })
  const url = URL.createObjectURL(blob)

  // Revoke old URL to prevent memory leak
  if (latestFrameURL) {
    URL.revokeObjectURL(latestFrameURL)
  }
  latestFrameURL = url

  // Update image source
  cameraImageElement.src = url

  // Initialize camera as s0 source on first frame
  if (!isCameraInitialized) {
    cameraImageElement.onload = () => {
      if (cameraImageElement && cameraImageElement.naturalWidth > 0 && hydraInstance) {
        try {
          hydraInstance.synth.s0.init({ src: cameraImageElement })
          console.log(
            `Camera initialized as Hydra source s0 (${cameraImageElement.naturalWidth}x${cameraImageElement.naturalHeight})`
          )
          isCameraInitialized = true
        } catch (err) {
          console.error('Failed to initialize camera as Hydra source:', err)
        }
      }
    }
  }
}

// Listen for shader evaluation commands
window.api.hydra.onEvaluateShader((code: string) => {
  if (!hydraInstance) return

  try {
    const synth = hydraInstance.synth
    const evalFunc = new Function(...Object.keys(synth), 'synth', code)
    evalFunc(...Object.values(synth), synth)
  } catch (err) {
    console.error('Hydra evaluation error:', err)
  }
})

// Listen for text updates
window.api.hydra.onTextUpdate((text: string) => {
  console.log(config)
  const textOverlay = document.getElementById('text-overlay')

  if (textOverlay) {
    if (!config) {
      textOverlay.replaceChildren(text)
      return
    }

    const keys = Object.keys(config)

    const matchedKeys: {
      key: string
      match: string
      position: {
        start: number
        end: number
      }
    }[] = []

    keys.forEach((key) => {
      const regex = keyRegex(key)
      const matches = text.matchAll(regex)
      const instances = Array.from(matches)
      instances.forEach((instance) => {
        const match = instance[0]
        const start = instance.index
        const end = start + match.length
        const position = { start, end }
        matchedKeys.push({ key, match, position })
      })
    })

    let processedText: (Node | string)[] = []
    let marker = 0

    // TODO need to handle cases like key1(key2())
    matchedKeys.sort((a, b) => a.position.start - b.position.start)

    for (const { key, match, position } of matchedKeys) {
      const { start, end } = position

      const pretext = text.slice(marker, start)

      const keywordConfig = config[key]
      const audioConfig = keywordConfig.audio_reactivity

      if (audioConfig && shaderManager) {
        // Create container with canvas overlay
        const container = document.createElement('span')
        container.setAttribute('id', key)
        container.setAttribute('class', 'keyword-container')

        const textSpan = document.createElement('span')
        textSpan.setAttribute('class', 'keyword-text')
        textSpan.textContent = match

        const canvas = document.createElement('canvas')
        canvas.setAttribute('class', 'keyword-shader')
        canvas.setAttribute('data-keyword', key)

        // Initial canvas size (will be refined after DOM render)
        canvas.width = 200
        canvas.height = 60

        container.appendChild(textSpan)
        container.appendChild(canvas)

        processedText.push(pretext, container)

        // Create shader instance after fonts load and DOM renders
        // Wait for fonts to be ready, then wait for layout to apply
        document.fonts.ready.then(() => {
          requestAnimationFrame(() => {
            const bounds = textSpan.getBoundingClientRect()
            if (bounds.width > 0 && bounds.height > 0) {
              // Size canvas to match text with device pixel ratio
              const dpr = window.devicePixelRatio || 1
              canvas.width = Math.ceil(bounds.width * dpr)
              canvas.height = Math.ceil(bounds.height * dpr)
              canvas.style.width = `${bounds.width}px`
              canvas.style.height = `${bounds.height}px`

              shaderManager!.createKeywordShader(key, canvas, audioConfig, match)
            }
          })
        })
      } else {
        // No audio reactivity - render as before
        const matchNode = document.createElement('span')
        matchNode.setAttribute('id', key)
        matchNode.setAttribute('class', 'keyword')
        matchNode.textContent = match

        processedText.push(pretext, matchNode)
      }

      marker = end
    }

    processedText.push(text.slice(marker))

    textOverlay.replaceChildren(...processedText)
  }
})

window.api.hydra.onConfigUpdate((configUpdate) => {
  console.log(configUpdate)
  config = configUpdate
})

window.api.hydra.onTriggerAnimation(() => {
  const textOverlay = document.getElementById('text-overlay')
  if (textOverlay) {
    textOverlay.style.animation = 'none'
    textOverlay.offsetHeight
    textOverlay.style.animation = '2s 0s ease-out 1 trigger'
  }
})

// Listen for scroll position updates
window.api.hydra.onScrollUpdate((scrollPercentage: number) => {
  const textOverlay = document.getElementById('text-overlay-container')
  if (textOverlay) {
    // Calculate the scroll position based on the percentage
    const maxScroll = textOverlay.scrollHeight - textOverlay.clientHeight
    const targetScroll = maxScroll * scrollPercentage

    // Apply the scroll position
    textOverlay.scrollTop = targetScroll
  }
})

// Cleanup on window close
window.addEventListener('beforeunload', () => {
  shaderManager?.destroy()
  audioManager?.destroy()
  // Revoke camera blob URL to prevent memory leak
  if (latestFrameURL) {
    URL.revokeObjectURL(latestFrameURL)
  }
  console.log('Cleaned up audio, shader, and camera systems')
})
