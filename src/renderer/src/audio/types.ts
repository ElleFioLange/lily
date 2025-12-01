/**
 * Audio features extracted from a single channel
 */
export interface AudioFeatures {
  amplitude: number // 0-1: RMS amplitude
  bass: number // 0-1: 20-250 Hz energy
  mid: number // 0-1: 250-2000 Hz energy
  high: number // 0-1: 2000-8000 Hz energy
  beat: boolean // Beat detected this frame
}

/**
 * Per-channel audio analysis data
 */
export interface AudioChannel {
  analyser: AnalyserNode
  dataArray: Float32Array<ArrayBuffer>
  lastBeatTime: number
  beatThreshold: number
}
