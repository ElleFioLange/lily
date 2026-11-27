import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { ActiveSource } from '@renderer/sources/types'
import { releaseContext } from '@renderer/utils/webgl'
import { HydraState } from './store'

/**
 * Parks a closed layer's Hydra and frees its WebGL contexts (its output and its monitor) straight away, so closed
 * layers don't count toward Chromium's limit and push out the contexts of open ones. The
 * compositor source is removed by useSourcesStore.unloadSource.
 */
export default function cleanup(instanceId: string): void {
  const layer = useSourcesStore.getState().active[instanceId] as
    | ActiveSource<HydraState>
    | undefined
  if (!layer) return
  const { hydra, canvas, monitorCanvas, setMonitorHydra, setMonitorCanvas } =
    layer.useStore.getState()
  // Hydra can't stop its own frame loop, so park it before its context goes: stop reading audio
  // and set a frame rate so low that it never draws again.
  if (hydra) {
    ;(hydra as unknown as { detectAudio: boolean }).detectAudio = false
    hydra.synth.fps = Number.MIN_VALUE
  }
  releaseContext(monitorCanvas)
  releaseContext(canvas)
  setMonitorHydra(null)
  setMonitorCanvas(null)
}
