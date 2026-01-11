/**
 * CompositorSource represents a canvas that can be blended into the compositor output
 */
export interface CompositorSource {
  id: string
  canvas: HTMLCanvasElement | OffscreenCanvas
  alpha: number // 0-1 opacity
  zIndex: number // Layer order (lower = behind)
  blendMode: GlobalCompositeOperation
  enabled: boolean
}

/**
 * Compositor blends multiple canvas sources into a single output canvas.
 * Uses the target window's requestAnimationFrame for proper timing when
 * rendering to a child window.
 */
export class Compositor {
  private sources: Map<string, CompositorSource> = new Map()
  private outputCanvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private targetWindow: Window
  private animationFrameId: number | null = null
  private isRunning: boolean = false

  constructor(outputCanvas: HTMLCanvasElement, targetWindow: Window) {
    this.outputCanvas = outputCanvas
    this.targetWindow = targetWindow

    const ctx = outputCanvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get 2D context from output canvas')
    }
    this.ctx = ctx
  }

  /**
   * Add a canvas source to the compositor
   */
  addSource(source: CompositorSource): void {
    this.sources.set(source.id, source)
  }

  /**
   * Remove a source by ID
   */
  removeSource(id: string): void {
    this.sources.delete(id)
  }

  /**
   * Update properties of an existing source
   */
  updateSource(id: string, updates: Partial<Omit<CompositorSource, 'id'>>): void {
    const source = this.sources.get(id)
    if (source) {
      this.sources.set(id, { ...source, ...updates })
    }
  }

  /**
   * Set the alpha (opacity) of a source
   */
  setSourceAlpha(id: string, alpha: number): void {
    this.updateSource(id, { alpha: Math.max(0, Math.min(1, alpha)) })
  }

  /**
   * Enable or disable a source
   */
  setSourceEnabled(id: string, enabled: boolean): void {
    this.updateSource(id, { enabled })
  }

  /**
   * Set the z-index (layer order) of a source
   */
  setSourceZIndex(id: string, zIndex: number): void {
    this.updateSource(id, { zIndex })
  }

  /**
   * Render a single frame - composites all enabled sources
   */
  private render(): void {
    const { ctx, outputCanvas } = this

    // Clear output
    ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height)

    // Sort sources by z-index (lower = drawn first = behind)
    const sortedSources = Array.from(this.sources.values())
      .filter((s) => s.enabled && s.alpha > 0)
      .sort((a, b) => a.zIndex - b.zIndex)

    // Composite each source
    for (const source of sortedSources) {
      ctx.save()
      ctx.globalAlpha = source.alpha
      ctx.globalCompositeOperation = source.blendMode

      try {
        // Draw the source canvas scaled to fill the output
        ctx.drawImage(source.canvas, 0, 0, outputCanvas.width, outputCanvas.height)
      } catch (e) {
        // Canvas might not be ready or could be tainted
        console.warn(`Compositor: Failed to draw source ${source.id}:`, e)
      }

      ctx.restore()
    }
  }

  /**
   * Start the render loop using the target window's RAF
   */
  startRenderLoop(): void {
    if (this.isRunning) return
    this.isRunning = true

    const loop = (): void => {
      if (!this.isRunning) return

      this.render()

      // Use target window's RAF for proper timing
      this.animationFrameId = this.targetWindow.requestAnimationFrame(loop)
    }

    loop()
  }

  /**
   * Stop the render loop
   */
  stopRenderLoop(): void {
    this.isRunning = false
    if (this.animationFrameId !== null) {
      this.targetWindow.cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  /**
   * Get all current sources
   */
  getSources(): CompositorSource[] {
    return Array.from(this.sources.values())
  }

  /**
   * Get a specific source by ID
   */
  getSource(id: string): CompositorSource | undefined {
    return this.sources.get(id)
  }

  /**
   * Clean up and stop rendering
   */
  destroy(): void {
    this.stopRenderLoop()
    this.sources.clear()
  }
}
