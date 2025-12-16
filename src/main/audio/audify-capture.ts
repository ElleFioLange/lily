import { EventEmitter } from 'events'
import { RtAudio, RtAudioFormat, RtAudioStreamFlags } from 'audify'
import type { AudioDevice, AudioCaptureStatus, AudioBufferMetadata } from '../../types/audio'

/**
 * AudifyCapture - Main process audio capture service
 *
 * Captures multi-channel audio from system audio devices using audify (native CoreAudio binding).
 * Emits audio buffers as Float32Array in interleaved format for streaming to renderer process.
 *
 * Events:
 * - 'buffer' (data: Float32Array, metadata: AudioBufferMetadata) - Raw audio buffer
 * - 'error' (error: Error) - Error occurred
 * - 'started' () - Capture started
 * - 'stopped' () - Capture stopped
 */
export class AudifyCapture extends EventEmitter {
  private rtAudio: RtAudio | null = null
  private isRunning: boolean = false
  private sampleRate: number = 48000
  private bufferSize: number = 512
  private channelCount: number = 16
  private deviceInfo: AudioDevice | null = null

  /**
   * List available audio input devices
   * @returns Array of audio devices with metadata
   */
  async listDevices(): Promise<AudioDevice[]> {
    try {
      const rtAudio = new RtAudio()
      const devices = rtAudio.getDevices()

      // Filter for input devices and map to our interface
      const audioDevices: AudioDevice[] = devices
        .filter((device) => device.inputChannels > 0)
        .map((device) => ({
          id: device.id.toString(),
          name: device.name,
          channelCount: device.inputChannels,
          sampleRate: device.preferredSampleRate,
          isDefault: device.isDefaultInput === 1
        }))

      console.log(`Found ${audioDevices.length} audio input devices`)
      return audioDevices
    } catch (error) {
      console.error('Failed to list audio devices:', error)
      throw error
    }
  }

  /**
   * Start audio capture from specified device
   * @param deviceId - Optional device ID. If not provided, auto-detects BlackHole 16ch
   */
  async start(deviceId?: string): Promise<void> {
    if (this.isRunning) {
      console.warn('Audio capture already running')
      return
    }

    try {
      // List devices
      const devices = await this.listDevices()

      let selectedDevice: AudioDevice | undefined

      // Priority: specified deviceId → BlackHole 16ch → error
      if (deviceId) {
        selectedDevice = devices.find((d) => d.id === deviceId)
        if (selectedDevice) {
          console.log('Using specified audio device:', selectedDevice.name)
        } else {
          throw new Error(`Device ID not found: ${deviceId}`)
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
            'BlackHole 16ch not found. Please install BlackHole from existential.audio or specify a device ID.'
          )
        }
      }

      // Verify channel count
      if (selectedDevice.channelCount < 16) {
        console.warn(
          `Device ${selectedDevice.name} has only ${selectedDevice.channelCount} channels (expected 16)`
        )
      }

      // Store device info
      this.deviceInfo = selectedDevice
      this.channelCount = Math.min(selectedDevice.channelCount, 16) // Use up to 16 channels

      // Create RtAudio instance
      this.rtAudio = new RtAudio()

      console.log(
        `Starting audio capture: ${selectedDevice.name} (${this.channelCount}ch @ ${this.sampleRate}Hz)`
      )

      // Open stream with input parameters
      this.rtAudio.openStream(
        null, // No output
        {
          deviceId: parseInt(selectedDevice.id),
          nChannels: this.channelCount,
          firstChannel: 0
        },
        0x10 as RtAudioFormat, // RTAUDIO_FLOAT32
        this.sampleRate,
        this.bufferSize,
        'lily-audio-capture',
        (inputBuffer: Buffer) => {
          try {
            // Convert Buffer to Float32Array
            // RtAudio returns interleaved Float32 data
            const float32Data = new Float32Array(
              inputBuffer.buffer,
              inputBuffer.byteOffset,
              inputBuffer.length / 4
            )

            // Emit buffer event with metadata
            const metadata: AudioBufferMetadata = {
              channels: this.channelCount,
              sampleRate: this.sampleRate,
              timestamp: Date.now()
            }

            this.emit('buffer', float32Data, metadata)
          } catch (error) {
            console.error('Error processing audio buffer:', error)
            this.emit('error', error as Error)
          }
        },
        null, // No frame output callback
        0x1 as RtAudioStreamFlags, // Default flags
        (_type, msg) => {
          console.error('RtAudio error:', msg)
          this.emit('error', new Error(msg))
        }
      )

      // Start the stream
      this.rtAudio.start()
      this.isRunning = true
      this.emit('started')

      console.log('Audio capture started successfully')
    } catch (error) {
      console.error('Failed to start audio capture:', error)
      this.isRunning = false
      throw error
    }
  }

  /**
   * Stop audio capture
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    try {
      if (this.rtAudio) {
        if (this.rtAudio.isStreamRunning()) {
          this.rtAudio.stop()
        }
        if (this.rtAudio.isStreamOpen()) {
          this.rtAudio.closeStream()
        }
        this.rtAudio = null
      }

      this.isRunning = false
      this.deviceInfo = null
      this.emit('stopped')

      console.log('Audio capture stopped')
    } catch (error) {
      console.error('Error stopping audio capture:', error)
      this.emit('error', error as Error)
    }
  }

  /**
   * Get current capture status
   * @returns Current status information
   */
  getStatus(): AudioCaptureStatus {
    return {
      isRunning: this.isRunning,
      deviceId: this.deviceInfo?.id ?? null,
      deviceName: this.deviceInfo?.name ?? null,
      channelCount: this.channelCount,
      sampleRate: this.sampleRate,
      bufferSize: this.bufferSize
    }
  }

  /**
   * Get current device info
   * @returns Device information or null if not running
   */
  getDeviceInfo(): AudioDevice | null {
    return this.deviceInfo
  }
}

// Singleton instance
let audifyCaptureInstance: AudifyCapture | null = null

/**
 * Get singleton instance of AudifyCapture
 * @returns The AudifyCapture instance
 */
export function getAudifyCapture(): AudifyCapture {
  if (!audifyCaptureInstance) {
    audifyCaptureInstance = new AudifyCapture()
  }
  return audifyCaptureInstance
}
