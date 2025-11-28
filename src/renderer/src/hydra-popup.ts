import Hydra from 'hydra-synth'

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

  try {
    const synth = hydraInstance.synth
    const evalFunc = new Function(...Object.keys(synth), code)
    evalFunc(...Object.values(synth))
  } catch (err) {
    console.error('Hydra evaluation error:', err)
  }
})
