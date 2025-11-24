# OSC Communication Guide

This guide explains the minimal OSC (Open Sound Control) template system in Lily. The system is designed to be flexible and extensible, providing you with the basic building blocks to create your own custom OSC protocol.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start](#quick-start)
3. [Core Components](#core-components)
4. [Message Flow](#message-flow)
5. [Building Custom Messages](#building-custom-messages)
6. [Pattern Matching](#pattern-matching)
7. [State Management Integration](#state-management-integration)
8. [TypeScript Types](#typescript-types)
9. [Best Practices](#best-practices)
10. [Examples](#examples)

---

## Architecture Overview

The OSC system follows Electron's multi-process architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                       Renderer Process                          │
│  (React UI - src/renderer/)                                     │
│                                                                  │
│  ┌──────────────┐     ┌─────────────────┐                      │
│  │ UI Components│────▶│ Zustand Store   │                      │
│  └──────────────┘     │ (State Mgmt)    │                      │
│         ▲             └────────┬─────── │                      │
│         │                      │         │                      │
│         │                      ▼         │                      │
│         │             window.api.osc.send()                    │
│         │                      │         │                      │
│         │             window.api.osc.onMessage()               │
│         │                      │         ▲                      │
└─────────┼──────────────────────┼─────────┼──────────────────────┘
          │                      │         │
          │                [contextBridge] │
          │                      │         │
┌─────────┼──────────────────────┼─────────┼──────────────────────┐
│         │             Main Process       │                      │
│         │            (src/main/)         │                      │
│         │                      │         │                      │
│         │                      ▼         │                      │
│         │             ┌─────────────────┐│                      │
│         │             │  IPC Handlers   ││                      │
│         │             └────────┬────────┘│                      │
│         │                      │         │                      │
│         │                      ▼         │                      │
│         │             ┌─────────────────┐│                      │
│         │             │   OSC Client    ││                      │
│         │             │   (UDP Send)    ││                      │
│         │             └────────┬────────┘│                      │
│         │                      │         │                      │
│         │             ┌────────┴────────┐│                      │
│         │             │   OSC Server    ││                      │
│         │             │  (UDP Receive)  ││                      │
│         │             └────────┬────────┘│                      │
│         │                      │         │                      │
└─────────┼──────────────────────┼─────────┼──────────────────────┘
          │                      │         │
          │                      ▼         │
      [Display]          ┌──────────────┐  │
       Updates           │ UDP Port5459 │  │
                         │ (Outgoing)   │  │
                         └──────┬───────┘  │
                                │          │
                         ┌──────▼───────┐  │
                         │ UDP Port5460 │  │
                         │ (Incoming)   │  │
                         └──────┬───────┘  │
                                │          │
                                ▼          │
                    ┌─────────────────────┐│
                    │  External OSC App   ││
                    │  (Max, TouchOSC,    ││
                    │   etc.)             ││
                    └─────────────────────┘│
```

### Key Ports

- **5459**: Electron → External OSC application (outgoing)
- **5460**: External OSC application → Electron (incoming)

These ports can be configured in `src/main/index.ts`.

---

## Quick Start

### 1. Sending OSC Messages

```typescript
// In any React component
function MyComponent() {
  const sendMessage = async () => {
    // Send a message with arguments
    await window.api.osc.send('/your/address', [440.0, 'hello', true])
  }

  return <button onClick={sendMessage}>Send OSC</button>
}
```

### 2. Receiving OSC Messages

```typescript
// In App.tsx or component
import { useEffect } from 'react'

function App() {
  useEffect(() => {
    // Listen for all incoming messages
    window.api.osc.onMessage((message) => {
      console.log('Received:', message.address, message.args)

      // Handle specific addresses
      if (message.address === '/your/address') {
        const value = message.args[0] as number
        // Do something with the value
      }
    })
  }, [])

  return <div>App</div>
}
```

### 3. Integrating with State Management

```typescript
// src/renderer/src/stores/useMyStore.ts
import { create } from 'zustand'

interface MyStore {
  value: number
  setValue: (val: number) => void
  sendValue: (val: number) => Promise<void>
}

export const useMyStore = create<MyStore>((set) => ({
  value: 0,

  setValue: (val) => set({ value: val }),

  sendValue: async (val) => {
    await window.api.osc.send('/my/value', [val])
    set({ value: val }) // Optimistic update
  }
}))

// Setup listeners
export function setupListeners() {
  window.api.osc.onMessage((msg) => {
    if (msg.address === '/my/value') {
      const store = useMyStore.getState()
      store.setValue(msg.args[0] as number)
    }
  })
}
```

---

## Core Components

### 1. OSC Server (`src/main/osc/server.ts`)

**Purpose**: Receives OSC messages over UDP on port 5460.

**Key Features**:

- EventEmitter-based architecture
- Pattern-based message routing with wildcards
- Automatic type conversion from OSC metadata format

**Usage**:

```typescript
// In main process
const server = getOSCServer({ port: 5460 })
await server.start()

// Register pattern handlers
server.on('/synth/*', (message) => {
  console.log('Synth message:', message.address)
})

// Listen to all messages
server.on('message', (message) => {
  console.log('Any message:', message.address, message.args)
})
```

**Pattern Matching**:

- `/exact/match` - Matches only that exact address
- `/path/*` - Matches one segment (e.g., `/path/foo`, `/path/bar`)
- `/path/**` - Matches any number of segments (e.g., `/path/foo/bar/baz`)

### 2. OSC Client (`src/main/osc/client.ts`)

**Purpose**: Sends OSC messages over UDP to port 5459.

**Key Features**:

- Simple `send()` method for any OSC message
- Automatic type handling for numbers, strings, booleans
- Singleton pattern for single connection

**Usage**:

```typescript
// In main process
const client = getOSCClient({ port: 5459 })
await client.init()

// Send messages
client.send('/synth/freq', [440.0])
client.send('/trigger')
client.send('/note', [60, 100, 'C4'])
```

### 3. Type Definitions (`src/types/osc-messages.ts`)

**Purpose**: Provides generic TypeScript interfaces for OSC messages.

**Core Types**:

```typescript
// Generic OSC message
interface OSCMessage {
  address: string
  args: Array<number | string | boolean>
}

// Value types
type OSCValue = number | string | boolean
type OSCArgs = OSCValue[]
```

**Helper Functions**:

```typescript
// Type guards
isAddress(msg, '/synth/freq') // Type-safe address check
hasPrefix(msg, '/synth/') // Check address prefix

// Parsing
parseAddress('/track/3/volume') // Returns ['track', '3', 'volume']

// Message builder
const msg = createMessage('/synth/note').addFloat(60).addFloat(100).build()
```

### 4. Preload Bridge (`src/preload/index.ts`)

**Purpose**: Exposes OSC API to renderer process via context bridge.

**API Methods**:

```typescript
window.api.osc.send(address, args) // Send OSC message
window.api.osc.onMessage(callback) // Listen to all messages
window.api.osc.on(pattern, callback) // Listen to specific pattern
window.api.osc.off(pattern, callback) // Remove listener
```

### 5. IPC Handlers (`src/main/index.ts`)

**Purpose**: Handles IPC communication between renderer and main process.

**Handler**:

```typescript
// Only one OSC handler needed
ipcMain.handle('osc:send', async (_, address, args) => {
  oscClient.send(address, args)
})
```

---

## Message Flow

### Outgoing Messages (Renderer → External)

```
1. React Component calls:
   await window.api.osc.send('/synth/freq', [440])

2. Preload script forwards via IPC:
   ipcRenderer.invoke('osc:send', '/synth/freq', [440])

3. Main process IPC handler calls:
   oscClient.send('/synth/freq', [440])

4. OSC Client sends UDP packet to port 5459

5. External application receives the message
```

### Incoming Messages (External → Renderer)

```
1. External application sends UDP packet to port 5460

2. OSC Server receives and parses the message

3. Server emits events:
   - 'message' (all messages)
   - Pattern-matched events (if registered)

4. Main process forwards via IPC:
   mainWindow.webContents.send('osc:message', message)

5. Preload script forwards to renderer:
   ipcRenderer.on('osc:message', callback)

6. Renderer callback updates state/UI
```

---

## Building Custom Messages

### Approach 1: Helper Functions

Create type-safe helper functions in your renderer code:

```typescript
// src/renderer/src/lib/osc-helpers.ts

export async function setVolume(volume: number): Promise<void> {
  if (volume < 0 || volume > 1) {
    throw new Error('Volume must be between 0 and 1')
  }
  await window.api.osc.send('/mixer/volume', [volume])
}

export async function playNote(note: number, velocity: number): Promise<void> {
  await window.api.osc.send('/synth/note', [note, velocity])
}

export async function triggerScene(index: number): Promise<void> {
  await window.api.osc.send(`/scene/${index}/fire`)
}
```

### Approach 2: TypeScript Interfaces

Define message types for documentation and type safety:

```typescript
// src/types/my-messages.ts
import type { OSCMessage } from './osc-messages'

export interface VolumeMessage extends OSCMessage {
  address: '/mixer/volume'
  args: [number] // 0.0 to 1.0
}

export interface NoteMessage extends OSCMessage {
  address: '/synth/note'
  args: [number, number] // [note, velocity]
}

// Use in code
function handleVolume(msg: VolumeMessage) {
  const volume = msg.args[0]
  console.log('Volume:', volume)
}
```

### Approach 3: Message Builder

Use the fluent message builder for complex messages:

```typescript
import { createMessage } from '../../../types/osc-messages'

const message = createMessage('/synth/note')
  .addFloat(60) // Note number
  .addFloat(100) // Velocity
  .addString('C4') // Note name
  .addBoolean(true) // Sustain
  .build()

await window.api.osc.send(message.address, message.args)
```

### Approach 4: Extending the Client

For main process custom logic, extend the OSC client:

```typescript
// src/main/osc/my-client.ts
import { OSCClient } from './client'

export class MyCustomClient extends OSCClient {
  setVolume(volume: number): void {
    this.send('/mixer/volume', [volume])
  }

  playNote(note: number, velocity: number): void {
    this.send('/synth/note', [note, velocity])
  }

  triggerScene(index: number): void {
    this.send(`/scene/${index}/fire`)
  }
}

// Use in main process
const client = new MyCustomClient({ port: 5459 })
await client.init()
client.setVolume(0.8)
```

---

## Pattern Matching

The OSC server supports pattern-based routing for incoming messages.

### Server-Side Pattern Registration

```typescript
// In src/main/index.ts, initializeOSC() function

oscServer.on('/synth/*', (message) => {
  // Matches /synth/freq, /synth/amp, etc.
  mainWindowRef?.webContents.send('osc:pattern:/synth/*', message)
})

oscServer.on('/transport/play', (message) => {
  // Exact match only
  mainWindowRef?.webContents.send('osc:pattern:/transport/play', message)
})

oscServer.on('/track/**', (message) => {
  // Matches /track/0/volume, /track/3/pan/left, etc.
  mainWindowRef?.webContents.send('osc:pattern:/track/**', message)
})
```

### Renderer-Side Pattern Listening

```typescript
// In your React component or store setup

window.api.osc.on('/synth/*', (message) => {
  console.log('Synth message:', message.address)
})

window.api.osc.on('/transport/play', (message) => {
  console.log('Transport play triggered')
})
```

**Note**: Pattern listeners require server-side forwarding setup (see above).

### Client-Side Filtering

If you don't set up server-side forwarding, you can filter in the renderer:

```typescript
window.api.osc.onMessage((message) => {
  // Manual pattern matching
  if (message.address.startsWith('/synth/')) {
    console.log('Synth message:', message.address)
  }

  // Regex matching
  if (/^\/track\/\d+\/volume$/.test(message.address)) {
    const match = message.address.match(/\/track\/(\d+)\/volume/)
    const trackIndex = parseInt(match[1])
    const volume = message.args[0] as number
    console.log(`Track ${trackIndex} volume: ${volume}`)
  }
})
```

---

## State Management Integration

### Zustand Store Pattern

```typescript
// src/renderer/src/stores/useSynthStore.ts
import { create } from 'zustand'
import type { OSCMessage } from '../../../types/osc-messages'

interface SynthState {
  frequency: number
  amplitude: number

  setFrequency: (freq: number) => void
  setAmplitude: (amp: number) => void

  sendFrequency: (freq: number) => Promise<void>
  sendAmplitude: (amp: number) => Promise<void>
}

export const useSynthStore = create<SynthState>((set) => ({
  frequency: 440.0,
  amplitude: 0.5,

  setFrequency: (freq) => set({ frequency: freq }),
  setAmplitude: (amp) => set({ amplitude: amp }),

  sendFrequency: async (freq) => {
    await window.api.osc.send('/synth/freq', [freq])
    set({ frequency: freq }) // Optimistic update
  },

  sendAmplitude: async (amp) => {
    await window.api.osc.send('/synth/amp', [amp])
    set({ amplitude: amp }) // Optimistic update
  }
}))

// Setup OSC listeners
export function setupSynthListeners() {
  window.api.osc.onMessage((msg) => {
    const store = useSynthStore.getState()

    switch (msg.address) {
      case '/synth/freq':
        store.setFrequency(msg.args[0] as number)
        break
      case '/synth/amp':
        store.setAmplitude(msg.args[0] as number)
        break
    }
  })
}
```

### Using in Components

```typescript
// src/renderer/src/components/SynthControl.tsx
import { useSynthStore } from '../stores/useSynthStore'

function SynthControl() {
  const frequency = useSynthStore((state) => state.frequency)
  const amplitude = useSynthStore((state) => state.amplitude)
  const sendFrequency = useSynthStore((state) => state.sendFrequency)
  const sendAmplitude = useSynthStore((state) => state.sendAmplitude)

  return (
    <div>
      <div>
        <label>Frequency: {frequency} Hz</label>
        <input
          type="range"
          min="20"
          max="20000"
          value={frequency}
          onChange={(e) => sendFrequency(parseFloat(e.target.value))}
        />
      </div>

      <div>
        <label>Amplitude: {amplitude.toFixed(2)}</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={amplitude}
          onChange={(e) => sendAmplitude(parseFloat(e.target.value))}
        />
      </div>
    </div>
  )
}
```

---

## TypeScript Types

### Creating Custom Message Types

```typescript
// src/types/my-protocol.ts
import type { OSCMessage } from './osc-messages'

// 1. Simple trigger messages (no args)
export interface PlayMessage extends OSCMessage {
  address: '/transport/play'
  args: []
}

export interface StopMessage extends OSCMessage {
  address: '/transport/stop'
  args: []
}

// 2. Single value messages
export interface TempoMessage extends OSCMessage {
  address: '/transport/tempo'
  args: [number] // BPM
}

// 3. Multi-value messages
export interface NoteMessage extends OSCMessage {
  address: '/synth/note'
  args: [number, number] // [note, velocity]
}

// 4. Dynamic addresses with template literals
export type TrackVolumeMessage = OSCMessage & {
  address: `/track/${number}/volume`
  args: [number]
}

// 5. Union types for grouped messages
export type TransportMessage = PlayMessage | StopMessage | TempoMessage

// 6. Type guards
export function isPlayMessage(msg: OSCMessage): msg is PlayMessage {
  return msg.address === '/transport/play'
}

export function isTrackMessage(msg: OSCMessage): boolean {
  return /^\/track\/\d+\/\w+$/.test(msg.address)
}

// 7. Helper to extract track index
export function getTrackIndex(msg: OSCMessage): number | null {
  const match = msg.address.match(/\/track\/(\d+)\//)
  return match ? parseInt(match[1]) : null
}
```

### Using Custom Types

```typescript
import type { NoteMessage, TrackVolumeMessage } from '../types/my-protocol'
import { isPlayMessage, getTrackIndex } from '../types/my-protocol'

window.api.osc.onMessage((msg) => {
  // Type guard
  if (isPlayMessage(msg)) {
    console.log('Play triggered')
  }

  // Type assertion
  if (msg.address === '/synth/note') {
    const noteMsg = msg as NoteMessage
    const note = noteMsg.args[0]
    const velocity = noteMsg.args[1]
    console.log(`Note: ${note}, Velocity: ${velocity}`)
  }

  // Dynamic extraction
  const trackIndex = getTrackIndex(msg)
  if (trackIndex !== null) {
    console.log(`Track ${trackIndex} message`)
  }
})
```

---

## Best Practices

### 1. Keep the Preload Thin

Don't add application-specific methods to the preload script. Use the generic `send()` method and build helpers in the renderer.

**❌ Don't**:

```typescript
// preload/index.ts
osc: {
  send: (...),
  setVolume: (vol) => ipcRenderer.invoke('osc:volume', vol),
  setFrequency: (freq) => ipcRenderer.invoke('osc:freq', freq),
  // ... 50 more methods
}
```

**✅ Do**:

```typescript
// preload/index.ts
osc: {
  send: (address, args) => ipcRenderer.invoke('osc:send', address, args),
  onMessage: (callback) => ipcRenderer.on('osc:message', callback)
}

// renderer/src/lib/osc-helpers.ts
export function setVolume(vol: number) {
  return window.api.osc.send('/volume', [vol])
}
```

### 2. Use Optimistic Updates

Update UI immediately when sending messages, then confirm with incoming messages:

```typescript
sendVolume: async (vol) => {
  set({ volume: vol }) // Update immediately
  await window.api.osc.send('/volume', [vol])
  // Incoming message will confirm or correct
}
```

### 3. Validate Input

Always validate user input before sending:

```typescript
async function setFrequency(freq: number) {
  if (freq < 20 || freq > 20000) {
    throw new Error('Frequency out of range')
  }
  await window.api.osc.send('/synth/freq', [freq])
}
```

### 4. Use Pattern Matching Efficiently

For high-frequency messages, set up pattern-specific listeners rather than filtering all messages:

**❌ Less Efficient**:

```typescript
window.api.osc.onMessage((msg) => {
  if (msg.address.startsWith('/synth/')) {
    // Handle synth messages
  }
})
```

**✅ More Efficient**:

```typescript
// In main process
oscServer.on('/synth/*', (msg) => {
  mainWindow?.webContents.send('osc:synth', msg)
})

// In renderer
window.api.osc.on('/synth/*', (msg) => {
  // Only receives synth messages
})
```

### 5. Document Your Protocol

Create a protocol documentation file for your application:

```markdown
# My OSC Protocol

## Transport Control

- `/transport/play` - Start playback
- `/transport/stop` - Stop playback
- `/transport/tempo [bpm: float]` - Set tempo

## Mixer Control

- `/track/{0-7}/volume [vol: float]` - Set track volume (0.0-1.0)
- `/track/{0-7}/mute [mute: int]` - Set track mute (0 or 1)

## Synth Control

- `/synth/freq [freq: float]` - Set frequency in Hz
- `/synth/note [note: int, vel: int]` - Play MIDI note
```

### 6. Error Handling

Handle errors gracefully:

```typescript
async function sendMessage(address: string, args: any[]) {
  try {
    await window.api.osc.send(address, args)
  } catch (err) {
    console.error('Failed to send OSC message:', err)
    // Show user notification
    // Revert optimistic update
  }
}
```

### 7. Cleanup Listeners

Remove listeners when components unmount:

```typescript
useEffect(() => {
  const handleMessage = (msg: OSCMessage) => {
    // Handle message
  }

  window.api.osc.on('/synth/*', handleMessage)

  return () => {
    window.api.osc.off('/synth/*', handleMessage)
  }
}, [])
```

---

## Examples

### Example 1: Simple Transport Control

```typescript
// Transport controls component
function TransportControls() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [tempo, setTempo] = useState(120)

  useEffect(() => {
    window.api.osc.onMessage((msg) => {
      if (msg.address === '/transport/state') {
        setIsPlaying(msg.args[0] === 1)
        setTempo(msg.args[1] as number)
      }
    })
  }, [])

  const play = () => {
    window.api.osc.send('/transport/play')
    setIsPlaying(true)
  }

  const stop = () => {
    window.api.osc.send('/transport/stop')
    setIsPlaying(false)
  }

  const changeTempo = (newTempo: number) => {
    window.api.osc.send('/transport/tempo', [newTempo])
    setTempo(newTempo)
  }

  return (
    <div>
      <button onClick={isPlaying ? stop : play}>
        {isPlaying ? 'Stop' : 'Play'}
      </button>
      <input
        type="number"
        value={tempo}
        onChange={(e) => changeTempo(parseFloat(e.target.value))}
      />
    </div>
  )
}
```

### Example 2: Multi-Track Mixer

```typescript
// Mixer store
interface Track {
  volume: number
  mute: boolean
}

interface MixerStore {
  tracks: Track[]
  setTrackVolume: (index: number, volume: number) => Promise<void>
  setTrackMute: (index: number, mute: boolean) => Promise<void>
}

export const useMixerStore = create<MixerStore>((set) => ({
  tracks: Array(8).fill(null).map(() => ({ volume: 0.8, mute: false })),

  setTrackVolume: async (index, volume) => {
    await window.api.osc.send(`/track/${index}/volume`, [volume])
    set((state) => {
      const tracks = [...state.tracks]
      tracks[index] = { ...tracks[index], volume }
      return { tracks }
    })
  },

  setTrackMute: async (index, mute) => {
    await window.api.osc.send(`/track/${index}/mute`, [mute ? 1 : 0])
    set((state) => {
      const tracks = [...state.tracks]
      tracks[index] = { ...tracks[index], mute }
      return { tracks }
    })
  }
}))

// Mixer channel component
function MixerChannel({ index }: { index: number }) {
  const track = useMixerStore((state) => state.tracks[index])
  const setVolume = useMixerStore((state) => state.setTrackVolume)
  const setMute = useMixerStore((state) => state.setTrackMute)

  return (
    <div>
      <h3>Track {index + 1}</h3>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={track.volume}
        onChange={(e) => setVolume(index, parseFloat(e.target.value))}
      />
      <button onClick={() => setMute(index, !track.mute)}>
        {track.mute ? 'Unmute' : 'Mute'}
      </button>
    </div>
  )
}
```

### Example 3: Pattern-Based Message Router

```typescript
// Generic message router
class OSCRouter {
  private routes: Map<RegExp, (msg: OSCMessage) => void> = new Map()

  constructor() {
    window.api.osc.onMessage((msg) => {
      for (const [pattern, handler] of this.routes) {
        if (pattern.test(msg.address)) {
          handler(msg)
        }
      }
    })
  }

  on(pattern: string | RegExp, handler: (msg: OSCMessage) => void) {
    const regex = typeof pattern === 'string' ? this.patternToRegex(pattern) : pattern
    this.routes.set(regex, handler)
  }

  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '§§')
      .replace(/\*/g, '[^/]+')
      .replace(/§§/g, '.*')
    return new RegExp(`^${escaped}$`)
  }
}

// Usage
const router = new OSCRouter()

router.on('/transport/*', (msg) => {
  console.log('Transport message:', msg.address)
})

router.on('/track/*/volume', (msg) => {
  const match = msg.address.match(/\/track\/(\d+)\/volume/)
  const index = parseInt(match[1])
  const volume = msg.args[0] as number
  console.log(`Track ${index} volume: ${volume}`)
})

router.on(/^\/synth\/\w+$/, (msg) => {
  console.log('Synth parameter:', msg.address)
})
```

---

## Troubleshooting

### Messages Not Being Received

1. Check that OSC server is running:

   ```typescript
   const status = oscServer.getStatus()
   console.log('Server:', status)
   ```

2. Verify port configuration (default: 5460 for incoming)

3. Check firewall settings

4. Ensure external app is sending to correct port

### Messages Not Being Sent

1. Check that OSC client is initialized:

   ```typescript
   const status = oscClient.getStatus()
   console.log('Client:', status)
   ```

2. Verify port configuration (default: 5459 for outgoing)

3. Check external app is listening on correct port

### TypeScript Errors

1. Ensure you're using the correct types from `src/types/osc-messages.ts`
2. Use type assertions for dynamic addresses:
   ```typescript
   const msg = message as MyCustomMessage
   ```

### IPC Not Working

1. Verify preload script is loaded in BrowserWindow:

   ```typescript
   preload: join(__dirname, '../preload/index.js')
   ```

2. Check context isolation is enabled:
   ```typescript
   contextIsolation: true
   ```

---

## Changing Ports

To use different ports, update the initialization in `src/main/index.ts`:

```typescript
const oscServer = getOSCServer({ port: 8000 }) // Change from 5460
const oscClient = getOSCClient({ port: 9000 }) // Change from 5459
```

---

## Further Reading

- [OSC Specification](https://opensoundcontrol.stanford.edu/spec-1_0.html)
- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

**Happy OSC coding! 🎵**
