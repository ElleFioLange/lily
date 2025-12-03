import type { AudioManager } from '../audio/AudioManager'
import type { AudioReactivityConfig } from '../stores/useConfigurationStore'
import type { KeywordShaderInstance } from './types'
import { ShaderCompiler } from './ShaderCompiler'
import { EFFECT_PRESETS } from './effectPresets'

/**
 * Manages WebGL shader instances for keywords with audio reactivity
 * Uses a single shared WebGL2 context for scalability
 * Renders each keyword to a separate framebuffer, then copies to individual canvases
 */
export class KeywordShaderManager {
  private gl: WebGL2RenderingContext
  private offscreenCanvas: HTMLCanvasElement
  private instances: Map<string, KeywordShaderInstance> = new Map()
  private audioManager: AudioManager
  private vertexBuffer: WebGLBuffer | null = null
  private animationFrameId: number | null = null

  constructor(audioManager: AudioManager) {
    this.audioManager = audioManager

    // Create single offscreen canvas for shared WebGL context
    this.offscreenCanvas = document.createElement('canvas')
    this.offscreenCanvas.width = 2048
    this.offscreenCanvas.height = 2048

    const gl = this.offscreenCanvas.getContext('webgl2')
    if (!gl) {
      throw new Error('WebGL2 not supported')
    }
    this.gl = gl

    // Create fullscreen quad vertex buffer (shared by all shaders)
    this.vertexBuffer = this.createQuadBuffer()

    console.log('KeywordShaderManager initialized with shared WebGL2 context')
  }

  /**
   * Create a shader instance for a keyword
   * @param keyword - Keyword name
   * @param canvas - Canvas element to render to
   * @param config - Audio reactivity configuration
   * @param textContent - Text content to render as texture
   */
  createKeywordShader(
    keyword: string,
    canvas: HTMLCanvasElement,
    config: AudioReactivityConfig,
    textContent: string
  ): void {
    const { gl } = this

    // Get effect preset
    const preset = EFFECT_PRESETS.get(config.visualEffect)
    if (!preset) {
      console.error(`Unknown effect: ${config.visualEffect}`)
      return
    }

    try {
      // Compile shader program
      const program = ShaderCompiler.compile(gl, preset.vertexShader, preset.fragmentShader)

      // Create framebuffer for this keyword
      const framebuffer = gl.createFramebuffer()
      if (!framebuffer) {
        throw new Error('Failed to create framebuffer')
      }

      // Create render texture
      const renderTexture = gl.createTexture()
      if (!renderTexture) {
        throw new Error('Failed to create render texture')
      }

      gl.bindTexture(gl.TEXTURE_2D, renderTexture)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        canvas.width,
        canvas.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      )
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

      // Attach texture to framebuffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTexture, 0)

      // Check framebuffer status
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error(`Framebuffer incomplete: ${status}`)
      }

      // Unbind framebuffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)

      // Create text texture
      const textTexture = this.createTextTexture(textContent)

      // Store instance
      this.instances.set(keyword, {
        keyword,
        canvas,
        framebuffer,
        renderTexture,
        textTexture,
        program,
        audioChannel: config.audioChannel,
        effectName: config.visualEffect,
        blendMode: preset.blendMode,
        beatDetection: config.beatDetection ?? false
      })

      // Set canvas blend mode
      canvas.style.mixBlendMode = preset.blendMode

