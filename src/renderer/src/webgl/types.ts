import type { AudioReactivityConfig } from '../stores/useConfigurationStore'

/**
 * Per-keyword shader instance data
 * Each keyword with audio_reactivity gets its own shader instance
 */
export interface KeywordShaderInstance {
  keyword: string
  canvas: HTMLCanvasElement
  framebuffer: WebGLFramebuffer
  renderTexture: WebGLTexture
  textTexture: WebGLTexture
  program: WebGLProgram
  audioChannel: number
  effectName: string
  blendMode: string
  beatDetection: boolean
}

/**
 * Configuration for creating a keyword shader
 */
export interface CreateShaderConfig extends AudioReactivityConfig {
  keyword: string
  canvas: HTMLCanvasElement
  textContent: string
}
