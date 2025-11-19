import osc from 'osc'
import { EventEmitter } from 'events'
import { OSCPacket } from '../../types/osc-messages'

export interface OSCServerOptions {
  port: number
  host?: string
}

/**
 * OSC Server for receiving messages from Max for Live device
 * Listens on UDP port and parses OSC messages
 */
export class OSCServer extends EventEmitter {
  private udpPort: osc.UDPPort | null = null
  private options: Required<OSCServerOptions>
  private isRunning = false

  constructor(options: OSCServerOptions) {
    super()
    this.options = {
      host: '127.0.0.1',
      ...options
    }
  }

  /**
   * Start the OSC server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isRunning) {
        resolve()
        return
      }

      try {
        this.udpPort = new osc.UDPPort({
          localAddress: this.options.host,
          localPort: this.options.port,
          metadata: true
        })

        this.udpPort.on('ready', () => {
          console.log(`OSC Server listening on ${this.options.host}:${this.options.port}`)
          this.isRunning = true
          this.emit('ready')
          resolve()
        })

        this.udpPort.on('message', (oscMsg) => {
          this.handleMessage(oscMsg)
        })

        this.udpPort.on('error', (err) => {
          console.error('OSC Server error:', err)
          this.emit('error', err)
        })

        this.udpPort.open()
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Stop the OSC server
   */
  stop(): void {
    if (this.udpPort) {
      this.udpPort.close()
      this.udpPort = null
      this.isRunning = false
      console.log('OSC Server stopped')
      this.emit('stopped')
    }
  }

  /**
   * Handle incoming OSC message
   */
  private handleMessage(oscMsg: osc.OscMessage): void {
    const { address, args } = oscMsg

    // Convert OSC args to simple types
    const simplifiedArgs = args.map((arg) => {
      if (typeof arg === 'object' && arg !== null && 'value' in arg) {
        return arg.value
      }
      return arg
    })

    const packet: OSCPacket = {
      address,
      args: simplifiedArgs
    }

    console.log('Received OSC:', address, simplifiedArgs)

    // Emit specific events based on message type
    if (address.startsWith('/live/transport/state')) {
      this.emit('transport:state', packet)
    } else if (address.startsWith('/live/track/')) {
      const match = address.match(/\/live\/track\/(\d+)\/(\w+)/)
      if (match) {
        const trackIndex = parseInt(match[1])
        const property = match[2]
        this.emit('track:update', { trackIndex, property, args: simplifiedArgs })
      }
    } else if (address === '/live/init/complete') {
      this.emit('init:complete', simplifiedArgs[0])
    }

    // Also emit raw message event
    this.emit('message', packet)
  }

  /**
   * Get server status
   */
  getStatus(): { running: boolean; port: number; host: string } {
    return {
      running: this.isRunning,
      port: this.options.port,
      host: this.options.host
    }
  }
}

// Create singleton instance
let serverInstance: OSCServer | null = null

export function getOSCServer(options?: OSCServerOptions): OSCServer {
  if (!serverInstance) {
    serverInstance = new OSCServer(options || { port: 5460 })
  }
  return serverInstance
}
