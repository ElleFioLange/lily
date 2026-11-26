import { ReactNode } from 'react'

/** Small caption under each tile: o0–o3, a layer's name, or "program" */
const CAPTION_HEIGHT = 14
// gap-0.5 between a tile and its caption
const CAPTION_GAP = 2
/** Height a tile's caption adds under it */
export const TILE_CAPTION = CAPTION_HEIGHT + CAPTION_GAP

/**
 * Shared tile styling: 16:9 at the height the Monitors panel sets in --tile-h, so tiles
 * grow and shrink with the panel.
 */
export const TILE_CLASS = 'block h-(--tile-h) w-[calc(var(--tile-h)*16/9)] shrink-0 bg-black'

/** A row of monitor tiles in the bottom panel */
export function MonitorRow({ children }: { children?: ReactNode }) {
  return <div className="flex gap-2">{children}</div>
}

/** A tile with a small caption under it. */
export function Tile({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div data-tile className="shrink-0 flex flex-col gap-0.5">
      {children}
      <span
        className="text-[10px] text-stone-500 truncate w-[calc(var(--tile-h)*16/9)]"
        style={{ height: CAPTION_HEIGHT, lineHeight: `${CAPTION_HEIGHT}px` }}
      >
        {caption}
      </span>
    </div>
  )
}
