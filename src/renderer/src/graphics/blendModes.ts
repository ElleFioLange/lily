import { CSSProperties } from 'react'
import { BlendMode } from '@renderer/stores/useGraphicsStore'

/**
 * Blend modes offered in the mixer. Values are canvas `globalCompositeOperation` names (what the
 * Compositor uses for graphics sources); editor overlays translate them with `cssBlendMode`.
 */
export const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'source-over', label: 'normal' },
  { value: 'lighter', label: 'add' },
  { value: 'multiply', label: 'multiply' },
  { value: 'screen', label: 'screen' },
  { value: 'overlay', label: 'overlay' },
  { value: 'darken', label: 'darken' },
  { value: 'lighten', label: 'lighten' },
  { value: 'color-dodge', label: 'color dodge' },
  { value: 'color-burn', label: 'color burn' },
  { value: 'hard-light', label: 'hard light' },
  { value: 'soft-light', label: 'soft light' },
  { value: 'difference', label: 'difference' },
  { value: 'exclusion', label: 'exclusion' },
  { value: 'hue', label: 'hue' },
  { value: 'saturation', label: 'saturation' },
  { value: 'color', label: 'color' },
  { value: 'luminosity', label: 'luminosity' }
]

/** Canvas composite operation → CSS `mix-blend-mode` (the names differ for normal and add). */
export function cssBlendMode(mode: BlendMode): CSSProperties['mixBlendMode'] {
  switch (mode) {
    case 'source-over':
      return 'normal'
    case 'lighter':
      return 'plus-lighter'
    default:
      return mode as CSSProperties['mixBlendMode']
  }
}
