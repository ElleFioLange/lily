import osc from 'osc'
import { EventEmitter } from 'events'
import { OSCMessage } from '../../types/osc-messages'

export interface OSCServerOptions {
  port: number
  host?: string
}

/**
 * Minimal OSC Server Template
 *
 * This class provides a simple foundation for receiving OSC messages over UDP.
 * It includes a pattern-based message routing system that lets you register
 * handlers for specific OSC address patterns.
 *
 * Key Features:
 * - UDP message reception on configurable port
 * - Pattern-based message routing with wildcards
 * - EventEmitter-based architecture for flexible handling
 * - Automatic type conversion from OSC metadata format
 * - Singleton pattern for single server instance
 *
 * Usage:
 * ```typescript
 * const server = getOSCServer({ port: 5460 })
 *
 * // Register a handler for a specific pattern
 * server.on('/your/pattern', (msg) => {
 *   console.log('Received:', msg.address, msg.args)
 * })
 *
 * // Register a wildcard handler
 * server.on('/your/*', (msg) => {
 *   console.log('Matches /your/*:', msg.address)
 * })
 *
 * // Listen to all messages
 * server.on('message', (msg) => {
 *   console.log('Any message:', msg.address, msg.args)
 * })
 *
 * await server.start()
 * ```
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
   * Opens UDP port and begins listening for messages
   *
   * @returns Promise that resolves when server is ready
   * @throws Error if port is already in use or cannot bind
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
          metadata: true // Enable metadata mode for easier type handling
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
   * Closes UDP port and cleans up resources
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
   *
   * This method:
   * 1. Converts OSC metadata args to simple JavaScript types
   * 2. Creates a standardized OSCMessage object
   * 3. Emits pattern-matched events for registered handlers
   * 4. Emits generic 'message' event for catch-all handlers
   *
   * @private
   */
  private handleMessage(oscMsg: osc.OscMessage): void {
    const { address, args } = oscMsg

    // Convert OSC args from metadata format to simple types
    // OSC metadata format: { type: 'f', value: 0.5 }
    // Converted format: 0.5
    const simplifiedArgs = args.map((arg) => {
      if (typeof arg === 'object' && arg !== null && 'value' in arg) {
        return arg.value
      }
      return arg
    })

    const message: OSCMessage = {
      address,
      args: simplifiedArgs
    }

    console.log('Received OSC:', address, simplifiedArgs)

    // Emit pattern-matched events
    // This allows you to register handlers like: server.on('/custom/pattern', handler)
    this.emitPatternMatch(message)

    // Always emit generic 'message' event for catch-all handlers
    this.emit('message', message)
  }

  /**
   * Emit events for pattern-matched handlers
   *
   * This method checks if any registered event handlers match the message address.
   * It supports exact matches and simple wildcard patterns.
   *
   * Pattern matching rules:
   * - Exact match: '/foo/bar' matches only '/foo/bar'
   * - Wildcard: '/foo/*' matches '/foo/bar', '/foo/baz', etc.
   * - Multi-level: '/foo/**' matches '/foo/bar/baz/qux' (any depth)
   *
   * Example:
   * ```typescript
   * server.on('/synth/freq', (msg) => {
   *   console.log('Frequency changed:', msg.args[0])
   * })
   *
   * server.on('/synth/*', (msg) => {
   *   console.log('Any synth parameter:', msg.address)
   * })
   * ```
   *
   * @private
   */
  private emitPatternMatch(message: OSCMessage): void {
    const address = message.address
    const eventNames = this.eventNames() as string[]

    for (const pattern of eventNames) {
      if (
        pattern === 'message' ||
        pattern === 'ready' ||
        pattern === 'stopped' ||
        pattern === 'error'
      ) {
        continue // Skip reserved events
      }

      if (this.matchesPattern(address, pattern)) {
        this.emit(pattern, message)
      }
    }
  }

  /**
   * Check if an OSC address matches a pattern
   *
   * Supports simple glob-style patterns:
   * - '*' matches a single path segment
   * - '**' matches any number of path segments
   *
   * @private
   */
  private matchesPattern(address: string, pattern: string): boolean {
    // Exact match
    if (address === pattern) {
      return true
    }

    // Convert pattern to regex
    // Escape special regex characters except * and /
    let regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '§§') // Temporarily replace ** with placeholder
      .replace(/\*/g, '[^/]+') // * matches one segment
      .replace(/§§/g, '.*') // ** matches any segments

    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(address)
  }

  /**
   * Get server status information
   */
  getStatus(): { running: boolean; port: number; host: string } {
    return {
      running: this.isRunning,
      port: this.options.port,
      host: this.options.host
    }
  }
}

// ============================================================================
// Singleton Pattern
// ============================================================================
// The server instance is a singleton to prevent multiple UDP ports binding
// to the same port, which would cause errors.

let serverInstance: OSCServer | null = null

/**
 * Get or create the OSC server singleton instance
 *
 * @param options - Server configuration (only used on first call)
 * @returns The singleton OSCServer instance
 *
 * @example
 * ```typescript
 * // First call creates the server with options
 * const server = getOSCServer({ port: 5460, host: '127.0.0.1' })
 *
 * // Subsequent calls return the same instance
 * const sameServer = getOSCServer()
 * ```
 */
export function getOSCServer(options?: OSCServerOptions): OSCServer {
  if (!serverInstance) {
    serverInstance = new OSCServer(options || { port: 5460 })
  }
  return serverInstance
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
Example 1: Basic message handling

const server = getOSCServer({ port: 5460 })

// Handle all messages
server.on('message', (msg: OSCMessage) => {
  console.log(`${msg.address}: ${msg.args.join(', ')}`)
})

await server.start()


Example 2: Pattern-based routing

const server = getOSCServer({ port: 5460 })

// Handle specific patterns
server.on('/synth/freq', (msg: OSCMessage) => {
  const frequency = msg.args[0] as number
  console.log('Frequency:', frequency)
})

server.on('/synth/amp', (msg: OSCMessage) => {
  const amplitude = msg.args[0] as number
  console.log('Amplitude:', amplitude)
})

// Handle with wildcard
server.on('/synth/*', (msg: OSCMessage) => {
  console.log('Synth parameter changed:', msg.address)
})

await server.start()


Example 3: Complex routing with extraction

const server = getOSCServer({ port: 5460 })

// Extract values from address patterns
server.on('/track/*\/volume', (msg: OSCMessage) => {
  // Parse track index from address
  const match = msg.address.match(/\/track\/(\d+)\/volume/)
  if (match) {
    const trackIndex = parseInt(match[1])
    const volume = msg.args[0] as number
    console.log(`Track ${trackIndex} volume: ${volume}`)
  }
})

await server.start()


Example 4: Integration with application state

const server = getOSCServer({ port: 5460 })

// Forward OSC messages to your state management
server.on('/app/**', (msg: OSCMessage) => {
  // Update your app state (Zustand, Redux, etc.)
  // yourStore.handleOSCMessage(msg)
})

// Emit events for specific patterns
server.on('/app/ready', (msg: OSCMessage) => {
  const version = msg.args[0] as string
  console.log('App ready, version:', version)
  // Trigger initialization flow
})

await server.start()
*/
