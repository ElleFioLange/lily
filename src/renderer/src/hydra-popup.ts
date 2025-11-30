import Hydra from 'hydra-synth'
import { useConfigurationStore } from './stores/useConfigurationStore'
import { keyRegex } from './utils/parseInput'

let hydraInstance: any = null

// Initialize Hydra when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
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

  // Handle window resize
  window.addEventListener('resize', () => {
    setCanvasSize()
    if (hydraInstance) {
      hydraInstance.setResolution(window.innerWidth, window.innerHeight)
    }
  })

  // Request initial shader code from main window
  window.api.hydra.requestShader()
})

// Listen for shader evaluation commands
window.api.hydra.onEvaluateShader((code: string) => {
  if (!hydraInstance) return

  console.log(code)

  try {
    const synth = hydraInstance.synth
    const evalFunc = new Function(...Object.keys(synth), code)
    evalFunc(...Object.values(synth))
  } catch (err) {
    console.error('Hydra evaluation error:', err)
  }
})

// Listen for text updates
window.api.hydra.onTextUpdate((text: string) => {
  const textOverlay = document.getElementById('text-overlay')
  if (textOverlay) {
    const { parsedConfig: config } = useConfigurationStore.getState()

    if (!config) {
      textOverlay.replaceChildren(text)
      return
    }

    const keys = Object.keys(config)

    const matchedKeys: {
      key: string
      match: string
    }[] = []

    keys.forEach((key) => {
      console.log(key)
      const regex = keyRegex(key)
      const matches = text.matchAll(regex)
      const instances = Array.from(matches)
      console.log(instances)
      instances.forEach((instance) => {
        const match = instance[0]
        matchedKeys.push({ key, match })
      })
    })

    let processedText: (Node | string)[] = []
    let marker = 0

    for (const { key, match } of matchedKeys) {
      let index = text.indexOf(match, marker)

      const pretext = text.slice(marker, index)

      const matchNode = document.createElement('span')
      matchNode.setAttribute('id', key)
      matchNode.setAttribute('class', 'keyword')
      matchNode.textContent = match

      processedText.push(...[pretext, matchNode])
      marker = index + match.length
    }

    processedText.push(text.slice(marker))

    textOverlay.replaceChildren(...processedText)
  }
})

// Listen for scroll position updates
window.api.hydra.onScrollUpdate((scrollPercentage: number) => {
  const textOverlay = document.getElementById('text-overlay-container')
  if (textOverlay) {
    // Calculate the scroll position based on the percentage
    const maxScroll = textOverlay.scrollHeight - textOverlay.clientHeight
    const targetScroll = maxScroll * scrollPercentage
    console.log(maxScroll, targetScroll, scrollPercentage)

    // Apply the scroll position
    textOverlay.scrollTop = targetScroll
  }
})
