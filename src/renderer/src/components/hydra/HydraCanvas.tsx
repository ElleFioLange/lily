import { useEffect, useRef } from 'react'
import Hydra from 'hydra-synth'
import { useHydraPopupStore } from '@renderer/stores/useHydraPopupStore'

export default function HydraCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { setHydraInstance, currentShaderCode } = useHydraPopupStore()

  // Initialize Hydra
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current

    // Set canvas resolution to match window size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    setCanvasSize()

    // Initialize Hydra with explicit dimensions
    const hydra = new Hydra({
      canvas,
      // detectAudio: false,
      makeGlobal: false,
      autoLoop: true,
      width: window.innerWidth,
      height: window.innerHeight
    })

    setHydraInstance(hydra)
    console.log('Hydra instance initialized')

    // Handle window resize
    const handleResize = () => {
      setCanvasSize()
      if (hydra) {
        hydra.setResolution(window.innerWidth, window.innerHeight)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [setHydraInstance])

  // Evaluate shader when code changes
  useEffect(() => {
    const hydra = useHydraPopupStore.getState().hydraInstance
    if (!hydra || !currentShaderCode) return

    try {
      const synth = hydra.synth
      // Create function with all Hydra methods in scope
      const evalFunc = new Function(...Object.keys(synth), 'synth', currentShaderCode)
      evalFunc(...Object.values(synth), synth)
      console.log('Shader evaluated successfully')
    } catch (err) {
      console.error('Hydra evaluation error:', err)
    }
  }, [currentShaderCode])

  return <canvas ref={canvasRef} id="hydra-canvas" className="w-screen h-screen block" />
}
