/**
 * Chromium keeps only 16 WebGL contexts alive and silently drops the oldest when one more is
 * made, which leaves that canvas blank. So every hidden Hydra instance is made once and kept,
 * contexts that are no longer needed are released straight away instead of whenever they're
 * garbage collected, and the shared hidden instances check for a lost context before use.
 */

/** True when the canvas has no WebGL context, or it has been lost. */
export function isContextLost(canvas: HTMLCanvasElement | null | undefined): boolean {
  const gl = canvas?.getContext('webgl')
  return !gl || gl.isContextLost()
}

/** Frees a canvas's WebGL context now. */
export function releaseContext(canvas: HTMLCanvasElement | null | undefined): void {
  const gl = canvas?.getContext('webgl')
  if (gl && !gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext()
}
