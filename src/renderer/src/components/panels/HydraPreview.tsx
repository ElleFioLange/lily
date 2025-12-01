import { useRef, useEffect } from 'react'
import Hydra from 'hydra-synth'
import Panel from '../common/Panel'
import type { PanelId } from '../../stores/useFocusStore'
import { useHydraStore } from '../../stores/useHydraStore'
import { useConfigurationStore } from '../../stores/useConfigurationStore'

interface HydraPreviewProps {
  panelId?: PanelId
}

export default function HydraPreview({ panelId }: HydraPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hydraRef = useRef<any>(null)
  const evaluationVersion = useHydraStore((state) => state.evaluationVersion)
  const lastError = useHydraStore((state) => state.lastError)
  const setError = useHydraStore((state) => state.setError)
  const hydraShader = useConfigurationStore((state) => state.hydraShader)

  // Initialize Hydra on mount
  useEffect(() => {
    if (!canvasRef.current || hydraRef.current) return

    const hydra = new Hydra({
      canvas: canvasRef.current,
      detectAudio: false, // Don't request microphone
      makeGlobal: false, // Keep functions namespaced
      autoLoop: true // Auto-render via requestAnimationFrame
    })

    hydraRef.current = hydra

    // Initial evaluation
    evaluateShader(hydraShader)

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
      evaluateShader(hydraShader)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluationVersion])

  const evaluateShader = (code: string) => {
    if (!hydraRef.current) return

    console.log(code)

    try {
      const synth = hydraRef.current.synth
      const evalFunc = new Function(...Object.keys(synth), code)
      console.log(synth)
      evalFunc(...Object.values(synth))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed')
    }
  }

  const handleOpenPopup = async () => {
    // TODO reset the hydra preview to sync the popup window
    await window.api.hydra.openPopup()
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
