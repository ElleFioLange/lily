// @ts-nocheck
/**
 * AudioBufferProcessor - AudioWorklet processor for multi-channel audio
 *
 * Receives interleaved 16-channel audio buffers from main process via IPC,
 * de-interleaves them into separate channels, and outputs to Web Audio graph.
 *
 * This runs in the AudioWorklet thread (separate from main thread) for
 * low-latency audio processing.
 */

class AudioBufferProcessor extends AudioWorkletProcessor {
  private bufferQueue: Float32Array[] = []
  private channelCount = 16
  private expectedBufferSize = 512

  constructor() {
    super()

    // Listen for audio buffers from main thread
    this.port.onmessage = (event: MessageEvent) => {
      const { type, buffer } = event.data

      if (type === 'audio-buffer') {
        // Queue the interleaved buffer
        this.bufferQueue.push(new Float32Array(buffer))
        console.log(buffer)

        // Prevent memory buildup - limit queue to 10 buffers
        if (this.bufferQueue.length > 10) {
          console.warn('AudioBufferProcessor: Buffer queue overflow, dropping oldest buffer')
          this.bufferQueue.shift()
        }
      }
    }
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {
    // Get next buffer from queue
    const interleavedBuffer = this.bufferQueue.shift()

    if (!interleavedBuffer) {
      // No buffer available - output silence
      for (let channel = 0; channel < this.channelCount; channel++) {
        outputs[0][channel].fill(0)
      }
      return true // Keep processor alive
    }

    // Verify buffer size
    const expectedLength = this.expectedBufferSize * this.channelCount
    if (interleavedBuffer.length !== expectedLength) {
      console.error(
        `AudioBufferProcessor: Unexpected buffer size ${interleavedBuffer.length}, expected ${expectedLength}`
      )
      return true
    }

    // De-interleave: [L0 R0 L1 R1 ...] → [[L0 L1 ...], [R0 R1 ...]]
    const samplesPerChannel = this.expectedBufferSize
    for (let channel = 0; channel < this.channelCount; channel++) {
      const output = outputs[0][channel]
      for (let i = 0; i < samplesPerChannel; i++) {
        output[i] = interleavedBuffer[i * this.channelCount + channel]
      }
    }

    return true // Keep processor alive
  }
}

registerProcessor('audio-buffer-processor', AudioBufferProcessor)
