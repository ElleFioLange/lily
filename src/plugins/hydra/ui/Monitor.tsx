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
  const { shader } = instance.useStore()
  return (
    <div className="size-full flex gap-4 p-8 overflow-auto" {...props}>
      {Array(4)
        .fill('monitor-layer')
        .map((_, i) => (
          <OutputMonitor shader={shader} layer={i} key={i} />
        ))}
    </div>
  )
}
