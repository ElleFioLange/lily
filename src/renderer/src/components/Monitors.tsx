import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActiveSource } from '@renderer/sources/types'
import { HydraState } from '@renderer/sources/hydra/store'
import Header from './common/Header'
import MonitorSection, { Tile } from './common/MonitorSection'
import CanvasMirror from './common/CanvasMirror'
import ProgramMonitor from './ProgramMonitor'

// Section label (16px) + gap (4px) + caption (14px) + gap (2px)
const TILE_CHROME = 36
// Matches gap-6 between sections and gap-2 between tiles
const SECTION_GAP = 24
const TILE_GAP = 8

function LayerThumb({ instance }: { instance: ActiveSource<HydraState> }) {
  const canvas = instance.useStore((state) => state.canvas)
  const setFocused = useSourcesStore((state) => state.setFocused)
  return (
    <Tile caption={instance.name}>
      <CanvasMirror
        source={canvas}
        title={`Show ${instance.name}`}
        onClick={() => setFocused(instance.instanceId)}
      />
    </Tile>
  )
}

/**
 * Bottom panel, left to right: the focused patch's outputs (o0–o3), the other Hydra
 * layers (click one to switch to it), and the program output sent to the performance window.
 */
export default function Monitors() {
  const { focused, active } = useSourcesStore()
  const instance = focused !== null ? active[focused] : undefined
  const otherLayers = Object.values(active).filter(
    (source) => source.manifest.id === 'hydra' && source.instanceId !== focused
  ) as ActiveSource<HydraState>[]

  // Size tiles so every monitor fits the panel: as tall as the panel allows, but narrow
  // enough that all tiles fit across its width
  const bodyRef = useRef<HTMLDivElement>(null)
  const [tileHeight, setTileHeight] = useState(0)
  const measure = useCallback(() => {
    const body = bodyRef.current
    if (!body) return
    const tiles = body.querySelectorAll('[data-tile]').length
    const sections = body.querySelectorAll('[data-monitor-section]').length
    const style = getComputedStyle(body)
    const width =
      body.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight) -
      SECTION_GAP * Math.max(0, sections - 1) -
      TILE_GAP * Math.max(0, tiles - sections)
    const height =
      body.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
    const fitHeight = height - TILE_CHROME
    const fitWidth = tiles > 0 ? ((width / tiles) * 9) / 16 : fitHeight
    const next = Math.max(24, Math.floor(Math.min(fitHeight, fitWidth)))
    setTileHeight((prev) => (prev === next ? prev : next))
  }, [])
  useEffect(() => {
    if (!bodyRef.current) return
    const resize = new ResizeObserver(measure)
    resize.observe(bodyRef.current)
    // Re-measure when tiles come and go (layers added or closed, monitor toggled)
    const mutation = new MutationObserver(measure)
    mutation.observe(bodyRef.current, { childList: true, subtree: true })
    return () => {
      resize.disconnect()
      mutation.disconnect()
    }
  }, [measure])

  return (
    <div className="flex flex-col h-full">
      <Header title="MONITORS" />
      <div
        ref={bodyRef}
        className="flex-1 min-h-0 flex gap-6 px-4 py-2 overflow-x-auto overflow-y-hidden no-scrollbar"
        style={{ '--tile-h': `${tileHeight}px` } as React.CSSProperties}
      >
        {instance?.Monitor ? <instance.Monitor instanceId={instance.instanceId} /> : null}
        {otherLayers.length > 0 && (
          <MonitorSection title="other layers">
            {otherLayers.map((layer) => (
              <LayerThumb key={layer.instanceId} instance={layer} />
            ))}
          </MonitorSection>
        )}
        <MonitorSection title="program">
          <ProgramMonitor />
        </MonitorSection>
      </div>
    </div>
  )
}
