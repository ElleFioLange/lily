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

export interface CompositorOutput {
  id: string
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  window: Window
  animationFrameId: number | null
}

/**
 * Compositor blends multiple canvas sources into a single output canvas.
 * Uses the target window's requestAnimationFrame for proper timing when
 * rendering to a child window.
 */
export class Compositor {
  private sources: Map<string, CompositorSource> = new Map()
  private outputs: Map<string, CompositorOutput> = new Map()
  private runningTracker: Map<string, boolean> = new Map()

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

  addOutput(output: Omit<CompositorOutput, 'ctx' | 'animationFrameId'>): void {
    const { id, canvas } = output
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Unable to get rendering context for provided output')
    this.outputs.set(id, { ...output, ctx, animationFrameId: null })
  }

  removeOutput(id: string): void {
    this.outputs.delete(id)
  }

  /**
   * Render a single frame - composites all enabled sources
   */
  private render(): void {
    if (this.outputs.size === 0) return

    // Sort sources by z-index (lower = drawn first = behind)
    const sortedSources = Array.from(this.sources.values())
      .filter((s) => s.enabled && s.alpha > 0)
      .sort((a, b) => a.zIndex - b.zIndex)

    const outputsArray = Array.from(this.outputs.values())
    for (const { canvas, ctx } of outputsArray) {
      // Clear output
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      // Composite each source
      for (const source of sortedSources) {
        ctx.globalAlpha = source.alpha
        ctx.globalCompositeOperation = source.blendMode

        try {
          // Draw the source canvas scaled to fill the output
          ctx.drawImage(source.canvas, 0, 0, canvas.width, canvas.height)
        } catch (e) {
          // Canvas might not be ready or could be tainted
          console.warn(`Compositor: Failed to draw source ${source.id}:`, e)
        }

        ctx.restore()
      }
    }
  }

  /**
   * Start the render loop using the target window's RAF
   */
  startRenderLoop(outputId: string): void {
    const output = this.outputs.get(outputId)
    if (output === undefined) throw new Error('No output found with id ' + outputId)

    if (this.runningTracker.get(outputId)) return
    this.runningTracker.set(outputId, true)

    const loop = (): void => {
      if (!this.runningTracker.get(outputId) || !output?.window) return

      this.render()

      // Use target window's RAF for proper timing
      output.animationFrameId = output.window.requestAnimationFrame(loop)
    }

    loop()
  }

  /**
   * Stop the render loop
   */
  stopRenderLoop(outputId: string): void {
    const output = this.outputs.get(outputId)
    if (output === undefined) throw new Error('No output found with id ' + outputId)
    this.runningTracker.set(outputId, false)
    if (output.animationFrameId !== null) {
      output.window?.cancelAnimationFrame(output.animationFrameId)
      output.animationFrameId = null
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
   * Get all current outputs
   */
  getOutputs(): CompositorOutput[] {
    return Array.from(this.outputs.values())
  }

  /**
   * Get a specific output by ID
   */
  getOutput(id: string): CompositorOutput | undefined {
    return this.outputs.get(id)
  }

  /**
   * Clean up and stop rendering
   */
  destroy(): void {
    this.outputs.entries().forEach(([outputId]) => {
      this.stopRenderLoop(outputId)
    })
    this.outputs.clear()
    this.sources.clear()
  }
}
