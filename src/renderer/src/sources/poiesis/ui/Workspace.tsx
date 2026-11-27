import { ActiveSource } from '@renderer/sources/types'
import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { PoiesisState } from '../store'
import { WorkspaceProps } from '@renderer/sources/types'
import PoiesisEditor from './components/poiesis/Editor'
import ConfigEditor from './components/config/Editor'
// import { useEffect, useRef } from 'react'
// import { useGraphicsStore } from '@renderer/stores/useGraphicsStore'

export default function PoiesisWorkspace({ instanceId, environment, ...props }: WorkspaceProps) {
  const { getInstance } = useSourcesStore()
  const instance = getInstance(instanceId) as ActiveSource<PoiesisState>
  const { openSurface } = instance.useStore()

  // const { addOutput } = useGraphicsStore()
  // const canvasRef = useRef<HTMLCanvasElement>(null)

  // useEffect(() => {
  //   const canvas = canvasRef.current
  //   if (!canvas) return

  //   const compositorOutput = {
  //     id: 'poiesis-workspace',
  //     window,
  //     canvas
  //   }

  //   addOutput(compositorOutput)
  // })

  if (!environment) return <div />

  return (
    <div className="size-full" {...props}>
      {/* <canvas className="size-full block absolute" ref={canvasRef} /> */}
      {openSurface === 'poiesis' ? (
        <PoiesisEditor instanceId={instanceId} environment={environment} />
      ) : (
        <ConfigEditor instanceId={instanceId} />
      )}
    </div>
  )
}
