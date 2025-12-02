import Meyda from 'meyda'
import type { AudioFeatures, AudioChannel } from './types'

/**
 * AudioManager handles multi-channel audio capture and feature extraction
 * Captures up to 16 channels from BlackHole virtual audio device
 * Uses Meyda library for robust audio feature extraction
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

      // Create Meyda analyzer for each channel
      for (let i = 0; i < 16; i++) {
        // Create a gain node for this channel (Meyda needs a source node)
        const channelGain = this.context.createGain()
        splitter.connect(channelGain, i)

        // Create Meyda analyzer for this channel
        const analyzer = Meyda.createMeydaAnalyzer({
          audioContext: this.context,
          source: channelGain,
          bufferSize: 512,
          featureExtractors: ['rms', 'energy', 'spectralCentroid', 'spectralFlatness'],
          callback: null // We'll use .get() instead of callbacks
        })

        this.channels.push({
          analyzer,
          channelGain,
          lastBeatTime: 0,
          beatThreshold: 0.7,
          energyHistory: [] // For beat detection
        })
      }

      console.log(`AudioManager initialized with ${this.channels.length} channels using Meyda`)
    } catch (err) {
      console.error('Failed to initialize audio:', err)
      throw err
    }
  }

  /**
   * Get audio features for a specific channel using Meyda
   * @param channelIndex - Channel index (0-15)
   * @returns Audio features (amplitude, bass, mid, high, beat)
   */
  getChannelFeatures(channelIndex: number): AudioFeatures {
    if (channelIndex < 0 || channelIndex >= this.channels.length) {
      console.warn(`Invalid channel index: ${channelIndex}`)
      return { amplitude: 0, bass: 0, mid: 0, high: 0, beat: false }
    }

    const channel = this.channels[channelIndex]
    const { analyzer } = channel

    // Get Meyda features
    const features = analyzer.get(['rms', 'energy', 'spectralCentroid', 'spectralFlatness'])

    if (!features) {
      return { amplitude: 0, bass: 0, mid: 0, high: 0, beat: false }
    }

    // Map Meyda features to our interface
    const amplitude = this.normalizeRMS(features.rms || 0)
    const energy = features.energy || 0

    // Derive frequency bands from spectral centroid
    // Lower centroid = more bass energy, higher centroid = more high frequency energy
    const centroid = features.spectralCentroid || 0
    const flatness = features.spectralFlatness || 0

    // Normalize spectral centroid (typical range 0-8000Hz)
    const normalizedCentroid = Math.min(centroid / 8000, 1.0)

    // Bass: high when centroid is low (inverse relationship)
    const bass = Math.max(0, (1 - normalizedCentroid) * amplitude * 2)

    // Mid: peak around middle frequencies (spectral flatness helps)
    const mid = amplitude * (1 - Math.abs(normalizedCentroid - 0.5) * 2) * (1 - flatness)

    // High: high when centroid is high
    const high = normalizedCentroid * amplitude * 2

    // Beat detection using energy
    const beat = this.detectBeatFromEnergy(channel, energy)

    return {
      amplitude: Math.min(amplitude, 1.0),
      bass: Math.min(bass, 1.0),
      mid: Math.min(mid, 1.0),
      high: Math.min(high, 1.0),
      beat
    }
  }

  /**
   * Normalize RMS value from Meyda to 0-1 range
   * @param rms - Raw RMS value from Meyda
   * @returns Normalized amplitude (0-1)
   */
  private normalizeRMS(rms: number): number {
    // RMS values from Meyda are typically 0-1, but can spike higher
    // Apply gentle compression
    return Math.min(rms * 1.5, 1.0)
  }

  /**
   * Beat detection using energy from Meyda
   * Uses adaptive threshold based on recent energy history
   * @param channel - Audio channel data
   * @param energy - Current energy value from Meyda
   * @returns True if beat detected
   */
  private detectBeatFromEnergy(channel: AudioChannel, energy: number): boolean {
    const now = performance.now()
    const timeSinceLastBeat = now - channel.lastBeatTime
    const { energyHistory } = channel

    // Keep last 43 energy values (~1 second at 512 buffer size and 48kHz)
    energyHistory.push(energy)
    if (energyHistory.length > 43) {
      energyHistory.shift()
    }

    // Need sufficient history for beat detection
    if (energyHistory.length < 20) {
      return false
    }

    // Calculate adaptive threshold (mean + 1.5 * variance)
    const mean = energyHistory.reduce((sum, val) => sum + val, 0) / energyHistory.length
    const variance =
      energyHistory.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / energyHistory.length
    const threshold = mean + 1.5 * Math.sqrt(variance)

    // Detect beat: current energy exceeds threshold and debounce time passed
    if (energy > threshold && timeSinceLastBeat > 100) {
      channel.lastBeatTime = now
      return true
    }

    return false
  }

  /**
   * Clean up audio resources
   */
  destroy(): void {
    // Stop Meyda analyzers
    this.channels.forEach((channel) => {
      if (channel.analyzer) {
        channel.analyzer.stop()
      }
      if (channel.channelGain) {
        channel.channelGain.disconnect()
      }
    })

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
