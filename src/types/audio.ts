/**
 * Audio device information
 */
export interface AudioDevice {
  id: string
  name: string
  channelCount: number
  sampleRate: number
  isDefault: boolean
}

/**
 * Audio capture status
 */
export interface AudioCaptureStatus {
  isRunning: boolean
  deviceId: string | null
  deviceName: string | null
  channelCount: number
  sampleRate: number
  bufferSize: number
}

/**
 * Audio buffer data sent via IPC
 */
export interface AudioBufferData {
  buffer: Float32Array
  channels: number
  sampleRate: number
  timestamp: number
}

/**
 * Audio buffer metadata (internal use)
 */
export interface AudioBufferMetadata {
  channels: number
  sampleRate: number
  timestamp: number
}
