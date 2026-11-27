/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to "false" to build Lily without the Poiesis text layer. */
  readonly VITE_LILY_POIESIS?: string
}

declare module 'hydra-synth/src/glsl/glsl-functions.js' {
  const functions: () => {
    name: string
    type: string
    inputs: { name: string; type: string; default?: unknown }[]
    glsl: string
  }[]
  export default functions
}
