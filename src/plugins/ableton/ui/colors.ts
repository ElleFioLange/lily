import { CSSProperties } from 'react'

// Pick a readable text color (stone-900 / stone-100) for a given background hex.
export function textColorFor(hex?: string | null): string {
  if (!hex) return '#f5f5f4' // stone-100
  const c = hex.replace('#', '')
  if (c.length < 6) return '#f5f5f4'
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  // Perceived luminance (ITU-R BT.601)
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  return lum > 150 ? '#1c1917' : '#f5f5f4'
}

const FALLBACK_BG = '#44403c' // stone-700

// Background + contrast-checked foreground for a colored block.
export function colorStyle(hex?: string | null): CSSProperties {
  const bg = hex ?? FALLBACK_BG
  return { backgroundColor: bg, color: textColorFor(bg) }
}
