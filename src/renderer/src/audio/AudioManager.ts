import Meyda from 'meyda'
import type { AudioFeatures, AudioChannel } from './types'
import { registerAudioBufferProcessor } from './worklet/register-worklet'
import type { AudioDevice, AudioBufferData } from '../../../types/audio'

/**
 * AudioManager handles multi-channel audio capture and feature extraction
 * Captures up to 16 channels from BlackHole virtual audio device
 * Uses Meyda library for robust audio feature extraction
 * Extracts amplitude, frequency bands, and optional beat detection per channel
 */
export class AudioManager {
  private context: AudioContext | null = null
  private channels: AudioChannel[] = []
  private workletNode: AudioWorkletNode | null = null
  private audioBufferCallback: ((data: AudioBufferData) => void) | null = null

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

      // Create audio context
      this.context = new AudioContext({ sampleRate: 48000 })

      // Register and create AudioWorklet
      await registerAudioBufferProcessor(this.context)
      this.workletNode = new AudioWorkletNode(this.context, 'audio-buffer-processor', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [16]
      })

      // Create channel splitter
      const splitter = this.context.createChannelSplitter(16)
      this.workletNode.connect(splitter)

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
          featureExtractors: ['rms', 'energy', 'spectralCentroid', 'spectralFlatness', 'mfcc'],
          windowingFunction: 'blackman',
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

      // Setup IPC listener for audio buffers
      this.audioBufferCallback = (data: AudioBufferData) => {
        console.log('audio buffer callback')
        if (this.workletNode) {
          this.workletNode.port.postMessage({
            type: 'audio-buffer',
            buffer: data.buffer
          })
        }
      }
      window.api.audio.onBuffer(this.audioBufferCallback)

      // Start audio capture in main process
      const result = await window.api.audio.start(selectedDevice.id)
      if (!result.success) {
        throw new Error(result.error || 'Failed to start audio capture')
      }

      console.log(`AudioManager initialized with ${this.channels.length} channels using audify`)
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
    const { analyzer } = channel

    // Get Meyda features
    const features = analyzer.get(['rms', 'energy', 'spectralCentroid', 'spectralFlatness', 'mfcc'])

    if (!features) {
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
      signal: analyzer._m.signal,
      amplitude: Math.min(amplitude, 1.0),
      bass: Math.min(bass, 1.0),
      mid: Math.min(mid, 1.0),
      high: Math.min(high, 1.0),
      beat,
      mfcc: features.mfcc
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

    // Disconnect worklet
    if (this.workletNode) {
      this.workletNode.disconnect()
      this.workletNode = null
    }

    // Remove IPC listener
    if (this.audioBufferCallback) {
      window.api.audio.offBuffer(this.audioBufferCallback)
      this.audioBufferCallback = null
    }

    console.log('destroying')

    // Stop audio capture in main process
    window.api.audio.stop()

    // Close audio context
    this.context?.close()

    // Clear references
    this.channels = []
    this.context = null

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
