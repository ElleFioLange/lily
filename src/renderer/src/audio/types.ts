/**
 * Audio features extracted from a single channel
 */
export interface AudioFeatures {
  signal: Float32Array
  amplitude: number // 0-1: RMS amplitude
  bass: number // 0-1: 20-250 Hz energy
  mid: number // 0-1: 250-2000 Hz energy
  high: number // 0-1: 2000-8000 Hz energy
  beat: boolean // Beat detected this frame
  mfcc: Float32Array
}

/**
 * Per-channel audio analysis data (using Meyda)
 */
export interface AudioChannel {
  buffer: Float32Array // Latest audio buffer (512 samples)
  lastBeatTime: number
  beatThreshold: number
  energyHistory: number[] // For beat detection
}
