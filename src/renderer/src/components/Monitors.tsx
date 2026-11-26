import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActiveSource } from '@renderer/sources/types'
import { HydraState } from '@renderer/sources/hydra/store'
import Header from './common/Header'
import { TILE_CAPTION, Tile } from './common/MonitorTile'
import CanvasMirror from './common/CanvasMirror'
import ProgramMonitor from './ProgramMonitor'

// gap-2 between tiles, and between each row and the divider
const GAP = 8
// The divider line between the two rows
const DIVIDER = 1
// Room for the other layers' thin horizontal scrollbar
const SCROLLBAR = 6
// The focused patch's o0, o1, o2, o3 always fit across
const PATCH_TILES = 4
// Vertical padding (py-2) around the program monitor
const PROGRAM_PADDING_Y = 16
// The program monitor never takes more than this share of the panel's width
const PROGRAM_MAX_SHARE = 0.4

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
 * Bottom panel. On the left, two rows: the focused patch's outputs (o0–o3) on top and, under a
 * divider, the other Hydra layers in a row that scrolls sideways (click one to switch to it).
 * On the right, a larger program monitor of what the performance window shows.
 */
export default function Monitors() {
  const { focused, active } = useSourcesStore()
  const instance = focused !== null ? active[focused] : undefined
  const otherLayers = Object.values(active).filter(
    (source) => source.manifest.id === 'hydra' && source.instanceId !== focused
  ) as ActiveSource<HydraState>[]

  // Both rows use one tile size: half the panel's height each, and narrow enough that the
  // patch's four outputs fit across. The program monitor takes the full panel height on the
  // right, up to PROGRAM_MAX_SHARE of the width.
  const panelRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [tileHeight, setTileHeight] = useState(0)
  const [programHeight, setProgramHeight] = useState(0)
  const measure = useCallback(() => {
    const panel = panelRef.current
    const body = bodyRef.current
    if (!panel || !body) return
    const px = (value: string) => parseFloat(value) || 0

    const programFit = Math.min(
      panel.clientHeight - PROGRAM_PADDING_Y - TILE_CAPTION,
      (panel.clientWidth * PROGRAM_MAX_SHARE * 9) / 16
    )
    const program = Math.max(24, Math.floor(programFit))
    setProgramHeight((prev) => (prev === program ? prev : program))

    const style = getComputedStyle(body)
    const width = body.clientWidth - px(style.paddingLeft) - px(style.paddingRight)
    const height = body.clientHeight - px(style.paddingTop) - px(style.paddingBottom)
    const rowsHeight = height - 2 * GAP - DIVIDER - SCROLLBAR
    const fitHeight = rowsHeight / 2 - TILE_CAPTION
    const fitWidth = (((width - GAP * (PATCH_TILES - 1)) / PATCH_TILES) * 9) / 16
    const next = Math.max(24, Math.floor(Math.min(fitHeight, fitWidth)))
    setTileHeight((prev) => (prev === next ? prev : next))
  }, [])
  useEffect(() => {
    if (!bodyRef.current || !panelRef.current) return
    const resize = new ResizeObserver(measure)
    resize.observe(panelRef.current)
    resize.observe(bodyRef.current)
    return () => resize.disconnect()
  }, [measure])

  // A plain mouse wheel scrolls the other layers sideways
  const scrollSideways = (event: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      event.currentTarget.scrollLeft += event.deltaY
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="MONITORS" />
      <div ref={panelRef} className="flex-1 min-h-0 flex">
        <div
          ref={bodyRef}
          className="flex-1 min-w-0 flex flex-col gap-2 px-4 py-2 overflow-hidden"
          style={{ '--tile-h': `${tileHeight}px` } as React.CSSProperties}
        >
          <div className="shrink-0" aria-label="This patch's outputs">
            {instance?.Monitor ? <instance.Monitor instanceId={instance.instanceId} /> : null}
          </div>
          <div className="h-px shrink-0 bg-stone-700" aria-hidden="true" />
          <div
            className="shrink-0 flex gap-2 overflow-x-auto overflow-y-hidden [scrollbar-width:thin] [scrollbar-color:var(--color-stone-700)_transparent]"
            style={{ paddingBottom: SCROLLBAR }}
            onWheel={scrollSideways}
            aria-label="Other layers"
          >
            {otherLayers.map((layer) => (
              <LayerThumb key={layer.instanceId} instance={layer} />
            ))}
          </div>
        </div>
        <div
          className="shrink-0 border-l border-stone-700 bg-stone-900/60 px-4 py-2"
          style={{ '--tile-h': `${programHeight}px` } as React.CSSProperties}
        >
          <ProgramMonitor />
        </div>
      </div>
    </div>
  )
}
