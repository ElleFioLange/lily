/**
 * Generic OSC Message Type Definitions
 *
 * This file provides foundational TypeScript interfaces for working with
 * OSC (Open Sound Control) messages. These are intentionally minimal and
 * generic to support any OSC protocol.
 *
 * Usage Philosophy:
 * - Use these as base types
 * - Define your own specific message types by extending or composing these
 * - Keep application-specific types in your application code, not here
 *
 * Example:
 * ```typescript
 * // Define your own message types
 * interface MySynthFreqMessage extends OSCMessage {
 *   address: '/synth/freq'
 *   args: [number]
 * }
 *
 * // Or use the generic type directly
 * function handleMessage(msg: OSCMessage) {
 *   if (msg.address === '/synth/freq') {
 *     const freq = msg.args[0] as number
 *     console.log('Frequency:', freq)
 *   }
 * }
 * ```
 */

// ============================================================================
// Core OSC Types
// ============================================================================

/**
 * Generic OSC Message
 *
 * Represents a single OSC message with an address pattern and arguments.
 *
 * - `address`: OSC address pattern (e.g., '/synth/freq', '/mixer/track/1/volume')
 * - `args`: Array of argument values (numbers, strings, booleans)
 *
 * OSC Type Mappings:
 * - JavaScript number → OSC float (f) or int (i)
 * - JavaScript string → OSC string (s)
 * - JavaScript boolean → OSC int (i) as 0 or 1
 */
export interface OSCMessage {
  address: string
  args: Array<number | string | boolean>
}

/**
 * OSC Value Types
 *
 * Union type representing all possible OSC argument values in JavaScript.
 */
export type OSCValue = number | string | boolean

/**
 * OSC Arguments Array
 *
 * Type alias for an array of OSC values.
 */
export type OSCArgs = OSCValue[]

// ============================================================================
// Template Message Types
// ============================================================================
// These are example types showing common patterns you might use.
// Feel free to modify, delete, or add your own types below.

/**
 * Example: Trigger Message (no arguments)
 *
 * Use this pattern for messages that trigger an action without parameters.
 */
export interface TriggerMessage extends OSCMessage {
  address: string
  args: []
}

/**
 * Example: Single Value Message
 *
 * Use this pattern for messages with a single argument.
 */
export interface SingleValueMessage<T extends OSCValue = number> extends OSCMessage {
  address: string
  args: [T]
}

/**
 * Example: Multi-Value Message
 *
 * Use this pattern for messages with multiple arguments of specific types.
 */
export interface MultiValueMessage extends OSCMessage {
  address: string
  args: [number, number] | [number, number, string] // Example: [id, value] or [id, value, label]
}

// ============================================================================
// Pattern Matching Helpers
// ============================================================================

/**
 * Type guard to check if a message matches a specific address pattern
 *
 * @example
 * ```typescript
 * if (isAddress(msg, '/synth/freq')) {
 *   const freq = msg.args[0] as number
 * }
 * ```
 */
export function isAddress<T extends string>(
  msg: OSCMessage,
  address: T
): msg is OSCMessage & { address: T } {
  return msg.address === address
}

/**
 * Type guard to check if a message address starts with a prefix
 *
 * @example
 * ```typescript
 * if (hasPrefix(msg, '/synth/')) {
 *   // Handle all synth messages
 * }
 * ```
 */
export function hasPrefix(msg: OSCMessage, prefix: string): boolean {
  return msg.address.startsWith(prefix)
}

/**
 * Extract segments from an OSC address
 *
 * @example
 * ```typescript
 * const segments = parseAddress('/track/3/volume')
 * // Returns: ['track', '3', 'volume']
 * ```
 */
export function parseAddress(address: string): string[] {
  return address.split('/').filter((s) => s.length > 0)
}

// ============================================================================
// Custom Message Type Examples
// ============================================================================
// Below are example patterns for defining your own message types.
// Uncomment and modify these as needed for your application.

/*
// Example 1: Simple trigger messages
export interface PlayMessage extends TriggerMessage {
  address: '/transport/play'
}

export interface StopMessage extends TriggerMessage {
  address: '/transport/stop'
}


// Example 2: Messages with parameters
export interface TempoMessage extends SingleValueMessage {
  address: '/transport/tempo'
  args: [number] // BPM
}

export interface VolumeMessage extends OSCMessage {
  address: `/track/${number}/volume`
  args: [number] // 0.0 to 1.0
}


// Example 3: Messages with multiple parameters
export interface NoteMessage extends OSCMessage {
  address: '/synth/note'
  args: [number, number, number] // [note, velocity, duration]
}


// Example 4: Union types for grouped messages
export type TransportMessage = PlayMessage | StopMessage | TempoMessage

export type TrackMessage = VolumeMessage // | PanMessage | MuteMessage


// Example 5: State types for application state management
export interface TransportState {
  isPlaying: boolean
  tempo: number
  position: number
}

export interface TrackState {
  volume: number
  pan: number
  mute: boolean
  name: string
}


// Example 6: Pattern-based message types with dynamic addresses
export type DynamicTrackMessage = OSCMessage & {
  address: `/track/${number}/${string}`
}

// Type guard for dynamic patterns
export function isTrackMessage(msg: OSCMessage): msg is DynamicTrackMessage {
  return /^\/track\/\d+\/\w+$/.test(msg.address)
}

// Extract track index from address
export function getTrackIndex(msg: DynamicTrackMessage): number {
  const match = msg.address.match(/\/track\/(\d+)\//)
  return match ? parseInt(match[1]) : -1
}
*/

// ============================================================================
// Message Builder Utility
// ============================================================================

/**
 * Fluent message builder for constructing OSC messages
 *
 * @example
 * ```typescript
 * const msg = createMessage('/synth/freq')
 *   .addFloat(440.0)
 *   .addString('A4')
 *   .build()
 * ```
 */
export class OSCMessageBuilder {
  private address: string
  private args: OSCArgs = []

  constructor(address: string) {
    this.address = address
  }

  /**
   * Add a numeric argument
   */
  addNumber(value: number): this {
    this.args.push(value)
    return this
  }

  /**
   * Alias for addNumber (for clarity when working with OSC floats)
   */
  addFloat(value: number): this {
    return this.addNumber(value)
  }

  /**
   * Add a string argument
   */
  addString(value: string): this {
    this.args.push(value)
    return this
  }

  /**
   * Add a boolean argument (will be sent as 0 or 1)
   */
  addBoolean(value: boolean): this {
    this.args.push(value)
    return this
  }

  /**
   * Add multiple arguments at once
   */
  addArgs(...values: OSCArgs): this {
    this.args.push(...values)
    return this
  }

  /**
   * Build and return the OSC message
   */
  build(): OSCMessage {
    return {
      address: this.address,
      args: this.args
    }
  }
}

/**
 * Helper function to create a message builder
 *
 * @example
 * ```typescript
 * const msg = createMessage('/synth/note')
 *   .addFloat(60)
 *   .addFloat(100)
 *   .build()
 * ```
 */
export function createMessage(address: string): OSCMessageBuilder {
  return new OSCMessageBuilder(address)
}
