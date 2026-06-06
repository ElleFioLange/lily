import Hydra from 'hydra-synth'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin, UIProps } from 'src/types/plugins'
import { HydraState } from '../store'
import { useEffect, useRef } from 'react'
import { processMonitor } from '../process'

function OutputMonitor({ shader, layer }: { shader: string; layer: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hydraRef = useRef<HydraState['hydra']>(null)
  document.addEventListener('hydra-process', () => {
    const hydra = hydraRef.current
    if (hydraRef) {
      const shaderLayer = shader + `\nrender(o${layer})`

      processMonitor({ shader: shaderLayer, hydra })
    }
  })

  useEffect(() => {
    if (canvasRef.current !== null) {
      const hydra = new Hydra({
        detectAudio: true,
        canvas: canvasRef.current,
        makeGlobal: false,
        precision: 'highp',
        autoLoop: true
      })

      hydraRef.current = hydra
    }
  })

  return <canvas ref={canvasRef} />
}

export default function Monitor({ instanceId, ...props }: UIProps) {
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<HydraState>
  const { shader, monitorsEnabled, setMonitorsEnabled } = instance.useStore()
  return (
    <div className="size-full flex flex-col" {...props}>
      <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-800">
        <label className="text-xs text-stone-400 flex items-center gap-2 cursor-pointer select-none">
          <div
            className={`w-8 h-4 rounded-full relative transition-colors ${monitorsEnabled ? 'bg-stone-400' : 'bg-stone-700'}`}
            onClick={() => setMonitorsEnabled(!monitorsEnabled)}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-stone-100 transition-transform ${monitorsEnabled ? 'translate-x-4' : 'translate-x-0.5'}`}
            />
          </div>
          monitors
        </label>
      </div>
      {monitorsEnabled && (
        <div className="flex-1 flex gap-4 p-8 overflow-auto">
          {Array(4)
            .fill('monitor-layer')
            .map((_, i) => (
              <OutputMonitor shader={shader} layer={i} key={i} />
            ))}
        </div>
      )}
    </div>
  )
}
