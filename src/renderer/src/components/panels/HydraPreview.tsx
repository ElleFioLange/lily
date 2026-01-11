import { useRef, useEffect, useState } from 'react'
import Hydra from 'hydra-synth'
import Panel from '../common/Panel'
import type { PanelId } from '../../stores/useFocusStore'
import { useHydraStore } from '../../stores/useHydraStore'
import { usePerformanceStore } from '../../stores/usePerformanceStore'
import { CameraStreamManager } from '../camera/CameraStreamManager'
import loadScript from '@renderer/utils/loadScript'

interface HydraPreviewProps {
  panelId?: PanelId
}

// TODO investigate weird flicker bug that happens sometimes
// TODO bugfix: "render()" only shows o0 in the upper left corner

export default function HydraPreview({ panelId }: HydraPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hydraRef = useRef<any>(null)
  const [cameraVideo, setCameraVideo] = useState<HTMLVideoElement | HTMLImageElement | null>(null)
  const evaluationVersion = useHydraStore(({ evaluationVersion }) => evaluationVersion)
  const lastError = useHydraStore(({ lastError }) => lastError)
  const setError = useHydraStore(({ setError }) => setError)
  const shader = useHydraStore(({ shader }) => shader)

  // Initialize Hydra on mount
  useEffect(() => {
    if (!canvasRef.current || hydraRef.current) return

    // Get WebGL context with preserveDrawingBuffer for compositor reading
    const gl = canvasRef.current.getContext('webgl', { preserveDrawingBuffer: true })
    if (!gl) {
      console.error('Failed to get WebGL context with preserveDrawingBuffer')
    }

    // TODO add hydra audio input setting
    const hydra = new Hydra({
      canvas: canvasRef.current,
      // detectAudio: false,
      makeGlobal: false, // Keep functions namespaced
      autoLoop: true // Auto-render via requestAnimationFrame
    })

    hydraRef.current = hydra
    window.hydraSynth = hydra

    // Initial evaluation
    evaluateShader(shader)

    return () => {
      if (hydraRef.current) {
        hydraRef.current.synth.hush() // Stop all outputs
        hydraRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Register canvas with compositor when performance window opens
  useEffect(() => {
    if (!canvasRef.current) return

    // Check if compositor already exists and register
    const registerWithCompositor = (): void => {
      const compositor = usePerformanceStore.getState().compositorRef
      if (compositor && canvasRef.current) {
        compositor.addSource({
          id: 'hydra',
          canvas: canvasRef.current,
          alpha: 1,
          zIndex: 0,
          blendMode: 'source-over',
          enabled: true
        })
      }
    }

    // Register immediately if compositor exists
    registerWithCompositor()

    // Subscribe to future compositor changes
    const unsubscribe = usePerformanceStore.subscribe((state) => {
      if (state.compositorRef && canvasRef.current) {
        // Check if hydra source already exists
        const existingSource = state.compositorRef.getSource('hydra')
        if (!existingSource) {
          registerWithCompositor()
        }
      }
    })

    return unsubscribe
  }, [])

  // Re-evaluate when evaluationVersion changes
  useEffect(() => {
    if (hydraRef.current && evaluationVersion > 0) {
      evaluateShader(shader)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluationVersion])

  // Initialize camera as Hydra source (s0) when ready
  useEffect(() => {
    if (hydraRef.current && cameraVideo) {
      try {
        // Make camera available as s0 source in Hydra
        hydraRef.current.synth.s0.init({ src: cameraVideo })
        console.log('Camera initialized as Hydra source s0')
      } catch (err) {
        console.error('Failed to initialize camera as Hydra source:', err)
      }
    }
  }, [cameraVideo])

  const evaluateShader = (code: string) => {
    if (!hydraRef.current) return

    try {
      const synth = hydraRef.current.synth
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

      // Create function with all Hydra methods in scope
      const evalFunc = new AsyncFunction(...Object.keys(synth), 'synth', 'loadScript', code)
      evalFunc(...Object.values(synth), synth, loadScript)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed')
    }
  }

  const togglePerformanceWindow = usePerformanceStore((state) => state.toggleWindow)

  const handleOpenPerformanceWindow = () => {
    togglePerformanceWindow()
  }

  return (
    <Panel
      title="Hydra preview"
      collapsible
      contentClassName="flex flex-col relative"
      panelId={panelId}
      headerActions={
        <>
          <button
            onClick={handleOpenPerformanceWindow}
            className="px-2 py-1 text-xs bg-stone-700 hover:bg-stone-600 text-stone-100 rounded transition-colors"
            title="Open performance window"
          >
            Performance
          </button>
          <button
            onClick={() => console.log(hydraRef.current.synth.time)}
            className="px-2 py-1 text-xs bg-stone-700 hover:bg-stone-600 text-stone-100 rounded transition-colors"
            title="test time"
          >
            test time
          </button>
        </>
      }
    >
      {/* Camera Stream Manager (hidden, provides video element to Hydra) */}
      <CameraStreamManager onVideoReady={setCameraVideo} visible={false} />

      {/* Error Display */}
      {lastError && (
        <div className="absolute top-0 left-0 right-0 bg-red-900/80 text-red-100 text-xs p-2 z-10">
          Error: {lastError}
        </div>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
    </Panel>
  )
}
