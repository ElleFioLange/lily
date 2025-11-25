import osc from 'osc'

export interface OSCClientOptions {
  port: number
  host?: string
}

/**
 * Minimal OSC Client Template
 *
 * This class provides a simple foundation for sending OSC messages over UDP.
 * It handles the connection setup and provides a generic send() method that
 * you can use to build your own custom message methods.
 *
 * Key Features:
 * - UDP message transmission on configurable port
 * - Generic send() method for any OSC address and arguments
 * - Type-safe argument handling (numbers, strings, booleans)
 * - Singleton pattern for single client instance
 * - Automatic type inference from OSC metadata
 *
 * Usage:
 * ```typescript
 * const client = getOSCClient({ port: 5459 })
 * await client.init()
 *
 * // Send a message with arguments
 * client.send('/your/address', [0.5, 'hello', true])
 *
 * // Send a message without arguments (trigger)
 * client.send('/your/trigger')
 * ```
 *
 * Building Custom Methods:
 * Instead of hardcoding methods in this class, create them in your
 * application code or as extension functions:
 *
 * ```typescript
 * // In your app code
 * function setSynthFrequency(client: OSCClient, freq: number) {
 *   client.send('/synth/freq', [freq])
 * }
 *
 * // Or extend the client
 * class MyOSCClient extends OSCClient {
 *   setSynthFrequency(freq: number) {
 *     this.send('/synth/freq', [freq])
 *   }
 * }
 * ```
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
   * Opens UDP port and prepares to send messages
   *
   * @returns Promise that resolves when client is ready to send
   * @throws Error if port cannot be opened
   */
  init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isReady) {
        resolve()
        return
      }

      try {
        this.udpPort = new osc.UDPPort({
          localAddress: '0.0.0.0', // Bind to any local interface
          localPort: 0, // Use any available port for sending
          remoteAddress: this.options.host, // Target host
          remotePort: this.options.port, // Target port
          metadata: true // Enable metadata for type inference
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
   * Send a generic OSC message
   *
   * This is the core method for sending OSC messages. All custom message
   * methods should use this internally.
   *
   * @param address - OSC address pattern (e.g., '/synth/freq')
   * @param args - Array of arguments (numbers, strings, booleans)
   *
   * Type Conversions:
   * - number → OSC float (f)
   * - string → OSC string (s)
   * - boolean → OSC integer (i) as 0 or 1
   *
   * @example
   * ```typescript
   * // Send a float value
   * client.send('/volume', [0.8])
   *
   * // Send multiple arguments of different types
   * client.send('/note', [60, 100, 'C4'])
   *
   * // Send a trigger (no arguments)
   * client.send('/trigger')
   *
   * // Send with boolean (converted to 0/1)
   * client.send('/mute', [true])
   * ```
   */
  send(address: string, args: Array<number | string | boolean> = []): void {
    if (!this.udpPort || !this.isReady) {
      console.warn('OSC Client not ready, cannot send message')
      return
    }

    // Need to add OSC typings to the arguments
    const typedArgs = args.map((arg) => {
      let type: string = typeof arg
      switch (type) {
        case 'number': {
          type = Number.isInteger(arg) ? 'i' : 'f'
          break
        }
        case 'string': {
          type = 's'
          break
        }
        case 'boolean': {
          type = arg ? 'T' : 'F'
        }
      }
      return { type, value: arg }
    })

    this.udpPort.send({
      address,
      args: typedArgs
    })

    console.log('Sent OSC:', address, args)
  }

  /**
   * Close the client
   * Closes UDP port and cleans up resources
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
   * Get client status information
   */
  getStatus(): { ready: boolean; port: number; host: string } {
    return {
      ready: this.isReady,
      port: this.options.port,
      host: this.options.host
    }
  }
}

// ============================================================================
// Singleton Pattern
// ============================================================================
// The client instance is a singleton to maintain a single connection
// to the remote OSC server.

let clientInstance: OSCClient | null = null

/**
 * Get or create the OSC client singleton instance
 *
 * @param options - Client configuration (only used on first call)
 * @returns The singleton OSCClient instance
 *
 * @example
 * ```typescript
 * // First call creates the client with options
 * const client = getOSCClient({ port: 5459, host: '127.0.0.1' })
 *
 * // Subsequent calls return the same instance
 * const sameClient = getOSCClient()
 * ```
 */
export function getOSCClient(options?: OSCClientOptions): OSCClient {
  if (!clientInstance) {
    clientInstance = new OSCClient(options || { port: 5459 })
  }
  return clientInstance
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
Example 1: Basic message sending
---------------------------------
const client = getOSCClient({ port: 5459 })
await client.init()

// Send simple messages
client.send('/play')
client.send('/tempo', [120])
client.send('/note', [60, 100]) // MIDI note 60, velocity 100


Example 2: Creating custom helper functions
-------------------------------------------
const client = getOSCClient({ port: 5459 })
await client.init()

// Define type-safe helper functions
function setVolume(volume: number) {
  if (volume < 0 || volume > 1) {
    throw new Error('Volume must be between 0 and 1')
  }
  client.send('/volume', [volume])
}

function setMute(muted: boolean) {
  client.send('/mute', [muted ? 1 : 0])
}

function triggerScene(index: number) {
  client.send(`/scene/${index}/fire`)
}

// Use the helpers
setVolume(0.8)
setMute(false)
triggerScene(0)


Example 3: Building a message builder
--------------------------------------
const client = getOSCClient({ port: 5459 })
await client.init()

// Create a fluent message builder
class OSCMessageBuilder {
  private address: string
  private args: Array<number | string | boolean> = []

  constructor(address: string) {
    this.address = address
  }

  addFloat(value: number): this {
    this.args.push(value)
    return this
  }

  addString(value: string): this {
    this.args.push(value)
    return this
  }

  addBool(value: boolean): this {
    this.args.push(value)
    return this
  }

  send(client: OSCClient): void {
    client.send(this.address, this.args)
  }
}

// Use the builder
new OSCMessageBuilder('/track/0')
  .addString('name')
  .addFloat(0.8)
  .addBool(false)
  .send(client)


Example 4: Creating typed message interfaces
--------------------------------------------
const client = getOSCClient({ port: 5459 })
await client.init()

// Define message types
interface TransportMessage {
  type: 'play' | 'stop' | 'tempo'
  value?: number
}

interface TrackMessage {
  trackIndex: number
  property: 'volume' | 'pan' | 'mute' | 'solo'
  value: number | boolean
}

// Create type-safe sender functions
function sendTransport(msg: TransportMessage) {
  switch (msg.type) {
    case 'play':
      client.send('/transport/play')
      break
    case 'stop':
      client.send('/transport/stop')
      break
    case 'tempo':
      if (msg.value !== undefined) {
        client.send('/transport/tempo', [msg.value])
      }
      break
  }
}

function sendTrack(msg: TrackMessage) {
  const address = `/track/${msg.trackIndex}/${msg.property}`
  const value = typeof msg.value === 'boolean' ? (msg.value ? 1 : 0) : msg.value
  client.send(address, [value])
}

// Use the typed senders
sendTransport({ type: 'play' })
sendTransport({ type: 'tempo', value: 120 })
sendTrack({ trackIndex: 0, property: 'volume', value: 0.8 })
sendTrack({ trackIndex: 1, property: 'mute', value: true })


Example 5: Extending the client class
--------------------------------------
// Create a custom client for your specific use case
class MyCustomOSCClient extends OSCClient {
  // Transport controls
  play(): void {
    this.send('/transport/play')
  }

  stop(): void {
    this.send('/transport/stop')
  }

  setTempo(bpm: number): void {
    this.send('/transport/tempo', [bpm])
  }

  // Synth controls
  setSynthParam(param: string, value: number): void {
    this.send(`/synth/${param}`, [value])
  }

  noteOn(note: number, velocity: number): void {
    this.send('/synth/note/on', [note, velocity])
  }

  noteOff(note: number): void {
    this.send('/synth/note/off', [note])
  }
}

// Use your custom client
const myClient = new MyCustomOSCClient({ port: 5459 })
await myClient.init()
myClient.play()
myClient.setTempo(140)
myClient.setSynthParam('cutoff', 0.7)
myClient.noteOn(60, 100)


Example 6: Integration with IPC for Electron
--------------------------------------------
// In your main process IPC handlers:
import { ipcMain } from 'electron'

const client = getOSCClient({ port: 5459 })
await client.init()

// Generic send handler
ipcMain.handle('osc:send', async (_, address: string, args: any[]) => {
  client.send(address, args)
  return { success: true }
})

// Or create specific handlers for type safety
ipcMain.handle('osc:synth:freq', async (_, freq: number) => {
  client.send('/synth/freq', [freq])
  return { success: true }
})

ipcMain.handle('osc:synth:amp', async (_, amp: number) => {
  client.send('/synth/amp', [amp])
  return { success: true }
})
*/