      console.log(
        `Created shader instance for keyword '${keyword}' with effect '${config.visualEffect}'`
      )
    } catch (err) {
      console.error(`Failed to create shader for keyword '${keyword}':`, err)
    }
  }

  /**
   * Render all keyword shader instances
   * Called once per animation frame
   */
  render(): void {
    const { gl } = this

    for (const [keyword, instance] of this.instances) {
      try {
        // 1. Bind framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, instance.framebuffer)
        gl.viewport(0, 0, instance.canvas.width, instance.canvas.height)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)

        // 2. Use shader program
        gl.useProgram(instance.program)

        // TODO stop shader calculations when keyword is no longer present
        // TODO figure out a way not to calculate shaders that are offscreen (is this already done automatically?)
        // 3. Get audio features
        const features = this.audioManager.getChannelFeatures(instance.audioChannel)

        // 4. Bind uniforms
        this.bindUniforms(instance.program, features, instance.textTexture)

        // 5. Draw quad
        this.drawQuad()

        // 6. Copy framebuffer to canvas
        this.copyToCanvas(instance.framebuffer, instance.canvas)
      } catch (err) {
        console.error(`Error rendering keyword '${keyword}':`, err)
      }
    }

    // Unbind framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  /**
   * Bind shader uniforms
   * @param program - Shader program
   * @param features - Audio features
   * @param textTexture - Text texture
   */
  private bindUniforms(
    program: WebGLProgram,
    features: { amplitude: number; bass: number; mid: number; high: number; beat: boolean },
    textTexture: WebGLTexture
  ): void {
    const { gl } = this

    // Time
    const loc_time = gl.getUniformLocation(program, 'u_time')
    if (loc_time) {
      gl.uniform1f(loc_time, performance.now() / 1000)
    }

    // Audio features
    const loc_amplitude = gl.getUniformLocation(program, 'u_amplitude')
    if (loc_amplitude) {
      gl.uniform1f(loc_amplitude, features.amplitude)
    }

    const loc_bass = gl.getUniformLocation(program, 'u_bass')
    if (loc_bass) {
      gl.uniform1f(loc_bass, features.bass)
    }

    const loc_mid = gl.getUniformLocation(program, 'u_mid')
    if (loc_mid) {
      gl.uniform1f(loc_mid, features.mid)
    }

    const loc_high = gl.getUniformLocation(program, 'u_high')
    if (loc_high) {
      gl.uniform1f(loc_high, features.high)
    }

    const loc_beat = gl.getUniformLocation(program, 'u_beat')
    if (loc_beat) {
      gl.uniform1f(loc_beat, features.beat ? 1.0 : 0.0)
    }

    // Text texture
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, textTexture)
    const loc_textTexture = gl.getUniformLocation(program, 'u_textTexture')
    if (loc_textTexture) {
      gl.uniform1i(loc_textTexture, 0)
    }

    // Resolution
    const loc_resolution = gl.getUniformLocation(program, 'u_resolution')
    if (loc_resolution) {
      gl.uniform2f(loc_resolution, gl.drawingBufferWidth, gl.drawingBufferHeight)
    }
  }

  /**
   * Copy framebuffer contents to destination canvas
   * @param framebuffer - Source framebuffer
   * @param destCanvas - Destination canvas
   */
  private copyToCanvas(framebuffer: WebGLFramebuffer, destCanvas: HTMLCanvasElement): void {
    const destCtx = destCanvas.getContext('2d')
    if (!destCtx) return

    const { gl } = this

    // Read pixels from framebuffer
    const pixels = new Uint8Array(destCanvas.width * destCanvas.height * 4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.readPixels(0, 0, destCanvas.width, destCanvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

    // Create ImageData and flip vertically (WebGL has origin bottom-left)
    const imageData = new ImageData(destCanvas.width, destCanvas.height)
    for (let y = 0; y < destCanvas.height; y++) {
      for (let x = 0; x < destCanvas.width; x++) {
        const srcIdx = (y * destCanvas.width + x) * 4
        const dstIdx = ((destCanvas.height - 1 - y) * destCanvas.width + x) * 4
        imageData.data[dstIdx] = pixels[srcIdx]
        imageData.data[dstIdx + 1] = pixels[srcIdx + 1]
        imageData.data[dstIdx + 2] = pixels[srcIdx + 2]
        imageData.data[dstIdx + 3] = pixels[srcIdx + 3]
      }
    }

    destCtx.putImageData(imageData, 0, 0)
  }

  /**
   * Create text texture from keyword text
   * Measures text properly and handles vertical flip for WebGL
   * @param text - Text content
   * @returns WebGL texture
   */
  private createTextTexture(text: string): WebGLTexture {
    const { gl } = this

    // Create temporary canvas to measure text
    const measureCanvas = document.createElement('canvas')
    const measureCtx = measureCanvas.getContext('2d')!

    // Set font to match keyword styling (font-weight: 600, Monaspace Krypton)
    measureCtx.font = '600 48px Monaspace Krypton, monospace'

    // Measure actual text bounds
    const metrics = measureCtx.measureText(text)
    const textWidth = metrics.width
    const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || 48 // Fallback to font size

    // Add padding for effects (20% on each side)
    const paddingX = 0
    // textWidth * 0.2
    const paddingY = 0
    textHeight * 0.2

    const canvasWidth = Math.ceil(textWidth + paddingX * 2)
    const canvasHeight = Math.ceil(textHeight + paddingY * 2)

    // Create properly sized canvas
    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    const ctx = canvas.getContext('2d')!

    // Clear and set font (must re-set after canvas resize)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.font = '600 48px Monaspace Krypton, monospace'
    ctx.fillStyle = 'white'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    // Render text with padding
    // Note: We render normally here; vertical flip happens in shader UVs
    ctx.fillText(text, paddingX, paddingY)

    // Create a flipped version for WebGL (flip vertically)
    const flippedCanvas = document.createElement('canvas')
    flippedCanvas.width = canvas.width
    flippedCanvas.height = canvas.height
    const flippedCtx = flippedCanvas.getContext('2d')!

    // Flip vertically
    flippedCtx.translate(0, canvas.height)
    flippedCtx.scale(1, -1)
    flippedCtx.drawImage(canvas, 0, 0)

    // Upload flipped version to WebGL
    const texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, flippedCanvas)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    return texture
  }

  /**
   * Create fullscreen quad vertex buffer
   * @returns Vertex buffer
   */
  private createQuadBuffer(): WebGLBuffer {
    const { gl } = this

    const vertices = new Float32Array([
      -1,
      -1, // Bottom-left
      1,
      -1, // Bottom-right
      -1,
      1, // Top-left
      1,
      1 // Top-right
    ])

    const buffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    return buffer
  }

  /**
   * Draw fullscreen quad
   */
  private drawQuad(): void {
    const { gl } = this

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  /**
   * Start render loop
   */
  startRenderLoop(): void {
    const loop = () => {
      this.render()
      this.animationFrameId = requestAnimationFrame(loop)
    }
    loop()
    console.log('Shader render loop started')
  }

  /**
   * Stop render loop
   */
  stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  /**
   * Clean up WebGL resources
   */
  destroy(): void {
    this.stopRenderLoop()

    // Delete all instances
    for (const [, instance] of this.instances) {
      this.gl.deleteFramebuffer(instance.framebuffer)
      this.gl.deleteTexture(instance.renderTexture)
      this.gl.deleteTexture(instance.textTexture)
      this.gl.deleteProgram(instance.program)
    }

    this.instances.clear()

    // Delete vertex buffer
    if (this.vertexBuffer) {
      this.gl.deleteBuffer(this.vertexBuffer)
    }

    // Lose WebGL context
    const loseContext = this.gl.getExtension('WEBGL_lose_context')
    if (loseContext) {
      loseContext.loseContext()
    }

    console.log('KeywordShaderManager destroyed')
  }

  /**
   * Get number of active shader instances
   */
  getInstanceCount(): number {
    return this.instances.size
  }

  /**
   * Remove a specific keyword shader
   * @param keyword - Keyword to remove
   */
  removeKeywordShader(keyword: string): void {
    const instance = this.instances.get(keyword)
    if (instance) {
      this.gl.deleteFramebuffer(instance.framebuffer)
      this.gl.deleteTexture(instance.renderTexture)
      this.gl.deleteTexture(instance.textTexture)
      this.gl.deleteProgram(instance.program)
      this.instances.delete(keyword)
      console.log(`Removed shader instance for keyword '${keyword}'`)
    }
  }

  /**
   * Clear all keyword shaders
   */
  clearAll(): void {
    const keywords = Array.from(this.instances.keys())
    keywords.forEach((keyword) => this.removeKeywordShader(keyword))
  }
}
