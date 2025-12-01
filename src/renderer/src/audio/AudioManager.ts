import type { AudioFeatures, AudioChannel } from './types'

/**
 * AudioManager handles multi-channel audio capture and feature extraction
 * Captures up to 16 channels from BlackHole virtual audio device
 * Extracts amplitude, frequency bands, and optional beat detection per channel
 */
export class AudioManager {
  private context: AudioContext | null = null
  private channels: AudioChannel[] = []
  private source: MediaStreamAudioSourceNode | null = null
  private stream: MediaStream | null = null

  /**
   * Initialize audio system and capture from BlackHole 16ch
   * Auto-detects BlackHole device or falls back to system default
   */
  async initialize(): Promise<void> {
    try {
      // Enumerate audio devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices.filter((d) => d.kind === 'audioinput')

      console.log(
        'Available audio devices:',
        audioInputs.map((d) => d.label)
      )

      // Try to find BlackHole 16ch
      const blackHole = audioInputs.find(
        (d) => d.label.includes('BlackHole 16ch') || d.label.includes('BlackHole16ch')
      )

      if (blackHole) {
        console.log('Found BlackHole 16ch:', blackHole.label)
      } else {
        console.warn('BlackHole 16ch not found, using system default audio input')
      }

      // Request user media with 16 channels
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: blackHole ? { exact: blackHole.deviceId } : undefined,
          channelCount: 16,
          sampleRate: 48000,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      })

      // Create audio context
      this.context = new AudioContext({ sampleRate: 48000 })
      this.source = this.context.createMediaStreamSource(this.stream)

      // Check actual channel count
      const actualChannels = this.source.channelCount
      console.log(`Audio source has ${actualChannels} channel(s)`)

      // Split into individual channels
      const splitter = this.context.createChannelSplitter(16)
      this.source.connect(splitter)

      // Create analyser node for each channel
      for (let i = 0; i < 16; i++) {
        const analyser = this.context.createAnalyser()
        analyser.fftSize = 2048 // 1024 frequency bins
        analyser.smoothingTimeConstant = 0.8

        // Connect channel i from splitter to this analyser
        splitter.connect(analyser, i)

        this.channels.push({
          analyser,
          dataArray: new Float32Array(analyser.frequencyBinCount),
          lastBeatTime: 0,
          beatThreshold: 0.7
        })
      }

      console.log(`AudioManager initialized with ${this.channels.length} channels`)
    } catch (err) {
      console.error('Failed to initialize audio:', err)
      throw err
    }
  }

  /**
   * Get audio features for a specific channel
   * @param channelIndex - Channel index (0-15)
   * @returns Audio features (amplitude, bass, mid, high, beat)
   */
  getChannelFeatures(channelIndex: number): AudioFeatures {
    if (channelIndex < 0 || channelIndex >= this.channels.length) {
      console.warn(`Invalid channel index: ${channelIndex}`)
      return { amplitude: 0, bass: 0, mid: 0, high: 0, beat: false }
    }

    const channel = this.channels[channelIndex]
    const { analyser, dataArray } = channel

    // Get frequency data (dB scale)
    analyser.getFloatFrequencyData(dataArray)

    // Calculate amplitude (RMS)
    const amplitude = this.calculateAmplitude(dataArray)

    // Calculate frequency bands
    const bass = this.getFrequencyRange(dataArray, 20, 250)
    const mid = this.getFrequencyRange(dataArray, 250, 2000)
    const high = this.getFrequencyRange(dataArray, 2000, 8000)

    // Beat detection (optional, simple threshold-based)
    const beat = this.detectBeat(channel, amplitude)

    return { amplitude, bass, mid, high, beat }
  }

  /**
   * Calculate RMS amplitude from frequency data
   * @param dataArray - Frequency data in dB scale
   * @returns Normalized amplitude (0-1)
   */
  private calculateAmplitude(dataArray: Float32Array): number {
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      // Convert dB to linear scale
      const value = Math.pow(10, dataArray[i] / 20)
      sum += value * value
    }
    const rms = Math.sqrt(sum / dataArray.length)
    // Normalize and clamp to 0-1
    return Math.min(rms * 2, 1.0)
  }

  /**
   * Get energy in a specific frequency range
   * @param dataArray - Frequency data in dB scale
   * @param minFreq - Minimum frequency (Hz)
   * @param maxFreq - Maximum frequency (Hz)
   * @returns Normalized energy (0-1)
   */
  private getFrequencyRange(dataArray: Float32Array, minFreq: number, maxFreq: number): number {
    if (!this.context) return 0

    const nyquist = this.context.sampleRate / 2
    const binCount = dataArray.length

    // Map frequency range to bin indices
    const minBin = Math.floor((minFreq / nyquist) * binCount)
    const maxBin = Math.ceil((maxFreq / nyquist) * binCount)

    // Sum energy in range
    let sum = 0
    for (let i = minBin; i < maxBin; i++) {
      const value = Math.pow(10, dataArray[i] / 20)
      sum += value
    }

    // Average and normalize
    const average = sum / (maxBin - minBin)
    return Math.min(average * 5, 1.0) // Boost and clamp
  }

  /**
   * Simple beat detection using amplitude threshold
   * @param channel - Audio channel data
   * @param amplitude - Current amplitude
   * @returns True if beat detected
   */
  private detectBeat(channel: AudioChannel, amplitude: number): boolean {
    const now = performance.now()
    const timeSinceLastBeat = now - channel.lastBeatTime

    // Threshold with debounce (min 100ms between beats)
    if (amplitude > channel.beatThreshold && timeSinceLastBeat > 100) {
      channel.lastBeatTime = now
      return true
    }

    return false
  }

  /**
   * Clean up audio resources
   */
  destroy(): void {
    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
    }

    // Disconnect source
    this.source?.disconnect()

    // Close audio context
    this.context?.close()

    // Clear references
    this.channels = []
    this.context = null
    this.source = null
    this.stream = null

    console.log('AudioManager destroyed')
  }

  /**
   * Check if audio system is initialized
   */
  isInitialized(): boolean {
    return this.context !== null && this.channels.length > 0
  }

  /**
   * Get number of available channels
   */
  getChannelCount(): number {
    return this.channels.length
  }
}
