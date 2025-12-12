import { useRef, useEffect, useState } from 'react'
import Hydra from 'hydra-synth'
import Panel from '../common/Panel'
import type { PanelId } from '../../stores/useFocusStore'
import { useHydraStore } from '../../stores/useHydraStore'
import { CameraStreamManager } from '../camera/CameraStreamManager'

interface HydraPreviewProps {
  panelId?: PanelId
}

// TODO investigate weird flicker bug that happens sometimes

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

    const hydra = new Hydra({
      canvas: canvasRef.current,
      // detectAudio: false, // Don't request microphone
      makeGlobal: false, // Keep functions namespaced
      autoLoop: true // Auto-render via requestAnimationFrame
    })

    hydraRef.current = hydra

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

      const evalFunc = new Function(...Object.keys(synth), 'synth', code)
      evalFunc(...Object.values(synth), synth)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed')
    }
  }

  const handleOpenPopup = async () => {
    // Reset preview to keep popup in sync
    await window.api.hydra.openPopup()

    if (hydraRef.current) {
      console.log('here')
      const { synth } = hydraRef.current
      synth.hush()
      synth.time = 0
      evaluateShader(shader)
    }
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
            onClick={handleOpenPopup}
            className="px-2 py-1 text-xs bg-stone-700 hover:bg-stone-600 text-stone-100 rounded transition-colors"
            title="Open popup window"
          >
            Popup
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
