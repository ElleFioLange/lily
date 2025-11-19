// TypeScript interfaces for OSC message communication with Ableton Live

// Transport Messages
export interface TransportPlayMessage {
  address: '/live/transport/play'
  args: []
}

export interface TransportStopMessage {
  address: '/live/transport/stop'
  args: []
}

export interface TransportTempoMessage {
  address: '/live/transport/tempo'
  args: [number] // BPM as float
}

export interface TransportStateUpdate {
  address: '/live/transport/state'
  args: [number, number] // [isPlaying (0 or 1), tempo]
}

// Track Messages (index 0-7 for 8 tracks)
export interface TrackVolumeMessage {
  address: `/live/track/${number}/volume`
  args: [number] // 0.0 to 1.0
}

export interface TrackPanMessage {
  address: `/live/track/${number}/pan`
  args: [number] // -1.0 (left) to 1.0 (right)
}

export interface TrackMuteMessage {
  address: `/live/track/${number}/mute`
  args: [number] // 0 or 1
}

export interface TrackSoloMessage {
  address: `/live/track/${number}/solo`
  args: [number] // 0 or 1
}

export interface TrackNameUpdate {
  address: `/live/track/${number}/name`
  args: [string]
}

export interface TrackStateUpdate {
  address: `/live/track/${number}/state`
  args: [number, number, number, number, string] // [volume, pan, mute, solo, name]
}

// Scene Messages
export interface SceneFireMessage {
  address: `/live/scene/${number}/fire`
  args: []
}

// Initialization Messages
export interface InitRequestMessage {
  address: '/live/init/request'
  args: []
}

export interface InitCompleteMessage {
  address: '/live/init/complete'
  args: [number] // device version
}

// Union types for type-safe message handling
export type OutgoingOSCMessage =
  | TransportPlayMessage
  | TransportStopMessage
  | TransportTempoMessage
  | TrackVolumeMessage
  | TrackPanMessage
  | TrackMuteMessage
  | TrackSoloMessage
  | SceneFireMessage
  | InitRequestMessage

export type IncomingOSCMessage =
  | TransportStateUpdate
  | TrackNameUpdate
  | TrackStateUpdate
  | InitCompleteMessage

// Helper type for OSC packet structure
export interface OSCPacket {
  address: string
  args: Array<number | string | boolean>
}

// State interfaces for Zustand store
export interface TransportState {
  isPlaying: boolean
  tempo: number
  currentBeat: number
}

export interface TrackState {
  volume: number // 0.0 to 1.0
  pan: number // -1.0 to 1.0
  mute: boolean
  solo: boolean
  name: string
}

export interface ConnectionState {
  connected: boolean
  lastMessageTime: number | null
  deviceVersion: number | null
}
