import osc from 'osc'

export interface OSCClientOptions {
  port: number
  host?: string
}

/**
 * OSC Client for sending messages to Max for Live device
 * Sends UDP messages to the specified port
 */
export class OSCClient {
  private udpPort: osc.UDPPort | null = null
  private options: Required<OSCClientOptions>
  private isReady = false

  constructor(options: OSCClientOptions) {
    this.options = {
      host: '127.0.0.1',
      ...options
    }
  }

  /**
   * Initialize the OSC client
   */
  init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isReady) {
        resolve()
        return
      }

      try {
        this.udpPort = new osc.UDPPort({
          localAddress: '0.0.0.0',
          localPort: 0, // Use any available port
          remoteAddress: this.options.host,
          remotePort: this.options.port,
          metadata: true
        })

        this.udpPort.on('ready', () => {
          console.log(`OSC Client ready, sending to ${this.options.host}:${this.options.port}`)
          this.isReady = true
          resolve()
        })

        this.udpPort.on('error', (err) => {
          console.error('OSC Client error:', err)
          reject(err)
        })

        this.udpPort.open()
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Send a raw OSC message
   */
  send(address: string, args: Array<number | string | boolean> = []): void {
    if (!this.udpPort || !this.isReady) {
      console.warn('OSC Client not ready, cannot send message')
      return
    }

    this.udpPort.send({
      address,
      args
    })

    console.log('Sent OSC:', address, args)
  }

  /**
   * Transport control methods
   */
  transportPlay(): void {
    this.send('/live/transport/play')
  }

  transportStop(): void {
    this.send('/live/transport/stop')
  }

  transportSetTempo(bpm: number): void {
    this.send('/live/transport/tempo', [bpm])
  }

  /**
   * Track control methods
   */
  trackSetVolume(trackIndex: number, volume: number): void {
    this.send(`/live/track/${trackIndex}/volume`, [volume])
  }

  trackSetPan(trackIndex: number, pan: number): void {
    this.send(`/live/track/${trackIndex}/pan`, [pan])
  }

  trackSetMute(trackIndex: number, mute: boolean): void {
    this.send(`/live/track/${trackIndex}/mute`, [mute ? 1 : 0])
  }

  trackSetSolo(trackIndex: number, solo: boolean): void {
    this.send(`/live/track/${trackIndex}/solo`, [solo ? 1 : 0])
  }

  /**
   * Scene control methods
   */
  sceneFire(sceneIndex: number): void {
    this.send(`/live/scene/${sceneIndex}/fire`)
  }

  /**
   * Initialization
   */
  requestInit(): void {
    this.send('/live/init/request')
  }

  /**
   * Close the client
   */
  close(): void {
    if (this.udpPort) {
      this.udpPort.close()
      this.udpPort = null
      this.isReady = false
      console.log('OSC Client closed')
    }
  }

  /**
   * Get client status
   */
  getStatus(): { ready: boolean; port: number; host: string } {
    return {
      ready: this.isReady,
      port: this.options.port,
      host: this.options.host
    }
  }
}

// Create singleton instance
let clientInstance: OSCClient | null = null

export function getOSCClient(options?: OSCClientOptions): OSCClient {
  if (!clientInstance) {
    clientInstance = new OSCClient(options || { port: 5459 })
  }
  return clientInstance
}
