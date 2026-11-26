import { ReactNode } from 'react'

type MonitorSectionProps = {
  title: ReactNode
  /** The focused patch's own outputs: set apart from the other layers on a lighter panel */
  current?: boolean
  children?: ReactNode
}

/** A labeled row of monitor tiles in the bottom panel. */
export default function MonitorSection({ title, current = false, children }: MonitorSectionProps) {
  return (
    <div
      data-monitor-section
      className={`shrink-0 flex flex-col gap-1 ${current ? 'bg-stone-800/70 border border-stone-600 rounded-sm px-2 py-1' : ''}`}
    >
      <div
        className={`h-4 text-xs flex items-center gap-2 select-none ${current ? 'text-stone-200' : 'text-stone-400'}`}
      >
        {title}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  )
}

/**
 * Shared tile styling: 16:9 at the height the Monitors panel sets in --tile-h, so tiles
 * grow and shrink with the panel.
 */
export const TILE_CLASS = 'block h-(--tile-h) w-[calc(var(--tile-h)*16/9)] shrink-0 bg-black'

/** A tile with a small caption under it. */
export function Tile({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div data-tile className="shrink-0 flex flex-col gap-0.5">
      {children}
      <span className="h-3.5 text-[10px] leading-3.5 text-stone-500 truncate w-[calc(var(--tile-h)*16/9)]">
        {caption}
      </span>
    </div>
  )
}
