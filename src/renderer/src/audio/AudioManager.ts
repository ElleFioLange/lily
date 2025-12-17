import Meyda from 'meyda'
import type { AudioFeatures, AudioChannel } from './types'
import type { AudioDevice, AudioBufferData } from '../../../types/audio'

/**
 * AudioManager handles multi-channel audio capture and feature extraction
 * Captures up to 16 channels from BlackHole virtual audio device
 * Uses Meyda library for robust audio feature extraction
 * Extracts amplitude, frequency bands, and optional beat detection per channel
 *
 * NO WEB AUDIO API - Direct buffer processing for simplicity and performance
 */
export class AudioManager {
  private channels: AudioChannel[] = []
  private audioBufferCallback: ((data: AudioBufferData) => void) | null = null
  private bufferSize: number = 512

  /**
   * Initialize audio system and capture from specified device
   * @param deviceId - Optional device ID to use. If not provided, auto-detects BlackHole or uses system default
   */
  async initialize(deviceId?: string): Promise<void> {
    try {
      // List audio devices from main process
      const devices = await window.api.audio.listDevices()
      console.log(
        'Available audio devices:',
        devices.map((d) => d.name)
      )

      let selectedDevice: AudioDevice | undefined

      // Priority: specified deviceId → BlackHole 16ch → error
      if (deviceId) {
        selectedDevice = devices.find((d) => d.id === deviceId)
        if (selectedDevice) {
          console.log('Using specified audio device:', selectedDevice.name)
        } else {
          console.warn(`Device not found: ${deviceId}, falling back to auto-detect`)
        }
      }

      // Fallback to BlackHole if no device specified
      if (!selectedDevice) {
        selectedDevice = devices.find(
          (d) => d.name.includes('BlackHole 16ch') || d.name.includes('BlackHole16ch')
        )
        if (selectedDevice) {
          console.log('Auto-detected BlackHole 16ch:', selectedDevice.name)
        } else {
          throw new Error(
            'BlackHole 16ch not found. Please install BlackHole from existential.audio.'
          )
        }
      }

      // Verify channel count
      if (selectedDevice.channelCount < 16) {
        console.warn(
          `Device ${selectedDevice.name} has only ${selectedDevice.channelCount} channels (expected 16)`
        )
      }

      // Initialize channel state (16 channels)
      for (let i = 0; i < 16; i++) {
        this.channels.push({
          buffer: new Float32Array(this.bufferSize),
          lastBeatTime: 0,
          beatThreshold: 0.7,
          energyHistory: []
        })
      }

      // Setup IPC listener for audio buffers
      this.audioBufferCallback = (data: AudioBufferData) => {
        this.processAudioBuffer(data)
      }
      window.api.audio.onBuffer(this.audioBufferCallback)

      // Start audio capture in main process
      const result = await window.api.audio.start(selectedDevice.id)
      if (!result.success) {
        throw new Error(result.error || 'Failed to start audio capture')
      }

      console.log(`AudioManager initialized with ${this.channels.length} channels (no Web Audio)`)
    } catch (err) {
      console.error('Failed to initialize audio:', err)
      throw err
    }
  }

  /**
   * Process incoming audio buffer from main process
   * Buffer is NON-INTERLEAVED: [ch0[0...511], ch1[0...511], ..., ch15[0...511]]
   * Total length: 16 channels × 512 samples = 8192 samples
   */
  private processAudioBuffer(data: AudioBufferData): void {
    const float32Data = data.buffer

    // Verify buffer size (16 channels × 512 samples = 8192)
    const expectedLength = 16 * this.bufferSize
    if (float32Data.length !== expectedLength) {
      console.warn(`Unexpected buffer size: ${float32Data.length}, expected ${expectedLength}`)
      return
    }

    // Split non-interleaved buffer into 16 separate channel buffers
    for (let ch = 0; ch < 16; ch++) {
      const startIdx = ch * this.bufferSize
      const endIdx = startIdx + this.bufferSize
      const channelBuffer = float32Data.slice(startIdx, endIdx)
      this.channels[ch].buffer = channelBuffer
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
      return {
        signal: new Float32Array(),
        amplitude: 0,
        bass: 0,
        mid: 0,
        high: 0,
        beat: false,
        mfcc: new Float32Array()
      }
    }

    const channel = this.channels[channelIndex]
    const { buffer } = channel

    // Extract features directly from buffer using Meyda
    const features = Meyda.extract(
      ['rms', 'energy', 'spectralCentroid', 'spectralFlatness', 'mfcc'],
      buffer
    )

    if (!features) {
      return {
        signal: buffer,
        amplitude: 0,
        bass: 0,
        mid: 0,
        high: 0,
        beat: false,
        mfcc: new Float32Array()
      }
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
      signal: buffer,
      amplitude: Math.min(amplitude, 1.0),
      bass: Math.min(bass, 1.0),
      mid: Math.min(mid, 1.0),
      high: Math.min(high, 1.0),
      beat,
      mfcc: features.mfcc
        ? Array.isArray(features.mfcc)
          ? new Float32Array(features.mfcc)
          : features.mfcc
        : new Float32Array()
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
    // Remove IPC listener
    if (this.audioBufferCallback) {
      window.api.audio.offBuffer(this.audioBufferCallback)
      this.audioBufferCallback = null
    }

    console.log('destroying')

    // Stop audio capture in main process
    window.api.audio.stop()

    // Clear references
    this.channels = []

    console.log('AudioManager destroyed')
  }

  /**
   * Check if audio system is initialized
   */
  isInitialized(): boolean {
    return this.channels.length > 0
  }

  /**
   * Get number of available channels
   */
  getChannelCount(): number {
    return this.channels.length
  }
}
