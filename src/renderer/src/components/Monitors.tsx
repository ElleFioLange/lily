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
// py-2 and px-4 around the rows and the program monitor
const PADDING_Y = 16
const PADDING_X = 32
// The program monitor always gets at least this share of the panel's width
const PROGRAM_MIN_SHARE = 0.35

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

  // Both rows use one tile size, as tall as half the panel allows. The patch's four outputs
  // always fit across, and the program monitor on the right takes the width that's left, up to
  // the full panel height (and never under PROGRAM_MIN_SHARE of the width).
  const panelRef = useRef<HTMLDivElement>(null)
  const [tileHeight, setTileHeight] = useState(0)
  const [programHeight, setProgramHeight] = useState(0)
  const measure = useCallback(() => {
    const panel = panelRef.current
    if (!panel) return
    const { clientWidth: width, clientHeight: height } = panel

    const rowsHeight = height - PADDING_Y - 2 * GAP - DIVIDER - SCROLLBAR
    const tileFit = rowsHeight / 2 - TILE_CAPTION
    const rowsWidth = (tileFit * 16 * PATCH_TILES) / 9 + GAP * (PATCH_TILES - 1) + PADDING_X

    const programFit = height - PADDING_Y - TILE_CAPTION
    const programChrome = PADDING_X + 1 // padding and the left border
    const programWidth = Math.min(
      (programFit * 16) / 9 + programChrome,
      Math.max(width * PROGRAM_MIN_SHARE, width - rowsWidth)
    )
    const program = Math.max(24, Math.floor(((programWidth - programChrome) * 9) / 16))
    setProgramHeight((prev) => (prev === program ? prev : program))

    const tileWidth = (width - programWidth - PADDING_X - GAP * (PATCH_TILES - 1)) / PATCH_TILES
    const next = Math.max(24, Math.floor(Math.min(tileFit, (tileWidth * 9) / 16)))
    setTileHeight((prev) => (prev === next ? prev : next))
  }, [])
  useEffect(() => {
    if (!panelRef.current) return
    const resize = new ResizeObserver(measure)
    resize.observe(panelRef.current)
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
