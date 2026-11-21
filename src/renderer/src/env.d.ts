/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to "false" to build Lily without the Poiesis text layer. */
  readonly VITE_LILY_POIESIS?: string
}
