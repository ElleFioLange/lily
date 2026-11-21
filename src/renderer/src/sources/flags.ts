/**
 * Poiesis (the poetic text layer whose keywords trigger shader effects) is optional.
 * It is on by default; build or run with `VITE_LILY_POIESIS=false` to leave it out.
 * When off, its code is never imported, so nothing from it loads. To remove it for
 * good, delete `sources/poiesis/` and the Poiesis block in `sources/index.ts`.
 */
export const POIESIS_ENABLED = import.meta.env.VITE_LILY_POIESIS !== 'false'
